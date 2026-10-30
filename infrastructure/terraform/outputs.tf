output "identity_db_endpoint" {
  description = "Endpoint for the identity database cluster"
  value       = var.cloud_provider == "aws" ? module.aws_infrastructure[0].identity_db_endpoint : module.gcp_infrastructure[0].identity_db_endpoint
}

output "casting_db_endpoint" {
  description = "Endpoint for the casting database cluster"
  value       = var.cloud_provider == "aws" ? module.aws_infrastructure[0].casting_db_endpoint : module.gcp_infrastructure[0].casting_db_endpoint
}

output "kms_issuer_key_arn" {
  description = "Identifier for the blind credential issuer KMS key"
  value       = var.cloud_provider == "aws" ? module.aws_infrastructure[0].kms_issuer_key_arn : module.gcp_infrastructure[0].kms_issuer_key_id
}

output "kms_witness_key_arn" {
  description = "Identifier for the witness signing KMS key"
  value       = var.cloud_provider == "aws" ? module.aws_infrastructure[0].kms_witness_key_arn : module.gcp_infrastructure[0].kms_witness_key_id
}

output "waf_web_acl_id" {
  description = "Web Application Firewall ACL identifier"
  value       = var.cloud_provider == "aws" ? module.aws_infrastructure[0].waf_web_acl_id : module.gcp_infrastructure[0].cloud_armor_policy_id
}
