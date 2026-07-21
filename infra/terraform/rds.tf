# rds.tf
# PostgreSQL on RDS, in private subnets, not publicly accessible.
#
# Databases:
#   - erp_landlord : created HERE as the RDS initial database (db_name).
#   - erp_db       : the tenant database, plus all per-tenant schemas, are created by the
#                    BACKEND on boot (schema-per-tenant multi-tenancy). We deliberately do
#                    NOT create erp_db in Terraform — the app owns that lifecycle.
#
# Master password: managed by RDS in AWS Secrets Manager (manage_master_user_password).
# This keeps the DB password OUT of Terraform state entirely. The generated secret is a
# JSON blob {username, password}; the ECS backend task reads the `password` key from it
# (see ecs.tf / secrets.tf).

resource "aws_db_subnet_group" "main" {
  name       = "${local.name}-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id
  tags       = { Name = "${local.name}-db-subnet-group" }
}

resource "aws_db_instance" "main" {
  identifier     = "${local.name}-postgres"
  engine         = "postgres"
  engine_version = var.db_engine_version
  instance_class = var.db_instance_class

  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true

  # Initial database = the landlord DB. The app creates erp_db + tenant schemas on boot.
  db_name  = var.db_landlord_name
  username = var.db_username

  # RDS generates and rotates the master password into Secrets Manager; nothing sensitive
  # touches Terraform state or this code.
  manage_master_user_password = true

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  multi_az               = var.db_multi_az

  backup_retention_period = 7
  copy_tags_to_snapshot   = true
  deletion_protection     = var.db_deletion_protection
  skip_final_snapshot     = false
  final_snapshot_identifier = "${local.name}-postgres-final"

  auto_minor_version_upgrade = true
  apply_immediately          = false

  tags = { Name = "${local.name}-postgres" }
}
