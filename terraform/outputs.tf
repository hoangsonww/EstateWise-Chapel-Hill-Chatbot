output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "public_subnets" {
  description = "Public Subnet IDs"
  value       = values(aws_subnet.public)[*].id
}

output "private_subnets" {
  description = "Private Subnet IDs"
  value       = values(aws_subnet.private)[*].id
}

output "ecs_cluster_name" {
  description = "ECS Cluster name"
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "ECS Service name"
  value       = aws_ecs_service.backend.name
}

output "task_definition_arn" {
  description = "ECS Task Definition ARN"
  value       = aws_ecs_task_definition.backend.arn
}

output "alb_dns_name" {
  description = "Application Load Balancer DNS name"
  value       = aws_lb.alb.dns_name
}

output "alb_arn" {
  description = "Application Load Balancer ARN"
  value       = aws_lb.alb.arn
}

output "ecr_repository_url" {
  description = "ECR repository URL (if created)"
  value       = try(aws_ecr_repository.backend[0].repository_url, null)
}
