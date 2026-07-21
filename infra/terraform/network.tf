# network.tf
# VPC with public + private subnets across N AZs, IGW, NAT, and route tables.
# Layout per AZ:
#   - 1 public subnet  (ALB, NAT gateways)
#   - 1 private subnet (ECS tasks, RDS, EFS mount targets)

locals {
  name = "${var.project}-${var.environment}"

  # Deterministic /24 subnet carving from the VPC /16.
  # Public subnets:  10.0.0.0/24, 10.0.1.0/24, ...
  # Private subnets: 10.0.10.0/24, 10.0.11.0/24, ...
  public_subnet_cidrs  = [for i in range(var.az_count) : cidrsubnet(var.vpc_cidr, 8, i)]
  private_subnet_cidrs = [for i in range(var.az_count) : cidrsubnet(var.vpc_cidr, 8, i + 10)]

  nat_gateway_count = var.single_nat_gateway ? 1 : var.az_count

  # Public base URL injected into containers. Prefer the real domain (with HTTPS when a
  # cert is configured); fall back to the ALB DNS name for a quick, cert-less bring-up.
  public_scheme = var.certificate_arn != "" ? "https" : "http"
  public_host   = var.domain_name != "" ? var.domain_name : aws_lb.main.dns_name
  public_url    = "${local.public_scheme}://${local.public_host}"
}

# Pick the first `az_count` AZs available in the region.
data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "${local.name}-vpc" }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${local.name}-igw" }
}

# ---------------------------------------------------------------------------
# Subnets
# ---------------------------------------------------------------------------
resource "aws_subnet" "public" {
  count                   = var.az_count
  vpc_id                  = aws_vpc.main.id
  cidr_block              = local.public_subnet_cidrs[count.index]
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "${local.name}-public-${count.index}"
    Tier = "public"
  }
}

resource "aws_subnet" "private" {
  count             = var.az_count
  vpc_id            = aws_vpc.main.id
  cidr_block        = local.private_subnet_cidrs[count.index]
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "${local.name}-private-${count.index}"
    Tier = "private"
  }
}

# ---------------------------------------------------------------------------
# NAT gateways (for private subnet egress: ECR pulls, package installs, SMTP, etc.)
# ---------------------------------------------------------------------------
resource "aws_eip" "nat" {
  count      = local.nat_gateway_count
  domain     = "vpc"
  depends_on = [aws_internet_gateway.main]

  tags = { Name = "${local.name}-nat-eip-${count.index}" }
}

resource "aws_nat_gateway" "main" {
  count         = local.nat_gateway_count
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
  depends_on    = [aws_internet_gateway.main]

  tags = { Name = "${local.name}-nat-${count.index}" }
}

# ---------------------------------------------------------------------------
# Route tables
# ---------------------------------------------------------------------------
# Single public route table: default route -> IGW.
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${local.name}-public-rt" }
}

resource "aws_route" "public_internet" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.main.id
}

resource "aws_route_table_association" "public" {
  count          = var.az_count
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# One private route table per AZ so each can point at its own (or the shared) NAT.
resource "aws_route_table" "private" {
  count  = var.az_count
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${local.name}-private-rt-${count.index}" }
}

resource "aws_route" "private_nat" {
  count                  = var.az_count
  route_table_id         = aws_route_table.private[count.index].id
  destination_cidr_block = "0.0.0.0/0"
  # With a single NAT gateway, every private RT points at NAT #0.
  nat_gateway_id = aws_nat_gateway.main[var.single_nat_gateway ? 0 : count.index].id
}

resource "aws_route_table_association" "private" {
  count          = var.az_count
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}
