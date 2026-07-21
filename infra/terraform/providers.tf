# providers.tf
# AWS provider configuration. Region is variable-driven; credentials come from the
# standard AWS credential chain (env vars, shared config, or an assumed role) — never
# hardcode access keys here.

provider "aws" {
  region = var.region

  # Tag every taggable resource consistently. Makes cost allocation and cleanup easy.
  default_tags {
    tags = {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

provider "random" {}
