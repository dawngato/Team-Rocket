module "aws_infrastructure" {
  count  = var.cloud_provider == "aws" ? 1 : 0
  source = "./modules/aws"

  environment          = var.environment
  aws_region           = var.aws_region
  db_instance_class    = var.db_instance_class
  db_allocated_storage = var.db_allocated_storage
}

module "gcp_infrastructure" {
  count  = var.cloud_provider == "gcp" ? 1 : 0
  source = "./modules/gcp"

  environment = var.environment
  gcp_project = var.gcp_project
  gcp_region  = var.gcp_region
}
