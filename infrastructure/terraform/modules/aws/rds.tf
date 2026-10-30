# AWS RDS PostgreSQL 16 Clusters
# Two independent clusters for Identity and Casting with separate VPCs and KMS keys

resource "random_password" "identity_master_password" {
  length  = 32
  special = false
}

resource "random_password" "casting_master_password" {
  length  = 32
  special = false
}

# PostgreSQL 16 Parameter Group enforcing SCRAM SHA 256
resource "aws_db_parameter_group" "pg16" {
  name   = "himvote-pg16-params-${var.environment}"
  family = "postgres16"

  parameter {
    name  = "password_encryption"
    value = "scram-sha-256"
  }

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  tags = {
    Environment = var.environment
  }
}

# Identity PostgreSQL 16 Cluster
resource "aws_db_instance" "identity_db" {
  identifier                  = "himvote-identity-db-${var.environment}"
  engine                      = "postgres"
  engine_version              = "16.3"
  instance_class              = var.db_instance_class
  allocated_storage           = var.db_allocated_storage
  max_allocated_storage       = 500
  storage_type                = "gp3"
  storage_encrypted           = true
  kms_key_id                  = aws_kms_key.identity_db.arn
  db_name                     = "himvote_identity"
  username                    = "himvote_identity_admin"
  password                    = random_password.identity_master_password.result
  db_subnet_group_name        = aws_db_subnet_group.identity.name
  parameter_group_name        = aws_db_parameter_group.pg16.name
  multi_az                    = true
  publicly_accessible        = false
  backup_retention_period     = 35
  backup_window               = "03:00-04:00"
  maintenance_window          = "Mon:04:30-Mon:05:30"
  auto_minor_version_upgrade  = true
  deletion_protection         = true
  skip_final_snapshot         = false
  final_snapshot_identifier   = "himvote-identity-db-final-snapshot"

  tags = {
    Name   = "himvote-identity-db"
    Domain = "identity"
  }
}

# Casting PostgreSQL 16 Cluster
resource "aws_db_instance" "casting_db" {
  identifier                  = "himvote-casting-db-${var.environment}"
  engine                      = "postgres"
  engine_version              = "16.3"
  instance_class              = var.db_instance_class
  allocated_storage           = var.db_allocated_storage
  max_allocated_storage       = 500
  storage_type                = "gp3"
  storage_encrypted           = true
  kms_key_id                  = aws_kms_key.casting_db.arn
  db_name                     = "himvote_casting"
  username                    = "himvote_casting_admin"
  password                    = random_password.casting_master_password.result
  db_subnet_group_name        = aws_db_subnet_group.casting.name
  parameter_group_name        = aws_db_parameter_group.pg16.name
  multi_az                    = true
  publicly_accessible        = false
  backup_retention_period     = 35
  backup_window               = "03:00-04:00"
  maintenance_window          = "Mon:04:30-Mon:05:30"
  auto_minor_version_upgrade  = true
  deletion_protection         = true
  skip_final_snapshot         = false
  final_snapshot_identifier   = "himvote-casting-db-final-snapshot"

  tags = {
    Name   = "himvote-casting-db"
    Domain = "casting"
  }
}
