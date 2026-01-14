resource "aws_ecr_repository" "backend" {
  count = var.create_ecr_repo ? 1 : 0
  name  = local.ecr_repository_name

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = merge(local.common_tags, {
    Name = local.ecr_repository_name
  })
}

resource "aws_ecr_lifecycle_policy" "backend" {
  count      = var.create_ecr_repo ? 1 : 0
  repository = aws_ecr_repository.backend[0].name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Expire untagged images after 30 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 30
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
