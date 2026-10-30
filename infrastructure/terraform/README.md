# Terraform Cloud Infrastructure Configurations

This directory contains Terraform modules for provisioning HimVote infrastructure on AWS and GCP.

## Key Architecture Capabilities
* Dual independent PostgreSQL 16 database clusters with separate VPCs and credentials
* Dedicated KMS keys with automatic annual rotation for storage encryption and asymmetric signing
* Web Application Firewall protection with rate limiting and managed threat rules
* Object Lock Write Once Read Many cloud storage for immutable database backups

## Module Layout
* versions.tf: Provider requirements and version constraints
* variables.tf: Root input variable definitions
* main.tf: Conditional cloud provider module dispatch
* outputs.tf: Resource outputs and database connection endpoints
* modules/aws/: AWS implementation using RDS, KMS, WAFv2, and S3
* modules/gcp/: GCP implementation using Cloud SQL, Cloud KMS, Cloud Armor, and GCS
