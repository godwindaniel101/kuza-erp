# iam.tf
# Two roles per ECS task, following least privilege:
#   - execution role : used by the ECS agent to pull images, write logs, and READ the
#     specific SSM params / Secrets Manager secrets injected into the container.
#   - task role      : the identity the running app assumes; here it only needs EFS mount
#     permissions (IAM-authorized EFS access point).

data "aws_iam_policy_document" "ecs_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

# --- Execution role ---
resource "aws_iam_role" "ecs_execution" {
  name               = "${local.name}-ecs-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
  tags               = { Name = "${local.name}-ecs-execution" }
}

resource "aws_iam_role_policy_attachment" "ecs_execution_managed" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Allow the execution role to read ONLY the specific secrets we inject (not "*").
data "aws_iam_policy_document" "ecs_secrets_read" {
  statement {
    sid       = "ReadAppSsmSecrets"
    actions   = ["ssm:GetParameters", "ssm:GetParameter"]
    resources = [for p in aws_ssm_parameter.app_secret : p.arn]
  }

  statement {
    sid       = "ReadRdsManagedSecret"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_db_instance.main.master_user_secret[0].secret_arn]
  }

  # SecureString params and the RDS secret are encrypted with the AWS-managed keys for
  # SSM / Secrets Manager. Decrypt is scoped to those services via the ViaService
  # condition so this does not grant blanket KMS access.
  statement {
    sid       = "DecryptViaSsmAndSecretsManager"
    actions   = ["kms:Decrypt"]
    resources = ["*"]
    condition {
      test     = "StringEquals"
      variable = "kms:ViaService"
      values = [
        "ssm.${var.region}.amazonaws.com",
        "secretsmanager.${var.region}.amazonaws.com",
      ]
    }
  }
}

resource "aws_iam_role_policy" "ecs_secrets_read" {
  name   = "${local.name}-ecs-secrets-read"
  role   = aws_iam_role.ecs_execution.id
  policy = data.aws_iam_policy_document.ecs_secrets_read.json
}

# --- Task role (backend): EFS access-point mount ---
resource "aws_iam_role" "backend_task" {
  name               = "${local.name}-backend-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
  tags               = { Name = "${local.name}-backend-task" }
}

data "aws_iam_policy_document" "backend_efs" {
  statement {
    sid = "EfsClientMount"
    actions = [
      "elasticfilesystem:ClientMount",
      "elasticfilesystem:ClientWrite",
      "elasticfilesystem:ClientRootAccess",
    ]
    resources = [aws_efs_file_system.uploads.arn]
    condition {
      test     = "StringEquals"
      variable = "elasticfilesystem:AccessPointArn"
      values   = [aws_efs_access_point.uploads.arn]
    }
  }
}

resource "aws_iam_role_policy" "backend_efs" {
  name   = "${local.name}-backend-efs"
  role   = aws_iam_role.backend_task.id
  policy = data.aws_iam_policy_document.backend_efs.json
}

# --- Task role (frontend): no AWS API access needed ---
resource "aws_iam_role" "frontend_task" {
  name               = "${local.name}-frontend-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
  tags               = { Name = "${local.name}-frontend-task" }
}
