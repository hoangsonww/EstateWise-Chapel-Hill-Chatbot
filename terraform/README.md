# Terraform (AWS ECS/Fargate Backend)

Terraform configuration for provisioning an AWS VPC, public subnets, an ALB,
and an ECS/Fargate service that runs the backend container.

## Prerequisites
- Terraform >= 1.2
- AWS credentials configured (e.g., `aws configure`)
- A built backend image in a registry (ECR or other) that exposes port `3001`
  and responds to `GET /health` with `200`.

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
- `aws_region` (default: `us-east-1`)
- `vpc_cidr` (default: `10.0.0.0/16`)
- `public_subnet_cidrs` (default: `["10.0.1.0/24", "10.0.2.0/24"]`)
- `desired_count` (default: `2`)
- `container_image` (required): Docker image URI for the backend service.

Example `terraform.tfvars`:
```hcl
aws_region     = "us-east-1"
desired_count  = 2
container_image = "123456789012.dkr.ecr.us-east-1.amazonaws.com/estatewise-backend:latest"
```

## Outputs
- `vpc_id`
- `public_subnets`
- `ecs_cluster_id`
- `alb_dns_name`

## Notes
- The ECS task definition currently sets only `NODE_ENV=production`. Add other
  environment variables (or wire in SSM/Secrets Manager) as needed.
- The security group allows inbound HTTP on port `80`. If the ALB-to-task
  traffic needs additional ports, update the security group accordingly.
- This module does not provision a database or other backend dependencies.
