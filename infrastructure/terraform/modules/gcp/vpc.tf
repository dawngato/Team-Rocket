# GCP Isolated VPC Networks
# Two completely separated Virtual Private Clouds for Identity and Casting

# =========================================================================
# VPC 1: Identity VPC Network
# =========================================================================
resource "google_compute_network" "identity" {
  name                    = "himvote-identity-net-${var.environment}"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "identity" {
  name          = "himvote-identity-sub-${var.environment}"
  ip_cidr_range = "10.100.0.0/16"
  region        = var.gcp_region
  network       = google_compute_network.identity.id
}

resource "google_compute_global_address" "identity_private_ip" {
  name          = "himvote-identity-private-ip"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.identity.id
}

resource "google_service_networking_connection" "identity_private_vpc" {
  network                 = google_compute_network.identity.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.identity_private_ip.name]
}

# =========================================================================
# VPC 2: Casting VPC Network
# =========================================================================
resource "google_compute_network" "casting" {
  name                    = "himvote-casting-net-${var.environment}"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "casting" {
  name          = "himvote-casting-sub-${var.environment}"
  ip_cidr_range = "10.200.0.0/16"
  region        = var.gcp_region
  network       = google_compute_network.casting.id
}

resource "google_compute_global_address" "casting_private_ip" {
  name          = "himvote-casting-private-ip"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.casting.id
}

resource "google_service_networking_connection" "casting_private_vpc" {
  network                 = google_compute_network.casting.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.casting_private_ip.name]
}
