#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Fully deploy EstateWise frontend and backend (monorepo) to AWS:
#  • MongoDB-compatible database via Amazon DocumentDB
#  • Containerized frontend + backend on Amazon ECS (Fargate)
#  • Load balancing via Application Load Balancer (ALB) with path-based routing
#  • Docker images stored in Amazon ECR
#
# Usage:
#   Ensure AWS CLI is configured (aws configure) and you have sufficient IAM permissions.
#   Run this script from the project root (next to frontend/ and backend/ directories).
#
# Prerequisites:
#   • AWS CLI v2 installed
#   • Docker installed and running
#   • IAM user/role with permissions to create ECR, ECS, ALB, DocumentDB, IAM, CloudWatch, etc.
#   • Environment variables:
#       AWS_REGION (default: us-east-1)
#       DOCDB_MASTER_USERNAME & DOCDB_MASTER_PASSWORD (for DocumentDB)
#       JWT_SECRET, GOOGLE_AI_API_KEY, PINECONE_API_KEY (for backend)
#       MONGO_INITDB_DATABASE (optional; defaults to “estatewise”)
#
# After successful run, the script will print the ALB DNS name:
#   • Frontend served on http://<ALB_DNS>/
#   • Backend API served on http://<ALB_DNS>/api/...
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# -----------------------------------------------------------------------------
# 1. Configuration and Environment Variables
# -----------------------------------------------------------------------------
AWS_REGION="${AWS_REGION:-us-east-1}"
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
DOCDB_MASTER_USERNAME="${DOCDB_MASTER_USERNAME:?Please set DOCDB_MASTER_USERNAME (e.g. “docdbAdmin”)}"
DOCDB_MASTER_PASSWORD="${DOCDB_MASTER_PASSWORD:?Please set DOCDB_MASTER_PASSWORD (choose a strong password)}"
MONGO_INITDB_DATABASE="${MONGO_INITDB_DATABASE:-estatewise}"
JWT_SECRET="${JWT_SECRET:?Please set JWT_SECRET for backend JWT signing}"
GOOGLE_AI_API_KEY="${GOOGLE_AI_API_KEY:?Please set GOOGLE_AI_API_KEY (Gemini API Key)}"
PINECONE_API_KEY="${PINECONE_API_KEY:?Please set PINECONE_API_KEY}"
PINECONE_INDEX="${PINECONE_INDEX:-estatewise-index}"
# Backend environment variables that ECS tasks need:
BACKEND_ENV="JWT_SECRET=${JWT_SECRET},GOOGLE_AI_API_KEY=${GOOGLE_AI_API_KEY},PINECONE_API_KEY=${PINECONE_API_KEY},PINECONE_INDEX=${PINECONE_INDEX},MONGO_URI="
# (we will append the DocumentDB cluster endpoint to MONGO_URI later)
# Frontend doesn’t need any secrets (it simply calls /api on same ALB).

# Resource names (all lowercase, no spaces)
ECR_BACKEND_REPO="estatewise-backend-repo"
ECR_FRONTEND_REPO="estatewise-frontend-repo"
ECS_CLUSTER_NAME="estatewise-ecs-cluster"
ALB_NAME="estatewise-alb"
SEC_GRP_NAME="estatewise-ecs-sg"
DOCDB_SUBNET_GROUP="estatewise-docdb-subnet-group"
DOCDB_CLUSTER_ID="estatewise-docdb-cluster"
DOCDB_INSTANCE_ID="estatewise-docdb-instance1"
DOCDB_SECURITY_GROUP="estatewise-docdb-sg"
DOCDB_PORT=27017
TASK_EXEC_ROLE_NAME="estatewise-ecsTaskExecutionRole"

# -----------------------------------------------------------------------------
# 2. Retrieve Default VPC, Subnets, and Security Group
# -----------------------------------------------------------------------------
echo "⏳ Fetching default VPC, subnets, and default security group..."
DEFAULT_VPC_ID="$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text --region "$AWS_REGION")"
if [[ -z "$DEFAULT_VPC_ID" ]]; then
  echo "❌ No default VPC found in region $AWS_REGION"
  exit 1
fi

# Fetch all public subnets in default VPC
DEFAULT_SUBNET_IDS="$(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=$DEFAULT_VPC_ID" "Name=default-for-az,Values=true" \
  --query "Subnets[].SubnetId" --output text --region "$AWS_REGION")"

# If no “default-for-az” subnets, fetch all subnets in default VPC
if [[ -z "$DEFAULT_SUBNET_IDS" ]]; then
  DEFAULT_SUBNET_IDS="$(aws ec2 describe-subnets \
    --filters "Name=vpc-id,Values=$DEFAULT_VPC_ID" \
    --query "Subnets[].SubnetId" --output text --region "$AWS_REGION")"
fi

if [[ -z "$DEFAULT_SUBNET_IDS" ]]; then
  echo "❌ No subnets found in VPC $DEFAULT_VPC_ID"
  exit 1
fi

# Default security group ID
DEFAULT_SG_ID="$(aws ec2 describe-security-groups \
  --filters "Name=vpc-id,Values=$DEFAULT_VPC_ID" "Name=group-name,Values=default" \
  --query "SecurityGroups[0].GroupId" --output text --region "$AWS_REGION")"

# -----------------------------------------------------------------------------
# 3. Create ECR Repositories (Backend & Frontend)
# -----------------------------------------------------------------------------
echo "🔨 Creating ECR repositories (if not existing)..."
aws ecr describe-repositories --repository-names "$ECR_BACKEND_REPO" --region "$AWS_REGION" >/dev/null 2>&1 || \
  aws ecr create-repository --repository-name "$ECR_BACKEND_REPO" --region "$AWS_REGION" >/dev/null

aws ecr describe-repositories --repository-names "$ECR_FRONTEND_REPO" --region "$AWS_REGION" >/dev/null 2>&1 || \
  aws ecr create-repository --repository-name "$ECR_FRONTEND_REPO" --region "$AWS_REGION" >/dev/null

BACKEND_ECR_URI="$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_BACKEND_REPO"
FRONTEND_ECR_URI="$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_FRONTEND_REPO"

# -----------------------------------------------------------------------------
# 4. Build & Push Docker Images to ECR
# -----------------------------------------------------------------------------
echo "🔄 Logging into ECR..."
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

# 4.1 Build and push backend
echo "📦 Building backend Docker image..."
pushd backend >/dev/null
  docker build -t estatewise-backend .
  docker tag estatewise-backend:latest "$BACKEND_ECR_URI:latest"
  echo "🚀 Pushing backend image to ECR..."
  docker push "$BACKEND_ECR_URI:latest"
popd >/dev/null

# 4.2 Build and push frontend
echo "📦 Building frontend Docker image..."
pushd frontend >/dev/null
  docker build -t estatewise-frontend .
  docker tag estatewise-frontend:latest "$FRONTEND_ECR_URI:latest"
  echo "🚀 Pushing frontend image to ECR..."
  docker push "$FRONTEND_ECR_URI:latest"
popd >/dev/null

# -----------------------------------------------------------------------------
# 5. Create IAM Role for ECS Task Execution
# -----------------------------------------------------------------------------
echo "👤 Creating IAM role for ECS task execution (if not existing)..."
if ! aws iam get-role --role-name "$TASK_EXEC_ROLE_NAME" --region "$AWS_REGION" >/dev/null 2>&1; then
  aws iam create-role \
    --role-name "$TASK_EXEC_ROLE_NAME" \
    --assume-role-policy-document '{
      "Version":"2012-10-17",
      "Statement":[
        {
          "Effect":"Allow",
          "Principal":{"Service":"ecs-tasks.amazonaws.com"},
          "Action":"sts:AssumeRole"
        }
      ]
    }' \
    --region "$AWS_REGION" >/dev/null

  aws iam attach-role-policy \
    --role-name "$TASK_EXEC_ROLE_NAME" \
    --policy-arn "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy" \
    --region "$AWS_REGION" >/dev/null
fi

# -----------------------------------------------------------------------------
# 6. Create Security Group for ECS Tasks
# -----------------------------------------------------------------------------
echo "🔒 Creating ECS security group..."
if ! aws ec2 describe-security-groups --filters "Name=group-name,Values=$SEC_GRP_NAME" "Name=vpc-id,Values=$DEFAULT_VPC_ID" --region "$AWS_REGION" | grep -q "$SEC_GRP_NAME"; then
  ECS_SG_ID="$(aws ec2 create-security-group \
    --group-name "$SEC_GRP_NAME" \
    --description "Security group for EstateWise ECS tasks" \
    --vpc-id "$DEFAULT_VPC_ID" \
    --region "$AWS_REGION" \
    --query "GroupId" --output text)"

  # Allow inbound from ALB (port 80) and from DocumentDB SG on port 27017
  aws ec2 authorize-security-group-ingress --group-id "$ECS_SG_ID" \
    --protocol tcp --port 3000 --source-group "$DEFAULT_SG_ID" --region "$AWS_REGION" || true
  aws ec2 authorize-security-group-ingress --group-id "$ECS_SG_ID" \
    --protocol tcp --port 3001 --source-group "$DEFAULT_SG_ID" --region "$AWS_REGION" || true
else
  ECS_SG_ID="$(aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=$SEC_GRP_NAME" "Name=vpc-id,Values=$DEFAULT_VPC_ID" \
    --query "SecurityGroups[0].GroupId" --output text --region "$AWS_REGION")"
fi

# -----------------------------------------------------------------------------
# 7. Create DocumentDB (MongoDB-compatible) Cluster
# -----------------------------------------------------------------------------
echo "🗄️  Creating DocumentDB subnet group (if not existing)..."
if ! aws docdb describe-db-subnet-groups --db-subnet-group-name "$DOCDB_SUBNET_GROUP" --region "$AWS_REGION" >/dev/null 2>&1; then
  aws docdb create-db-subnet-group \
    --db-subnet-group-name "$DOCDB_SUBNET_GROUP" \
    --db-subnet-group-description "Subnet group for EstateWise DocumentDB" \
    --subnet-ids $DEFAULT_SUBNET_IDS \
    --region "$AWS_REGION" >/dev/null
fi

echo "🔒 Creating DocumentDB security group..."
if ! aws ec2 describe-security-groups --filters "Name=group-name,Values=$DOCDB_SECURITY_GROUP" "Name=vpc-id,Values=$DEFAULT_VPC_ID" --region "$AWS_REGION" | grep -q "$DOCDB_SECURITY_GROUP"; then
  DOCDB_SG_ID="$(aws ec2 create-security-group \
    --group-name "$DOCDB_SECURITY_GROUP" \
    --description "Security group for EstateWise DocumentDB cluster" \
    --vpc-id "$DEFAULT_VPC_ID" \
    --region "$AWS_REGION" \
    --query "GroupId" --output text)"

  # Allow inbound from ECS_SG_ID (ECS tasks) on port 27017
  aws ec2 authorize-security-group-ingress \
    --group-id "$DOCDB_SG_ID" \
    --protocol tcp \
    --port "$DOCDB_PORT" \
    --source-group "$ECS_SG_ID" \
    --region "$AWS_REGION" || true
else
  DOCDB_SG_ID="$(aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=$DOCDB_SECURITY_GROUP" "Name=vpc-id,Values=$DEFAULT_VPC_ID" \
    --query "SecurityGroups[0].GroupId" --output text --region "$AWS_REGION")"
fi

echo "🗄️  Creating DocumentDB cluster (may take ~10 min)..."
if ! aws docdb describe-db-clusters --db-cluster-identifier "$DOCDB_CLUSTER_ID" --region "$AWS_REGION" >/dev/null 2>&1; then
  aws docdb create-db-cluster \
    --db-cluster-identifier "$DOCDB_CLUSTER_ID" \
    --engine docdb \
    --master-username "$DOCDB_MASTER_USERNAME" \
    --master-user-password "$DOCDB_MASTER_PASSWORD" \
    --vpc-security-group-ids "$DOCDB_SG_ID" \
    --db-subnet-group-name "$DOCDB_SUBNET_GROUP" \
    --backup-retention-period 1 \
    --region "$AWS_REGION" >/dev/null

  # Create a primary instance
  aws docdb create-db-instance \
    --db-instance-identifier "$DOCDB_INSTANCE_ID" \
    --db-cluster-identifier "$DOCDB_CLUSTER_ID" \
    --db-instance-class db.r5.large \
    --availability-zone "$(aws ec2 describe-subnets --subnet-ids $(echo $DEFAULT_SUBNET_IDS | awk '{print $1}') --query "Subnets[0].AvailabilityZone" --output text)" \
    --region "$AWS_REGION" >/dev/null

  echo "⏳ Waiting for DocumentDB cluster to become available..."
  aws docdb wait db-cluster-available --db-cluster-identifier "$DOCDB_CLUSTER_ID" --region "$AWS_REGION"
fi

DOCDB_ENDPOINT="$(aws docdb describe-db-clusters \
  --db-cluster-identifier "$DOCDB_CLUSTER_ID" \
  --query "DBClusters[0].Endpoint" --output text --region "$AWS_REGION")"

# Compose the Mongo URI for the backend
MONGO_URI="mongodb://${DOCDB_MASTER_USERNAME}:${DOCDB_MASTER_PASSWORD}@${DOCDB_ENDPOINT}:27017/${MONGO_INITDB_DATABASE}?ssl=true&ssl_ca_certs=rds-combined-ca-bundle.pem&retryWrites=true&w=majority"
BACKEND_ENV="${BACKEND_ENV}${MONGO_URI}"

# Download Amazon’s RDS CA bundle (DocumentDB uses it)
if [[ ! -f rds-combined-ca-bundle.pem ]]; then
  echo "📥 Downloading RDS CA bundle for DocumentDB..."
  curl -sSL https://s3.amazonaws.com/rds-downloads/rds-combined-ca-bundle.pem -o rds-combined-ca-bundle.pem
fi

# -----------------------------------------------------------------------------
# 8. Create ECS Cluster
# -----------------------------------------------------------------------------
echo "👷 Creating ECS cluster (if not existing)..."
if ! aws ecs describe-clusters --clusters "$ECS_CLUSTER_NAME" --region "$AWS_REGION" | grep -q "$ECS_CLUSTER_NAME"; then
  aws ecs create-cluster \
    --cluster-name "$ECS_CLUSTER_NAME" \
    --capacity-providers FARGATE \
    --region "$AWS_REGION" >/dev/null
fi

# -----------------------------------------------------------------------------
# 9. Register Task Definitions (Frontend & Backend)
# -----------------------------------------------------------------------------
echo "📃 Registering ECS task definition for backend..."
cat <<EOF > backend-task-def.json
{
  "family": "estatewise-backend-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::${ACCOUNT_ID}:role/${TASK_EXEC_ROLE_NAME}",
  "containerDefinitions": [
    {
      "name": "estatewise-backend",
      "image": "${BACKEND_ECR_URI}:latest",
      "portMappings": [{ "containerPort": 3001, "protocol": "tcp" }],
      "essential": true,
      "environment": [
        { "name": "PORT", "value": "3001" },
        { "name": "JWT_SECRET", "value": "${JWT_SECRET}" },
        { "name": "GOOGLE_AI_API_KEY", "value": "${GOOGLE_AI_API_KEY}" },
        { "name": "PINECONE_API_KEY", "value": "${PINECONE_API_KEY}" },
        { "name": "PINECONE_INDEX", "value": "${PINECONE_INDEX}" },
        { "name": "MONGO_URI", "value": "${MONGO_URI}" }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/estatewise-backend",
          "awslogs-region": "${AWS_REGION}",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
EOF

aws ecs register-task-definition \
  --cli-input-json file://backend-task-def.json \
  --region "$AWS_REGION" >/dev/null

echo "📃 Registering ECS task definition for frontend..."
cat <<EOF > frontend-task-def.json
{
  "family": "estatewise-frontend-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::${ACCOUNT_ID}:role/${TASK_EXEC_ROLE_NAME}",
  "containerDefinitions": [
    {
      "name": "estatewise-frontend",
      "image": "${FRONTEND_ECR_URI}:latest",
      "portMappings": [{ "containerPort": 3000, "protocol": "tcp" }],
      "essential": true,
      "environment": [
        { "name": "NEXT_PUBLIC_API_BASE_URL", "value": "http://ALB_DNS_PLACEHOLDER/api" }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/estatewise-frontend",
          "awslogs-region": "${AWS_REGION}",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
EOF

aws ecs register-task-definition \
  --cli-input-json file://frontend-task-def.json \
  --region "$AWS_REGION" >/dev/null

# Clean up local task definition JSONs
rm -f backend-task-def.json frontend-task-def.json

# -----------------------------------------------------------------------------
# 10. Create an Application Load Balancer + Target Groups + Listener Rules
# -----------------------------------------------------------------------------
echo "🔧 Creating Application Load Balancer (ALB)..."
if ! aws elbv2 describe-load-balancers --names "$ALB_NAME" --region "$AWS_REGION" >/dev/null 2>&1; then
  ALB_ARN="$(aws elbv2 create-load-balancer \
    --name "$ALB_NAME" \
    --subnets $DEFAULT_SUBNET_IDS \
    --security-groups "$DEFAULT_SG_ID" \
    --scheme internet-facing \
    --type application \
    --region "$AWS_REGION" \
    --query "LoadBalancers[0].LoadBalancerArn" --output text)"
else
  ALB_ARN="$(aws elbv2 describe-load-balancers \
    --names "$ALB_NAME" --region "$AWS_REGION" \
    --query "LoadBalancers[0].LoadBalancerArn" --output text)"
fi

# Create target group for backend (/api/*)
echo "🔧 Creating target group for backend..."
if ! aws elbv2 describe-target-groups --names "tg-backend-3001" --region "$AWS_REGION" >/dev/null 2>&1; then
  TG_BACKEND_ARN="$(aws elbv2 create-target-group \
    --name "tg-backend-3001" \
    --protocol HTTP \
    --port 3001 \
    --vpc-id "$DEFAULT_VPC_ID" \
    --target-type ip \
    --region "$AWS_REGION" \
    --query "TargetGroups[0].TargetGroupArn" --output text)"
else
  TG_BACKEND_ARN="$(aws elbv2 describe-target-groups \
    --names "tg-backend-3001" --region "$AWS_REGION" \
    --query "TargetGroups[0].TargetGroupArn" --output text)"
fi

# Create target group for frontend (default)
echo "🔧 Creating target group for frontend..."
if ! aws elbv2 describe-target-groups --names "tg-frontend-3000" --region "$AWS_REGION" >/dev/null 2>&1; then
  TG_FRONTEND_ARN="$(aws elbv2 create-target-group \
    --name "tg-frontend-3000" \
    --protocol HTTP \
    --port 3000 \
    --vpc-id "$DEFAULT_VPC_ID" \
    --target-type ip \
    --region "$AWS_REGION" \
    --query "TargetGroups[0].TargetGroupArn" --output text)"
else
  TG_FRONTEND_ARN="$(aws elbv2 describe-target-groups \
    --names "tg-frontend-3000" --region "$AWS_REGION" \
    --query "TargetGroups[0].TargetGroupArn" --output text)"
fi

# Create (or retrieve) HTTP listener on port 80
echo "🔧 Setting up HTTP listener on port 80..."
if ! aws elbv2 describe-listeners --load-balancer-arn "$ALB_ARN" --region "$AWS_REGION" | grep -q "Port.*80"; then
  LISTENER_ARN="$(aws elbv2 create-listener \
    --load-balancer-arn "$ALB_ARN" \
    --protocol HTTP \
    --port 80 \
    --default-actions Type=forward,TargetGroupArn="$TG_FRONTEND_ARN" \
    --region "$AWS_REGION" \
    --query "Listeners[0].ListenerArn" --output text)"
else
  LISTENER_ARN="$(aws elbv2 describe-listeners \
    --load-balancer-arn "$ALB_ARN" --region "$AWS_REGION" \
    --query "Listeners[?Port==\`80\`].ListenerArn" --output text)"
fi

# Create a rule to forward /api/* to backend TG
echo "🔧 Configuring path-based routing ( /api/* → backend )..."
# Check if rule already exists
if ! aws elbv2 describe-rules --listener-arn "$LISTENER_ARN" --region "$AWS_REGION" | grep -q "/api/*"; then
  aws elbv2 create-rule \
    --listener-arn "$LISTENER_ARN" \
    --priority 10 \
    --conditions Field=path-pattern,Values="/api/*" \
    --actions Type=forward,TargetGroupArn="$TG_BACKEND_ARN" \
    --region "$AWS_REGION" >/dev/null
fi

# -----------------------------------------------------------------------------
# 11. Create or Update ECS Services (Frontend & Backend)
# -----------------------------------------------------------------------------
echo "🚢 Deploying ECS service for backend..."
if ! aws ecs describe-services --cluster "$ECS_CLUSTER_NAME" --services "estatewise-backend-service" --region "$AWS_REGION" | grep -q "estatewise-backend-service"; then
  aws ecs create-service \
    --cluster "$ECS_CLUSTER_NAME" \
    --service-name "estatewise-backend-service" \
    --task-definition "estatewise-backend-task" \
    --desired-count 2 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[$DEFAULT_SUBNET_IDS],securityGroups=[$ECS_SG_ID],assignPublicIp=ENABLED}" \
    --load-balancers "targetGroupArn=$TG_BACKEND_ARN,containerName=estatewise-backend,containerPort=3001" \
    --region "$AWS_REGION" >/dev/null
else
  aws ecs update-service \
    --cluster "$ECS_CLUSTER_NAME" \
    --service "estatewise-backend-service" \
    --force-new-deployment \
    --region "$AWS_REGION" >/dev/null
fi

echo "🚢 Deploying ECS service for frontend..."
# Before creating frontend service, we need to update the frontend task definition’s environment variable for NEXT_PUBLIC_API_BASE_URL
ALB_DNS="$(aws elbv2 describe-load-balancers --names "$ALB_NAME" --region "$AWS_REGION" --query "LoadBalancers[0].DNSName" --output text)"
# Update the frontend task definition to point NEXT_PUBLIC_API_BASE_URL to actual ALB DNS
cat <<EOF > frontend-task-def-updated.json
{
  "family": "estatewise-frontend-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::${ACCOUNT_ID}:role/${TASK_EXEC_ROLE_NAME}",
  "containerDefinitions": [
    {
      "name": "estatewise-frontend",
      "image": "${FRONTEND_ECR_URI}:latest",
      "portMappings": [{ "containerPort": 3000, "protocol": "tcp" }],
      "essential": true,
      "environment": [
        { "name": "NEXT_PUBLIC_API_BASE_URL", "value": "http://${ALB_DNS}/api" }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/estatewise-frontend",
          "awslogs-region": "${AWS_REGION}",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
EOF

aws ecs register-task-definition \
  --cli-input-json file://frontend-task-def-updated.json \
  --region "$AWS_REGION" >/dev/null
rm -f frontend-task-def-updated.json

if ! aws ecs describe-services --cluster "$ECS_CLUSTER_NAME" --services "estatewise-frontend-service" --region "$AWS_REGION" | grep -q "estatewise-frontend-service"; then
  aws ecs create-service \
    --cluster "$ECS_CLUSTER_NAME" \
    --service-name "estatewise-frontend-service" \
    --task-definition "estatewise-frontend-task" \
    --desired-count 2 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[$DEFAULT_SUBNET_IDS],securityGroups=[$ECS_SG_ID],assignPublicIp=ENABLED}" \
    --load-balancers "targetGroupArn=$TG_FRONTEND_ARN,containerName=estatewise-frontend,containerPort=3000" \
    --region "$AWS_REGION" >/dev/null
else
  aws ecs update-service \
    --cluster "$ECS_CLUSTER_NAME" \
    --service "estatewise-frontend-service" \
    --force-new-deployment \
    --region "$AWS_REGION" >/dev/null
fi

# -----------------------------------------------------------------------------
# 12. Output Final Deployment Information
# -----------------------------------------------------------------------------
echo ""
echo "✅ Deployment complete!"
echo "   • Frontend URL: http://${ALB_DNS}/"
echo "   • Backend (API) URL: http://${ALB_DNS}/api/"
echo ""
echo "ℹ️  DocumentDB endpoint: ${DOCDB_ENDPOINT}:${DOCDB_PORT}"
echo "ℹ️  MongoDB URI used by backend: ${MONGO_URI}"
echo ""
echo "You can monitor ECS tasks in the AWS Console → ECS → Clusters → $ECS_CLUSTER_NAME"
echo "You can monitor load balancer in AWS Console → EC2 → Load Balancing → Load Balancers → $ALB_NAME"
