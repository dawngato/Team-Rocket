# AWS Isolated Network Topology
# Two completely separated VPCs for Identity and Casting domains
# Absolutely no peering or transit gateway attachment between them

# Availability zones data source
data "aws_availability_zones" "available" {
  state = "available"
}

# =========================================================================
# VPC 1: Identity VPC
# =========================================================================
resource "aws_vpc" "identity" {
  cidr_block           = "10.100.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "himvote-identity-vpc-${var.environment}"
    Environment = var.environment
    Domain      = "identity"
  }
}

resource "aws_subnet" "identity_private_a" {
  vpc_id            = aws_vpc.identity.id
  cidr_block        = "10.100.1.0/24"
  availability_zone = data.aws_availability_zones.available.names[0]

  tags = {
    Name   = "himvote-identity-private-a"
    Domain = "identity"
  }
}

resource "aws_subnet" "identity_private_b" {
  vpc_id            = aws_vpc.identity.id
  cidr_block        = "10.100.2.0/24"
  availability_zone = data.aws_availability_zones.available.names[1]

  tags = {
    Name   = "himvote-identity-private-b"
    Domain = "identity"
  }
}

resource "aws_db_subnet_group" "identity" {
  name       = "himvote-identity-db-subnets-${var.environment}"
  subnet_ids = [aws_subnet.identity_private_a.id, aws_subnet.identity_private_b.id]

  tags = {
    Name   = "himvote-identity-db-subnet-group"
    Domain = "identity"
  }
}

# =========================================================================
# VPC 2: Casting VPC
# =========================================================================
resource "aws_vpc" "casting" {
  cidr_block           = "10.200.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "himvote-casting-vpc-${var.environment}"
    Environment = var.environment
    Domain      = "casting"
  }
}

resource "aws_subnet" "casting_private_a" {
  vpc_id            = aws_vpc.casting.id
  cidr_block        = "10.200.1.0/24"
  availability_zone = data.aws_availability_zones.available.names[0]

  tags = {
    Name   = "himvote-casting-private-a"
    Domain = "casting"
  }
}

resource "aws_subnet" "casting_private_b" {
  vpc_id            = aws_vpc.casting.id
  cidr_block        = "10.200.2.0/24"
  availability_zone = data.aws_availability_zones.available.names[1]

  tags = {
    Name   = "himvote-casting-private-b"
    Domain = "casting"
  }
}

resource "aws_db_subnet_group" "casting" {
  name       = "himvote-casting-db-subnets-${var.environment}"
  subnet_ids = [aws_subnet.casting_private_a.id, aws_subnet.casting_private_b.id]

  tags = {
    Name   = "himvote-casting-db-subnet-group"
    Domain = "casting"
  }
}
