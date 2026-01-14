resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/${local.name_prefix}/backend"
  retention_in_days = var.log_retention_in_days

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-ecs-logs"
  })
}
