# Google Cloud Storage for Database Backups and Audit Logs
# Retains archives with WORM retention policy and KMS encryption

resource "google_storage_bucket" "identity_backups" {
  name          = "himvote-identity-backups-${var.environment}"
  location      = var.gcp_region
  force_destroy = false

  retention_policy {
    is_locked        = true
    retention_period = 31536000 # 1 year in seconds
  }

  encryption {
    default_kms_key_name = google_kms_crypto_key.identity_sql_cmek.id
  }
}

resource "google_storage_bucket" "casting_backups" {
  name          = "himvote-casting-backups-${var.environment}"
  location      = var.gcp_region
  force_destroy = false

  retention_policy {
    is_locked        = true
    retention_period = 31536000 # 1 year in seconds
  }

  encryption {
    default_kms_key_name = google_kms_crypto_key.casting_sql_cmek.id
  }
}
