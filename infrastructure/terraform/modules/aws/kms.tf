# AWS KMS Key Management Architecture
# Distinct dedicated cryptographic keys per operational role and security domain

resource "aws_kms_key" "identity_db" {
  description             = "KMS Key for HimVote Identity Database Storage Encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Name   = "himvote-kms-identity-db-${var.environment}"
    Domain = "identity"
  }
}

resource "aws_kms_alias" "identity_db" {
  name          = "alias/himvote-identity-db-${var.environment}"
  target_key_id = aws_kms_key.identity_db.key_id
}

resource "aws_kms_key" "casting_db" {
  description             = "KMS Key for HimVote Casting Database Storage Encryption"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  tags = {
    Name   = "himvote-kms-casting-db-${var.environment}"
    Domain = "casting"
  }
}

resource "aws_kms_alias" "casting_db" {
  name          = "alias/himvote-casting-db-${var.environment}"
  target_key_id = aws_kms_key.casting_db.key_id
}

resource "aws_kms_key" "issuer" {
  description              = "KMS Key for Blind Credential Issuer Asymmetric Signing"
  customer_master_key_spec = "RSA_2048"
  key_usage                = "SIGN_VERIFY"
  deletion_window_in_days  = 30

  tags = {
    Name   = "himvote-kms-issuer-${var.environment}"
    Domain = "identity"
  }
}

resource "aws_kms_alias" "issuer" {
  name          = "alias/himvote-issuer-${var.environment}"
  target_key_id = aws_kms_key.issuer.key_id
}

resource "aws_kms_key" "witness" {
  description              = "KMS Key for Witness Checkpoint Signing"
  customer_master_key_spec = "ECC_NIST_P256"
  key_usage                = "SIGN_VERIFY"
  deletion_window_in_days  = 30

  tags = {
    Name   = "himvote-kms-witness-${var.environment}"
    Domain = "witness"
  }
}

resource "aws_kms_alias" "witness" {
  name          = "alias/himvote-witness-${var.environment}"
  target_key_id = aws_kms_key.witness.key_id
}

resource "aws_kms_key" "relayer" {
  description              = "KMS Key for Blockchain Anchor Relayer Transaction Signing"
  customer_master_key_spec = "ECC_SECG_P256K1"
  key_usage                = "SIGN_VERIFY"
  deletion_window_in_days  = 30

  tags = {
    Name   = "himvote-kms-relayer-${var.environment}"
    Domain = "chain"
  }
}

resource "aws_kms_alias" "relayer" {
  name          = "alias/himvote-relayer-${var.environment}"
  target_key_id = aws_kms_key.relayer.key_id
}
