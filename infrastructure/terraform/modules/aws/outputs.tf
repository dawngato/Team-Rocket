output "identity_db_endpoint" {
  value = aws_db_instance.identity_db.endpoint
}

output "casting_db_endpoint" {
  value = aws_db_instance.casting_db.endpoint
}

output "kms_issuer_key_arn" {
  value = aws_kms_key.issuer.arn
}

output "kms_witness_key_arn" {
  value = aws_kms_key.witness.arn
}

output "waf_web_acl_id" {
  value = aws_wafv2_web_acl.main.arn
}
