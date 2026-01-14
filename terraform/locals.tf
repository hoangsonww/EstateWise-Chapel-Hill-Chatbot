locals {
  name_prefix = var.name_prefix

  common_tags = merge(
    {
      Project   = var.name_prefix
      ManagedBy = "Terraform"
    },
    var.tags
  )

  azs                = slice(data.aws_availability_zones.available.names, 0, length(var.public_subnet_cidrs))
  public_subnet_map  = zipmap(local.azs, var.public_subnet_cidrs)
  private_subnet_map = zipmap(local.azs, var.private_subnet_cidrs)

  container_environment = [
    for key in sort(keys(var.environment)) : {
      name  = key
      value = var.environment[key]
    }
  ]

  container_secrets = [
    for key in sort(keys(var.secrets)) : {
      name      = key
      valueFrom = var.secrets[key]
    }
  ]

  enable_https            = length(trimspace(var.acm_certificate_arn)) > 0
  alb_access_logs_enabled = length(trimspace(var.alb_access_logs_bucket)) > 0

  ecr_repository_name = var.ecr_repository_name != "" ? var.ecr_repository_name : "${var.name_prefix}-backend"
}
