# ecs.tf
# ECS Fargate cluster with two services: backend (NestJS :4001) and frontend
# (Next.js :3000). Task definitions pull from ECR and inject config via plain env vars
# (non-secret) and `secrets` (SSM / Secrets Manager ARNs — values resolved at launch,
# never stored in the task definition or Terraform state).

resource "aws_ecs_cluster" "main" {
  name = "${local.name}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = { Name = "${local.name}-cluster" }
}

# --- CloudWatch log groups ---
resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/${local.name}/backend"
  retention_in_days = var.log_retention_days
  tags              = { Name = "${local.name}-backend-logs" }
}

resource "aws_cloudwatch_log_group" "frontend" {
  name              = "/ecs/${local.name}/frontend"
  retention_in_days = var.log_retention_days
  tags              = { Name = "${local.name}-frontend-logs" }
}

locals {
  # Secrets injected into the backend container. DB password comes from the RDS-managed
  # Secrets Manager secret (JSON key `password`); the rest come from SSM SecureStrings.
  backend_secrets = concat(
    [
      {
        name      = "DB_PASSWORD"
        valueFrom = "${aws_db_instance.main.master_user_secret[0].secret_arn}:password::"
      }
    ],
    [
      for env_name, _ in local.app_secret_params : {
        name      = env_name
        valueFrom = aws_ssm_parameter.app_secret[env_name].arn
      }
    ]
  )
}

# ---------------------------------------------------------------------------
# Backend task definition
# ---------------------------------------------------------------------------
resource "aws_ecs_task_definition" "backend" {
  family                   = "${local.name}-backend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.backend_cpu
  memory                   = var.backend_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.backend_task.arn

  # Persistent uploads volume backed by EFS (IAM-authorized, TLS in transit).
  volume {
    name = "uploads"
    efs_volume_configuration {
      file_system_id     = aws_efs_file_system.uploads.id
      transit_encryption = "ENABLED"
      authorization_config {
        access_point_id = aws_efs_access_point.uploads.id
        iam             = "ENABLED"
      }
    }
  }

  container_definitions = jsonencode([
    {
      name      = "backend"
      image     = "${aws_ecr_repository.backend.repository_url}:${var.backend_image_tag}"
      essential = true

      portMappings = [
        { containerPort = var.backend_container_port, protocol = "tcp" }
      ]

      environment = [
        { name = "NODE_ENV", value = var.node_env },
        { name = "PORT", value = tostring(var.backend_container_port) },
        { name = "DB_HOST", value = aws_db_instance.main.address },
        { name = "DB_PORT", value = "5432" },
        { name = "DB_USERNAME", value = var.db_username },
        { name = "DB_NAME", value = var.db_app_name },        # erp_db (app-created)
        { name = "DB_LANDLORD_NAME", value = var.db_landlord_name }, # erp_landlord
        { name = "FRONTEND_URL", value = local.public_url },
        { name = "AI_PROVIDER", value = var.ai_provider },
      ]

      secrets = local.backend_secrets

      mountPoints = [
        { sourceVolume = "uploads", containerPath = "/app/uploads", readOnly = false }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.backend.name
          "awslogs-region"        = var.region
          "awslogs-stream-prefix" = "backend"
        }
      }
    }
  ])

  tags = { Name = "${local.name}-backend" }
}

# ---------------------------------------------------------------------------
# Frontend task definition
# ---------------------------------------------------------------------------
resource "aws_ecs_task_definition" "frontend" {
  family                   = "${local.name}-frontend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.frontend_cpu
  memory                   = var.frontend_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.frontend_task.arn

  container_definitions = jsonencode([
    {
      name      = "frontend"
      image     = "${aws_ecr_repository.frontend.repository_url}:${var.frontend_image_tag}"
      essential = true

      portMappings = [
        { containerPort = var.frontend_container_port, protocol = "tcp" }
      ]

      environment = [
        { name = "NODE_ENV", value = var.node_env },
        { name = "PORT", value = tostring(var.frontend_container_port) },
        { name = "HOSTNAME", value = "0.0.0.0" },
        { name = "NEXT_TELEMETRY_DISABLED", value = "1" },
        # Public API origin (browser) and server-side base (SSR). Both hit the ALB, which
        # routes /api/* + /uploads/* to the backend.
        { name = "NEXT_PUBLIC_API_URL", value = local.public_url },
        { name = "SSR_API_URL", value = local.public_url },
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.frontend.name
          "awslogs-region"        = var.region
          "awslogs-stream-prefix" = "frontend"
        }
      }
    }
  ])

  tags = { Name = "${local.name}-frontend" }
}

# ---------------------------------------------------------------------------
# Services
# ---------------------------------------------------------------------------
resource "aws_ecs_service" "backend" {
  name            = "${local.name}-backend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = var.backend_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.backend.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = var.backend_container_port
  }

  # Give the app time to run migrations / tenant bootstrap before health checks count.
  health_check_grace_period_seconds = 120

  # Ensure the ALB (and its rules) exist before the service registers targets, and allow
  # the EFS mount targets to be ready.
  depends_on = [
    aws_lb_listener.http,
    aws_efs_mount_target.uploads,
    aws_iam_role_policy.ecs_secrets_read,
  ]

  tags = { Name = "${local.name}-backend" }
}

resource "aws_ecs_service" "frontend" {
  name            = "${local.name}-frontend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.frontend.arn
  desired_count   = var.frontend_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.frontend.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.frontend.arn
    container_name   = "frontend"
    container_port   = var.frontend_container_port
  }

  depends_on = [aws_lb_listener.http]

  tags = { Name = "${local.name}-frontend" }
}
