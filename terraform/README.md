# Terraform (AWS ECS/Fargate Backend)

Production-grade AWS infrastructure for the EstateWise backend. This module
provisions:

- VPC with public and private subnets
- Internet Gateway and NAT gateways
- Application Load Balancer (HTTP, optional HTTPS)
- ECS/Fargate cluster, task definition, and service
- IAM roles (execution and task)
- CloudWatch log group
- Autoscaling policies
- Optional ECR repository

## Directory Layout
- providers.tf: Terraform and AWS provider configuration
- variables.tf: Input variables and defaults
- locals.tf: Derived values and container env/secret mapping
- data.tf: AWS data sources
- networking.tf: VPC, subnets, IGW, NAT, routing
- security.tf: Security groups for ALB and ECS tasks
- alb.tf: ALB, listener, target group
- logging.tf: CloudWatch log group
- iam.tf: IAM roles and attachments
- ecs-cluster-service.tf: ECS cluster, task definition, service
- autoscaling.tf: ECS service autoscaling policies
- ecr.tf: Optional ECR repository and lifecycle policy
- outputs.tf: Useful outputs

## Prerequisites
- Terraform >= 1.2
- AWS credentials configured (aws configure or environment variables)
- A backend container image that exposes port 3001 and responds to GET /health

## Quick Start (Local Terraform)
```bash
cd terraform
terraform init
terraform plan -var 'container_image=123456789012.dkr.ecr.us-east-1.amazonaws.com/estatewise-backend:latest'
terraform apply -var 'container_image=123456789012.dkr.ecr.us-east-1.amazonaws.com/estatewise-backend:latest'
```

Destroy:
```bash
terraform destroy -var 'container_image=...'
```

## Run Terraform in Docker (terraform/Dockerfile)
```bash
docker build -t estatewise-terraform -f terraform/Dockerfile .

# Uses AWS credentials from your local machine
# Option A: mount ~/.aws

docker run --rm -it \
  -v "$(pwd)":/workspace \
  -v "$HOME/.aws":/home/terraform/.aws:ro \
  -w /workspace/terraform \
  estatewise-terraform init

# Option B: pass environment variables

docker run --rm -it \
  -v "$(pwd)":/workspace \
  -w /workspace/terraform \
  -e AWS_ACCESS_KEY_ID \
  -e AWS_SECRET_ACCESS_KEY \
  -e AWS_SESSION_TOKEN \
  estatewise-terraform plan \
  -var 'container_image=123456789012.dkr.ecr.us-east-1.amazonaws.com/estatewise-backend:latest'
```

## Key Variables
Core:
- name_prefix (default: estatewise)
- aws_region (default: us-east-1)
- container_image (required)
- container_port (default: 3001)
- health_check_path (default: /health)
- health_check_grace_period_seconds (default: 60)
- desired_count (default: 2)
- deployment_minimum_healthy_percent (default: 50)
- deployment_maximum_percent (default: 200)

Networking:
- vpc_cidr (default: 10.0.0.0/16)
- public_subnet_cidrs (default: 10.0.1.0/24, 10.0.2.0/24)
- private_subnet_cidrs (default: 10.0.101.0/24, 10.0.102.0/24)
- enable_nat_gateway (default: true)
- single_nat_gateway (default: true)

ECS and scaling:
- task_cpu (default: 512)
- task_memory (default: 1024)
- min_capacity (default: 2)
- max_capacity (default: 6)
- cpu_target_utilization (default: 60)
- memory_target_utilization (default: 75)
- enable_execute_command (default: true)
- enable_container_healthcheck (default: false)
- assign_public_ip (default: false)

Logging and ALB:
- log_retention_in_days (default: 30)
- alb_idle_timeout (default: 60)
- alb_access_logs_bucket (default: empty, disabled)
- alb_access_logs_prefix (default: alb-logs)
- acm_certificate_arn (default: empty, HTTPS disabled)
- target_group_deregistration_delay (default: 30)

Runtime configuration:
- environment (map of env vars)
- secrets (map of env name to Secrets Manager or SSM ARN)
- task_role_policy_arns (list of policy ARNs)

ECR:
- create_ecr_repo (default: false)
- ecr_repository_name (default: <name_prefix>-backend)

Example terraform.tfvars:
```hcl
name_prefix     = "estatewise"
aws_region      = "us-east-1"
container_image = "123456789012.dkr.ecr.us-east-1.amazonaws.com/estatewise-backend:latest"
min_capacity    = 2
max_capacity    = 6

environment = {
  NODE_ENV = "production"
}

# secrets = {
#   JWT_SECRET = "arn:aws:ssm:us-east-1:123456789012:parameter/estatewise/jwt"
# }
```

## Outputs
- vpc_id
- public_subnets
- private_subnets
- ecs_cluster_name
- ecs_service_name
- task_definition_arn
- alb_dns_name
- alb_arn
- ecr_repository_url

## How It Works
1. The VPC is created with public and private subnets.
2. The ALB runs in public subnets and forwards traffic to the ECS target group.
3. ECS tasks run in private subnets and receive traffic only from the ALB.
4. CloudWatch log group captures container logs.
5. Autoscaling targets CPU and memory utilization.

## Production Considerations
- Remote state: use S3 + DynamoDB for state locking.
- HTTPS: set acm_certificate_arn and use Route53 for DNS.
- Logging: set alb_access_logs_bucket and configure bucket policy for ALB.
- Secrets: pass secrets via AWS Secrets Manager or SSM and attach IAM policies.
- Costs: use single_nat_gateway=false for HA, true for lower cost.
- Container health checks: enable enable_container_healthcheck only if the
  image contains node and can reach the health endpoint.
- Observability: enable CloudWatch alarms or integrate with existing tooling.

## Known Limitations
- This module provisions only the backend service. It does not deploy the
  frontend, database, or external dependencies.
- Database provisioning and backups are out of scope here.
