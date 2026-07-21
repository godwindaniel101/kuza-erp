# versions.tf
# Pin Terraform and provider versions so plans are reproducible across machines/CI.
# Using pessimistic ("~>") constraints: allow patch/minor updates, block breaking majors.

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # ---------------------------------------------------------------------------
  # Remote state (recommended for a shared/prod deployment).
  # Left commented so `terraform init` works out-of-the-box with local state.
  # Uncomment and fill in an existing S3 bucket + DynamoDB lock table before
  # collaborating. State can contain sensitive values, so the bucket MUST be
  # private and encrypted.
  # ---------------------------------------------------------------------------
  # backend "s3" {
  #   bucket         = "kuza-erp-tfstate"
  #   key            = "prod/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "kuza-erp-tflock"
  #   encrypt        = true
  # }
}
