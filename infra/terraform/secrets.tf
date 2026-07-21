# secrets.tf
# Application secrets live in SSM Parameter Store as SecureString parameters. We create
# the parameter *containers* with a harmless placeholder value, then:
#   - lifecycle.ignore_changes = [value]  -> Terraform never overwrites the real value
#     an operator sets out-of-band, and re-plans stay clean.
# The real secret VALUES are populated after apply (AWS console or `aws ssm put-parameter
# --overwrite`), so no secret ever appears in this code or in version control.
#
# The ECS task definitions reference these parameters by ARN (see ecs.tf) and inject them
# as container environment variables at runtime. The DB master password is NOT here — it
# is managed directly by RDS in Secrets Manager (see rds.tf).

locals {
  # Map of ENV_VAR_NAME => SSM parameter name. These mirror the backend's expected env
  # var names (verified against backend/.env: JWT, mailer, and Monnify provider keys).
  app_secret_params = {
    JWT_SECRET             = "/${var.project}/${var.environment}/JWT_SECRET"
    MAIL_PASSWORD          = "/${var.project}/${var.environment}/MAIL_PASSWORD"
    MONNIFY_API_KEY        = "/${var.project}/${var.environment}/MONNIFY_API_KEY"
    MONNIFY_SECRET_KEY     = "/${var.project}/${var.environment}/MONNIFY_SECRET_KEY"
    MONNIFY_CONTRACT_CODE  = "/${var.project}/${var.environment}/MONNIFY_CONTRACT_CODE"
    # AI provider key (used when ai_provider = openai | anthropic). Harmless if unused.
    AI_API_KEY = "/${var.project}/${var.environment}/AI_API_KEY"
  }
}

resource "aws_ssm_parameter" "app_secret" {
  for_each = local.app_secret_params

  name        = each.value
  description = "${each.key} for ${local.name} (value set out-of-band; placeholder here)"
  type        = "SecureString"
  value       = "CHANGE_ME" # placeholder only — real value set after apply
  tags        = { Name = "${local.name}-${lower(each.key)}" }

  lifecycle {
    # Do not clobber the real value an operator sets in the console / via CLI.
    ignore_changes = [value]
  }
}
