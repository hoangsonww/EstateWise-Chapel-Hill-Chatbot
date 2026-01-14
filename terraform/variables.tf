variable "name_prefix" {
  description = "Name prefix for all resources"
  type        = string
  default     = "estatewise"
}

variable "tags" {
  description = "Additional tags to apply to resources"
  type        = map(string)
  default     = {}
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "List of public subnet CIDRs"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]

  validation {
    condition     = length(var.public_subnet_cidrs) >= 2
    error_message = "Provide at least two public subnet CIDRs."
  }
}

variable "private_subnet_cidrs" {
  description = "List of private subnet CIDRs"
  type        = list(string)
  default     = ["10.0.101.0/24", "10.0.102.0/24"]

  validation {
    condition     = length(var.private_subnet_cidrs) >= 2
    error_message = "Provide at least two private subnet CIDRs."
  }

  validation {
    condition     = length(var.private_subnet_cidrs) == length(var.public_subnet_cidrs)
    error_message = "private_subnet_cidrs must match public_subnet_cidrs length."
  }
}

variable "enable_nat_gateway" {
  description = "Enable NAT gateways for private subnets"
  type        = bool
  default     = true
}

variable "single_nat_gateway" {
  description = "Use a single NAT gateway for all private subnets"
  type        = bool
  default     = true
}

variable "desired_count" {
  description = "Number of Fargate tasks"
  type        = number
  default     = 2
}

variable "min_capacity" {
  description = "Minimum autoscaling capacity"
  type        = number
  default     = 2
}

variable "max_capacity" {
  description = "Maximum autoscaling capacity"
  type        = number
  default     = 6
}

variable "cpu_target_utilization" {
  description = "Target CPU utilization percentage for autoscaling"
  type        = number
  default     = 60
}

variable "memory_target_utilization" {
  description = "Target memory utilization percentage for autoscaling"
  type        = number
  default     = 75
}

variable "container_image" {
  description = "Docker image URI for backend"
  type        = string
}

variable "container_port" {
  description = "Container port exposed by backend"
  type        = number
  default     = 3001
}

variable "health_check_path" {
  description = "ALB health check path"
  type        = string
  default     = "/health"
}

variable "health_check_grace_period_seconds" {
  description = "Grace period before ECS health checks start"
  type        = number
  default     = 60
}

variable "task_cpu" {
  description = "CPU units for ECS task (Fargate)"
  type        = number
  default     = 512
}

variable "task_memory" {
  description = "Memory (MB) for ECS task (Fargate)"
  type        = number
  default     = 1024
}

variable "deployment_minimum_healthy_percent" {
  description = "Minimum healthy percent during deployments"
  type        = number
  default     = 50
}

variable "deployment_maximum_percent" {
  description = "Maximum percent during deployments"
  type        = number
  default     = 200
}

variable "enable_execute_command" {
  description = "Enable ECS Exec"
  type        = bool
  default     = true
}

variable "assign_public_ip" {
  description = "Assign public IPs to ECS tasks (not recommended for private subnets)"
  type        = bool
  default     = false
}

variable "environment" {
  description = "Environment variables for the backend container"
  type        = map(string)
  default     = {}
}

variable "secrets" {
  description = "Secrets for the backend container (map of name => ARN)"
  type        = map(string)
  default     = {}
}

variable "task_role_policy_arns" {
  description = "Additional IAM policy ARNs to attach to the ECS task role"
  type        = list(string)
  default     = []
}

variable "log_retention_in_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

variable "alb_idle_timeout" {
  description = "ALB idle timeout in seconds"
  type        = number
  default     = 60
}

variable "alb_access_logs_bucket" {
  description = "S3 bucket for ALB access logs (leave empty to disable)"
  type        = string
  default     = ""
}

variable "alb_access_logs_prefix" {
  description = "S3 prefix for ALB access logs"
  type        = string
  default     = "alb-logs"
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN to enable HTTPS listener"
  type        = string
  default     = ""
}

variable "enable_container_healthcheck" {
  description = "Enable container-level health check"
  type        = bool
  default     = false
}

variable "create_ecr_repo" {
  description = "Create an ECR repository for the backend image"
  type        = bool
  default     = false
}

variable "ecr_repository_name" {
  description = "ECR repository name (optional override)"
  type        = string
  default     = ""
}

variable "target_group_deregistration_delay" {
  description = "Deregistration delay for target group in seconds"
  type        = number
  default     = 30
}
