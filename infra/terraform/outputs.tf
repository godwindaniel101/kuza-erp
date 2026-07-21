# outputs.tf

output "alb_dns_name" {
  description = "Public DNS name of the Application Load Balancer. Point your domain's CNAME/ALIAS here."
  value       = aws_lb.main.dns_name
}

output "app_url" {
  description = "Base URL the app is served on (domain if set, otherwise ALB DNS)."
  value       = local.public_url
}

output "ecr_backend_repository_url" {
  description = "ECR repository URL for the backend image."
  value       = aws_ecr_repository.backend.repository_url
}

output "ecr_frontend_repository_url" {
  description = "ECR repository URL for the frontend image."
  value       = aws_ecr_repository.frontend.repository_url
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint (host:port). Reachable only from within the VPC."
  value       = aws_db_instance.main.endpoint
}

output "rds_master_user_secret_arn" {
  description = "ARN of the RDS-managed master credentials secret in Secrets Manager."
  value       = aws_db_instance.main.master_user_secret[0].secret_arn
}

output "app_secret_parameter_names" {
  description = "SSM parameter names to populate with real secret values after apply."
  value       = [for p in aws_ssm_parameter.app_secret : p.name]
}

output "ecs_cluster_name" {
  description = "ECS cluster name."
  value       = aws_ecs_cluster.main.name
}
