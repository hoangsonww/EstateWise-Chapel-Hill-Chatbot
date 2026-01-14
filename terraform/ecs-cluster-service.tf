resource "aws_ecs_cluster" "main" {
  name = "${local.name_prefix}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-cluster"
  })
}

locals {
  backend_container = {
    name      = "backend"
    image     = var.container_image
    essential = true
    portMappings = [
      {
        containerPort = var.container_port
        protocol      = "tcp"
      }
    ]
    environment = local.container_environment
    secrets     = local.container_secrets
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.ecs.name
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "backend"
      }
    }
  }

  backend_container_with_healthcheck = var.enable_container_healthcheck ? merge(
    local.backend_container,
    {
      healthCheck = {
        command     = ["CMD-SHELL", "node -e 'require(\"http\").get(\"http://127.0.0.1:${var.container_port}${var.health_check_path}\", r => process.exit(r.statusCode === 200 ? 0 : 1)).on(\"error\", () => process.exit(1))'"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 30
      }
    }
  ) : local.backend_container

  container_definitions = [local.backend_container_with_healthcheck]
}

resource "aws_ecs_task_definition" "backend" {
  family                   = "${local.name_prefix}-backend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = tostring(var.task_cpu)
  memory                   = tostring(var.task_memory)
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn
  container_definitions    = jsonencode(local.container_definitions)

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-task"
  })
}

resource "aws_ecs_service" "backend" {
  name                               = "${local.name_prefix}-backend-service"
  cluster                            = aws_ecs_cluster.main.id
  task_definition                    = aws_ecs_task_definition.backend.arn
  desired_count                      = var.desired_count
  launch_type                        = "FARGATE"
  deployment_minimum_healthy_percent = var.deployment_minimum_healthy_percent
  deployment_maximum_percent         = var.deployment_maximum_percent
  health_check_grace_period_seconds  = var.health_check_grace_period_seconds
  enable_execute_command             = var.enable_execute_command
  propagate_tags                     = "SERVICE"

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  network_configuration {
    subnets         = values(aws_subnet.private)[*].id
    security_groups = [aws_security_group.ecs_tasks.id]
    assign_public_ip = var.assign_public_ip
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = var.container_port
  }

  depends_on = [aws_lb_listener.http]

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-backend-service"
  })
}
