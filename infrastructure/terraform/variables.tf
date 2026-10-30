variable "cloud_provider" {
  description = "Target cloud provider for infrastructure provisioning (aws or gcp)"
  type        = string
  default     = "aws"
  validation {
    condition     = contains(["aws", "gcp"], var.cloud_provider)
    error_message = "The cloud_provider must be either aws or gcp."
  }
}

variable "environment" {
  description = "Deployment environment name"
  type        = string
  default     = "production"
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "gcp_project" {
  description = "GCP project ID"
  type        = string
  default     = "himvote-production"
}

variable "gcp_region" {
  description = "GCP region for resources"
  type        = string
  default     = "us-central1"
}

variable "db_instance_class" {
  description = "Database instance compute size"
  type        = string
  default     = "db.r6g.large"
}

variable "db_allocated_storage" {
  description = "Allocated storage in gigabytes for databases"
  type        = number
  default     = 100
}
