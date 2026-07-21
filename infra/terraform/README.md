# Kuza ERP — AWS Terraform deployment

Production-baseline infrastructure for the Kuza ERP (NestJS backend + Next.js frontend,
multi-tenant Postgres) on **AWS ECS Fargate**.

## Architecture

```
                  Internet
                     │
              ┌──────▼──────┐   HTTP:80 (→ redirect to 443 if cert set)
              │     ALB     │   HTTPS:443 (when certificate_arn provided)
              └──────┬──────┘
        default ─────┤────── /api/*, /uploads/*
              ┌──────▼──────┐        ┌──────▼──────┐
              │  frontend   │        │   backend   │
              │  ECS :3000  │        │  ECS :4001  │
              │  (Next.js)  │        │  (NestJS)   │
              └─────────────┘        └──┬───────┬──┘
                                        │       │
                             ┌──────────▼─┐  ┌──▼───────────┐
                             │ RDS Postgres│  │ EFS /uploads │
                             │  (private)  │  │ (persistent) │
                             └─────────────┘  └──────────────┘
```

- **VPC** with public + private subnets across 2 AZs, one IGW, NAT gateway(s) for private
  egress, and per-tier security groups (ALB→services, backend→RDS, backend→EFS).
- **ECR** repositories for the backend and frontend images.
- **RDS PostgreSQL** in private subnets, not publicly accessible, storage encrypted.
  Master password is **RDS-managed in Secrets Manager** (never in Terraform state).
- **ECS Fargate** cluster, two services + task definitions. Config is injected as plain
  env vars (non-secret) and `secrets` (SSM / Secrets Manager ARNs).
- **ALB** routes `default → frontend` and `/api/*`, `/uploads/*` → backend.
- **EFS** mounted at the backend's `/app/uploads` so product images survive task
  restarts. (An S3-based alternative is discussed in `efs.tf` — it needs app changes.)

## File map

| File                    | Contents                                                    |
|-------------------------|-------------------------------------------------------------|
| `versions.tf`           | Terraform + provider version pins, (commented) S3 backend   |
| `providers.tf`          | AWS provider, default tags                                   |
| `variables.tf`          | All inputs, with defaults + descriptions                    |
| `network.tf`            | VPC, subnets, IGW, NAT, routes, shared locals               |
| `security_groups.tf`    | ALB / backend / frontend / RDS / EFS SGs                    |
| `ecr.tf`                | ECR repos + lifecycle policies                              |
| `rds.tf`                | RDS Postgres + subnet group                                 |
| `secrets.tf`            | SSM SecureString parameters (placeholder values)           |
| `efs.tf`                | EFS file system, mount targets, access point                |
| `iam.tf`                | ECS execution + task roles (least privilege)               |
| `alb.tf`                | ALB, target groups, listeners, path rules                  |
| `ecs.tf`                | Cluster, log groups, task definitions, services            |
| `outputs.tf`            | ALB DNS, ECR URLs, RDS endpoint, secret names              |
| `terraform.tfvars.example` | Non-secret example values                               |

## Prerequisites

- Terraform >= 1.5, AWS CLI, and Docker.
- AWS credentials via the standard chain (env vars, `~/.aws`, or an assumed role) with
  permissions to create the resources above.
- (Optional) An ACM certificate in the deployment region for HTTPS, and a domain.

## Deploy

### 1. Configure

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars (region, sizing, optional certificate_arn / domain_name)
```

### 2. Create the ECR repos first (so you can push images)

The ECS services won't become healthy until images exist in ECR. Apply just the repos
first, push, then apply the rest:

```bash
terraform init
terraform apply -target=aws_ecr_repository.backend -target=aws_ecr_repository.frontend
```

### 3. Build & push images

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=us-east-1   # match var.region
REPO=$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com

aws ecr get-login-password --region $REGION \
  | docker login --username AWS --password-stdin $REPO

# Backend (repo root context: ../../backend)
docker build -t $REPO/kuza-erp-prod-backend:latest ../../backend
docker push  $REPO/kuza-erp-prod-backend:latest

# Frontend (Next.js standalone build)
docker build -t $REPO/kuza-erp-prod-frontend:latest ../../frontend
docker push  $REPO/kuza-erp-prod-frontend:latest
```

> Repo names follow `${project}-${environment}-{backend|frontend}`. If you change
> `project`/`environment`, update the tags above (or read them from
> `terraform output ecr_backend_repository_url` / `ecr_frontend_repository_url`).

### 4. Apply everything

```bash
terraform plan
terraform apply
```

### 5. Populate the real secret values (one-time, out-of-band)

Terraform creates the SSM SecureString parameters with a `CHANGE_ME` placeholder and then
**ignores their value** on future plans. Set the real values after the first apply:

```bash
for NAME in $(terraform output -json app_secret_parameter_names | jq -r '.[]'); do
  echo "Set a value for $NAME"
done

aws ssm put-parameter --overwrite --type SecureString \
  --name /kuza-erp/prod/JWT_SECRET --value 'your-real-jwt-secret'
# ...repeat for MAIL_PASSWORD, MONNIFY_API_KEY, MONNIFY_SECRET_KEY,
#    MONNIFY_CONTRACT_CODE, AI_API_KEY
```

Then force a new deployment so tasks pick up the values:

```bash
aws ecs update-service --cluster $(terraform output -raw ecs_cluster_name) \
  --service kuza-erp-prod-backend --force-new-deployment
```

### 6. Point DNS

Create a CNAME/ALIAS from your domain to `terraform output alb_dns_name`. If you set
`certificate_arn` + `domain_name`, HTTPS is served and HTTP redirects to it.

## Supplying secrets — where each secret lives

| Secret                         | Source                                             |
|--------------------------------|----------------------------------------------------|
| DB master password             | **RDS-managed** in Secrets Manager (auto-generated) |
| `JWT_SECRET`                   | SSM SecureString `/${project}/${env}/JWT_SECRET`   |
| `MAIL_PASSWORD`                | SSM SecureString                                    |
| `MONNIFY_API_KEY` / `_SECRET_KEY` / `_CONTRACT_CODE` | SSM SecureString              |
| `AI_API_KEY` (openai/anthropic)| SSM SecureString                                    |

No secret value is ever written in this Terraform code. The DB password never touches
Terraform state; SSM parameters hold only the `CHANGE_ME` placeholder in state until an
operator overwrites the real value out-of-band.

## Databases & migrations (important)

- Terraform creates the **`erp_landlord`** database as the RDS initial database.
- The **`erp_db`** tenant database and all **per-tenant schemas** are created by the
  **backend on boot** (schema-per-tenant multi-tenancy) — Terraform does *not* create
  them. The backend connects with the master user (which can create databases/schemas)
  and runs its migrations/bootstrap on startup, which is why the backend service has a
  120s health-check grace period.

## Cost / HA notes

- Default `single_nat_gateway = true` uses one NAT (cheaper, single-AZ egress). Set to
  `false` for one-per-AZ.
- Default `db_multi_az = false`. Set to `true` for production high availability.
- `db_deletion_protection = true` and `skip_final_snapshot = false` guard the database.
```
