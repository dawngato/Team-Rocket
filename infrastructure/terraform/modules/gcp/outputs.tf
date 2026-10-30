output "identity_db_endpoint" {
  value = google_sql_database_instance.identity_db.private_ip_address
}

output "casting_db_endpoint" {
  value = google_sql_database_instance.casting_db.private_ip_address
}

output "kms_issuer_key_id" {
  value = google_kms_crypto_key.issuer_key.id
}

output "kms_witness_key_id" {
  value = google_kms_crypto_key.witness_key.id
}

output "cloud_armor_policy_id" {
  value = google_compute_security_policy.edge_armor.id
}
