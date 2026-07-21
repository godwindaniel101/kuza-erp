# efs.tf
# Persistent storage for the backend's /uploads directory (product images served at
# /uploads/*). ECS Fargate tasks are ephemeral, so uploads MUST live on shared, durable
# storage. EFS is the natural fit: it can be mounted read-write by every backend task
# simultaneously across AZs.
#
# S3 alternative: the app could instead store uploads in an S3 bucket and serve them via
# CloudFront / presigned URLs. That is more scalable and cheaper, but requires APPLICATION
# changes (the backend currently writes to a local ./uploads dir via useStaticAssets).
# EFS is chosen here because it needs zero code changes.

resource "aws_efs_file_system" "uploads" {
  creation_token = "${local.name}-uploads"
  encrypted      = true

  # Move rarely-accessed files to Infrequent Access to save cost.
  lifecycle_policy {
    transition_to_ia = "AFTER_30_DAYS"
  }

  tags = { Name = "${local.name}-uploads" }
}

# One mount target per AZ (in the private subnets), reachable from the backend SG only.
resource "aws_efs_mount_target" "uploads" {
  count           = var.az_count
  file_system_id  = aws_efs_file_system.uploads.id
  subnet_id       = aws_subnet.private[count.index].id
  security_groups = [aws_security_group.efs.id]
}

# Access point pins the mount to /uploads with root ownership. The backend container runs
# as root (no USER in backend/Dockerfile) and writes to /app/uploads, so uid/gid 0 is
# correct here.
resource "aws_efs_access_point" "uploads" {
  file_system_id = aws_efs_file_system.uploads.id

  posix_user {
    uid = 0
    gid = 0
  }

  root_directory {
    path = "/uploads"
    creation_info {
      owner_uid   = 0
      owner_gid   = 0
      permissions = "0755"
    }
  }

  tags = { Name = "${local.name}-uploads-ap" }
}
