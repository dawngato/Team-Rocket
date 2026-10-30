# Google Cloud SQL PostgreSQL 16 Instances
# Two independent clusters for Identity and Casting

resource "random_password" "identity_db_password" {
  length  = 32
  special = false
}

resource "random_password" "casting_db_password" {
  length  = 32
  special = false
}

# Identity Cloud SQL Instance
resource "google_sql_database_instance" "identity_db" {
  name             = "himvote-identity-sql-${var.environment}"
  database_version = "POSTGRES_16"
  region           = var.gcp_region
  encryption_key_name = google_kms_crypto_key.identity_sql_cmek.id

  depends_on = [google_service_networking_connection.identity_private_vpc]

  settings {
    tier              = "db-custom-4-16384"
    availability_type = "REGIONAL"
    disk_size         = 100
    disk_type         = "PD_SSD"

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.identity.id
      ssl_mode        = "TRUSTED_CLIENT_CERTIFICATE_REQUIRED"
    }

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      start_time                     = "03:00"
    }

    database_flags {
      name  = "password_encryption"
      value = "scram-sha-256"
    }
  }

  deletion_protection = true
}

resource "google_sql_database" "identity_db" {
  name     = "himvote_identity"
  instance = google_sql_database_instance.identity_db.name
}

# Casting Cloud SQL Instance
resource "google_sql_database_instance" "casting_db" {
  name             = "himvote-casting-sql-${var.environment}"
  database_version = "POSTGRES_16"
  region           = var.gcp_region
  encryption_key_name = google_kms_crypto_key.casting_sql_cmek.id

  depends_on = [google_service_networking_connection.casting_private_vpc]

  settings {
    tier              = "db-custom-4-16384"
    availability_type = "REGIONAL"
    disk_size         = 100
    disk_type         = "PD_SSD"

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.casting.id
      ssl_mode        = "TRUSTED_CLIENT_CERTIFICATE_REQUIRED"
    }

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      start_time                     = "03:00"
    }

    database_flags {
      name  = "password_encryption"
      value = "scram-sha-256"
    }
  }

  deletion_protection = true
}

resource "google_sql_database" "casting_db" {
  name     = "himvote_casting"
  instance = google_sql_database_instance.casting_db.name
}
