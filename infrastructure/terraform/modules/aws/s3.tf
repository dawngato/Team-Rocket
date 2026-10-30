# AWS S3 Storage for Backup and Audit Archives
# Enforces WORM (Write Once Read Many) with Object Lock and distinct KMS encryption

resource "aws_s3_bucket" "identity_backups" {
  bucket        = "himvote-identity-backups-${var.environment}"
  force_destroy = false

  object_lock_configuration {
    object_lock_enabled = "Enabled"
  }

  tags = {
    Name   = "himvote-identity-backups"
    Domain = "identity"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "identity_backups" {
  bucket = aws_s3_bucket.identity_backups.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.identity_db.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket" "casting_backups" {
  bucket        = "himvote-casting-backups-${var.environment}"
  force_destroy = false

  object_lock_configuration {
    object_lock_enabled = "Enabled"
  }

  tags = {
    Name   = "himvote-casting-backups"
    Domain = "casting"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "casting_backups" {
  bucket = aws_s3_bucket.casting_backups.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.casting_db.arn
      sse_algorithm     = "aws:kms"
    }
  }
}
