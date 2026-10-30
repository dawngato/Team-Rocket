# Google Cloud KMS Key Architecture
# Dedicated KeyRings and CryptoKeys for Identity and Casting Domains

resource "google_kms_key_ring" "identity" {
  name     = "himvote-identity-ring-${var.environment}"
  location = var.gcp_region
}

resource "google_kms_crypto_key" "identity_sql_cmek" {
  name     = "identity-sql-cmek"
  key_ring = google_kms_key_ring.identity.id
  purpose  = "ENCRYPT_DECRYPT"

  version_template {
    algorithm        = "GOOGLE_SYMMETRIC_ENCRYPTION"
    protection_level = "HSM"
  }
}

resource "google_kms_crypto_key" "issuer_key" {
  name     = "issuer-signing-key"
  key_ring = google_kms_key_ring.identity.id
  purpose  = "ASYMMETRIC_SIGN"

  version_template {
    algorithm        = "RSA_SIGN_PSS_2048_SHA256"
    protection_level = "HSM"
  }
}

resource "google_kms_key_ring" "casting" {
  name     = "himvote-casting-ring-${var.environment}"
  location = var.gcp_region
}

resource "google_kms_crypto_key" "casting_sql_cmek" {
  name     = "casting-sql-cmek"
  key_ring = google_kms_key_ring.casting.id
  purpose  = "ENCRYPT_DECRYPT"

  version_template {
    algorithm        = "GOOGLE_SYMMETRIC_ENCRYPTION"
    protection_level = "HSM"
  }
}

resource "google_kms_crypto_key" "witness_key" {
  name     = "witness-signing-key"
  key_ring = google_kms_key_ring.casting.id
  purpose  = "ASYMMETRIC_SIGN"

  version_template {
    algorithm        = "EC_SIGN_P256_SHA256"
    protection_level = "HSM"
  }
}
