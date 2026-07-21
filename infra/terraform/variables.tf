# variables.tf
# All inputs are declared here with sensible defaults and descriptions. Nothing secret
# lives in this file; real secret VALUES are supplied out-of-band (see secrets.tf and
# the README).

# ---------------------------------------------------------------------------
# Core / naming
# ---------------------------------------------------------------------------
variable "region" {
  description = "AWS region to deploy into."
  type        = string
  default     = "us-east-1"
}

variable "project" {
  description = "Project name. Used as a prefix for resource names and tags."
  type        = string
  default     = "kuza-erp"
}

variable "environment" {
  description = "Deployment environment (e.g. prod, staging). Used in names and tags."
  type        = string
  default     = "prod"
}

# ---------------------------------------------------------------------------
# Networking
# ---------------------------------------------------------------------------
variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "az_count" {
  description = "Number of Availability Zones to spread subnets across."
  type        = number
  default     = 2
}

variable "single_nat_gateway" {
  description = <<-EOT
    If true (default), provision ONE NAT gateway shared by all private subnets to save
    cost. Set to false for one NAT gateway per AZ (higher availability, higher cost).
  EOT
  type        = bool
  default     = true
}

# ---------------------------------------------------------------------------
# Container images
# ---------------------------------------------------------------------------
variable "backend_image_tag" {
  description = "Image tag for the backend container in ECR."
  type        = string
  default     = "latest"
}

variable "frontend_image_tag" {
  description = "Image tag for the frontend container in ECR."
  type        = string
  default     = "latest"
}

variable "backend_container_port" {
  description = "Port the NestJS backend listens on."
  type        = number
  default     = 4001
}

variable "frontend_container_port" {
  description = "Port the Next.js frontend listens on."
  type        = number
  default     = 3000
}

# ---------------------------------------------------------------------------
# ECS sizing
# ---------------------------------------------------------------------------
variable "backend_cpu" {
  description = "Fargate CPU units for the backend task (1024 = 1 vCPU)."
  type        = number
  default     = 512
}

variable "backend_memory" {
  description = "Fargate memory (MiB) for the backend task."
  type        = number
  default     = 1024
}

variable "frontend_cpu" {
  description = "Fargate CPU units for the frontend task (1024 = 1 vCPU)."
  type        = number
  default     = 256
}

variable "frontend_memory" {
  description = "Fargate memory (MiB) for the frontend task."
  type        = number
  default     = 512
}

variable "backend_desired_count" {
  description = "Number of backend tasks to run."
  type        = number
  default     = 2
}

variable "frontend_desired_count" {
  description = "Number of frontend tasks to run."
  type        = number
  default     = 2
}

# ---------------------------------------------------------------------------
# RDS (PostgreSQL)
# ---------------------------------------------------------------------------
variable "db_instance_class" {
  description = "RDS instance class."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_engine_version" {
  description = "PostgreSQL engine version."
  type        = string
  default     = "15.7"
}

variable "db_allocated_storage" {
  description = "Initial RDS storage in GiB."
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "Upper bound (GiB) for RDS storage autoscaling."
  type        = number
  default     = 100
}

variable "db_username" {
  description = <<-EOT
    Master DB username. The password is NOT set here — it is generated and managed by
    RDS in AWS Secrets Manager (manage_master_user_password), so no secret enters
    Terraform state.
  EOT
  type        = string
  default     = "erp_admin"
}

variable "db_landlord_name" {
  description = <<-EOT
    Initial database created by RDS. We create the LANDLORD database here; the tenant
    database (erp_db) and per-tenant schemas are created by the backend on boot.
  EOT
  type        = string
  default     = "erp_landlord"
}

variable "db_app_name" {
  description = "Tenant database name the app expects (created by the app, referenced via env)."
  type        = string
  default     = "erp_db"
}

variable "db_multi_az" {
  description = "Whether to run RDS in Multi-AZ mode (recommended for prod)."
  type        = bool
  default     = false
}

variable "db_deletion_protection" {
  description = "Protect the RDS instance from accidental deletion."
  type        = bool
  default     = true
}

# ---------------------------------------------------------------------------
# TLS / DNS (optional)
# ---------------------------------------------------------------------------
variable "certificate_arn" {
  description = <<-EOT
    ARN of an ACM certificate for the ALB. If set (non-empty), an HTTPS:443 listener is
    created and HTTP:80 redirects to it. If empty, only HTTP:80 is served.
  EOT
  type        = string
  default     = ""
}

variable "domain_name" {
  description = <<-EOT
    Public domain the app is served on (e.g. app.example.com). Used to build the public
    URLs injected into the containers. If empty, the ALB DNS name is used instead.
  EOT
  type        = string
  default     = ""
}

# ---------------------------------------------------------------------------
# Application config (non-secret)
# ---------------------------------------------------------------------------
variable "node_env" {
  description = "NODE_ENV value for the containers."
  type        = string
  default     = "production"
}

variable "ai_provider" {
  description = "AI_PROVIDER for the backend (ollama | openai | anthropic)."
  type        = string
  default     = "openai"
}

variable "log_retention_days" {
  description = "CloudWatch Logs retention for ECS task logs."
  type        = number
  default     = 30
}
