# infra/

Infrastructure-as-code for Kuza ERP.

- [`terraform/`](./terraform) — AWS ECS Fargate production deployment (VPC, ALB, ECS,
  RDS PostgreSQL, EFS, ECR, secrets). See [`terraform/README.md`](./terraform/README.md)
  for architecture and step-by-step deploy instructions.

For **local development** use the repo-root `docker-compose.yml` instead.
