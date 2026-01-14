# Terraform (AWS ECS/Fargate Backend)

Production-grade AWS infrastructure for the EstateWise backend. This module
provisions:

- VPC with public/private subnets
- Internet Gateway + NAT gateways
- Application Load Balancer
- ECS/Fargate cluster + service
- IAM roles (execution + task)
- CloudWatch log group
- Autoscaling policies
- Optional ECR repository

## Prerequisites
- Terraform >= 1.2
- AWS credentials configured (e.g., `aws configure`)
- A backend container image that exposes port `3001` and responds to
  `GET /health` with `200`.

## Quick Start
```bash
cd terraform
terraform init
terraform plan -var 'container_image=123456789012.dkr.ecr.us-east-1.amazonaws.com/estatewise-backend:latest'
terraform apply -var 'container_image=123456789012.dkr.ecr.us-east-1.amazonaws.com/estatewise-backend:latest'
```

To clean up:
```bash
terraform destroy -var 'container_image=...'
```

## Variables
Core:
- `name_prefix` (default: `estatewise`)
- `aws_region` (default: `us-east-1`)
- `container_image` (required)
- `container_port` (default: `3001`)
- `health_check_path` (default: `/health`)
- `desired_count` (default: `2`)

Networking:
- `vpc_cidr` (default: `10.0.0.0/16`)
- `public_subnet_cidrs` (default: `10.0.1.0/24`, `10.0.2.0/24`)
- `private_subnet_cidrs` (default: `10.0.101.0/24`, `10.0.102.0/24`)
- `enable_nat_gateway` (default: `true`)
- `single_nat_gateway` (default: `true`)

ECS & scaling:
- `task_cpu` (default: `512`)
- `task_memory` (default: `1024`)
- `min_capacity` (default: `2`)
- `max_capacity` (default: `6`)
- `cpu_target_utilization` (default: `60`)
- `memory_target_utilization` (default: `75`)
- `enable_execute_command` (default: `true`)

Logging & ALB:
- `log_retention_in_days` (default: `30`)
- `alb_idle_timeout` (default: `60`)
- `alb_access_logs_bucket` (default: empty, disabled)
- `alb_access_logs_prefix` (default: `alb-logs`)
- `acm_certificate_arn` (default: empty, HTTPS disabled)

Runtime configuration:
- `environment` (map)
- `secrets` (map of env name => Secrets Manager/SSM ARN)
- `task_role_policy_arns` (list)

ECR:
- `create_ecr_repo` (default: `false`)
- `ecr_repository_name` (default: `<name_prefix>-backend`)

Example `terraform.tfvars`:
```hcl
name_prefix      = "estatewise"
aws_region       = "us-east-1"
container_image  = "123456789012.dkr.ecr.us-east-1.amazonaws.com/estatewise-backend:latest"
min_capacity     = 2
max_capacity     = 6
cpu_target_utilization = 60
memory_target_utilization = 75

environment = {
  NODE_ENV = "production"
}

# secrets = {
#   JWT_SECRET = "arn:aws:ssm:us-east-1:123456789012:parameter/estatewise/jwt"
# }
```

## Outputs
- `vpc_id`
- `public_subnets`
- `private_subnets`
- `ecs_cluster_name`
- `ecs_service_name`
- `task_definition_arn`
- `alb_dns_name`
- `alb_arn`
- `ecr_repository_url`

## Notes
- If you enable `enable_container_healthcheck`, the task definition will use a
  Node-based HTTP check (`http://127.0.0.1:<port>/health`).
- The ECS service runs in private subnets by default. Keep
  `assign_public_ip=false` unless you need public tasks.
- Wire secrets via `secrets` and add permissions through
  `task_role_policy_arns` as needed.
