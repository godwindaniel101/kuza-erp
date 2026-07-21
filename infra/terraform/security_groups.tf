# security_groups.tf
# Least-privilege security groups. Traffic is only allowed between the specific tiers
# that need to talk to each other:
#   internet -> ALB (80/443)
#   ALB      -> backend (4001) and frontend (3000)
#   backend  -> RDS (5432) and EFS (2049)

# --- ALB: public ingress on HTTP (and HTTPS when a cert is configured) ---
resource "aws_security_group" "alb" {
  name        = "${local.name}-alb-sg"
  description = "ALB: allow inbound web traffic from the internet"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP from anywhere"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS from anywhere"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "All outbound (to reach ECS targets)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${local.name}-alb-sg" }
}

# --- Backend service: only the ALB may reach the app port ---
resource "aws_security_group" "backend" {
  name        = "${local.name}-backend-sg"
  description = "Backend ECS tasks: allow app port from ALB only"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "App port from ALB"
    from_port       = var.backend_container_port
    to_port         = var.backend_container_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    description = "All outbound (RDS, EFS, ECR, SMTP, provider APIs)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${local.name}-backend-sg" }
}

# --- Frontend service: only the ALB may reach the app port ---
resource "aws_security_group" "frontend" {
  name        = "${local.name}-frontend-sg"
  description = "Frontend ECS tasks: allow app port from ALB only"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "App port from ALB"
    from_port       = var.frontend_container_port
    to_port         = var.frontend_container_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    description = "All outbound (ECR pulls, SSR calls)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${local.name}-frontend-sg" }
}

# --- RDS: only the backend service may reach Postgres ---
resource "aws_security_group" "rds" {
  name        = "${local.name}-rds-sg"
  description = "RDS PostgreSQL: allow 5432 from backend only"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "PostgreSQL from backend"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.backend.id]
  }

  # No egress rules needed for a DB; omit to keep it locked down.

  tags = { Name = "${local.name}-rds-sg" }
}

# --- EFS: only the backend service may mount (NFS 2049) ---
resource "aws_security_group" "efs" {
  name        = "${local.name}-efs-sg"
  description = "EFS mount targets: allow NFS from backend only"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "NFS from backend"
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [aws_security_group.backend.id]
  }

  tags = { Name = "${local.name}-efs-sg" }
}
