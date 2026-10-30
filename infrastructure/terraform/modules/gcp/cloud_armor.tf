# Google Cloud Armor Security Policy (WAF)
# Implements rate limiting and preconfigured OWASP rules

resource "google_compute_security_policy" "edge_armor" {
  name        = "himvote-edge-armor-${var.environment}"
  description = "Production Cloud Armor policy for HimVote Edge endpoints"

  # Rate limiting rule: max 500 requests per 5 minutes per IP
  rule {
    action   = "rate_based_ban"
    priority = 1000
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    rate_limit_options {
      conform_action = "allow"
      exceed_action  = "deny(429)"
      rate_limit_threshold {
        count        = 500
        interval_sec = 300
      }
      ban_duration_sec = 600
    }
    description = "Rate limit per client IP"
  }

  # Preconfigured SQL injection rule
  rule {
    action   = "deny(403)"
    priority = 2000
    match {
      expr {
        expression = "evaluatePreconfiguredExpr('sqli-v33-stable')"
      }
    }
    description = "OWASP SQL Injection prevention"
  }

  # Preconfigured XSS rule
  rule {
    action   = "deny(403)"
    priority = 3000
    match {
      expr {
        expression = "evaluatePreconfiguredExpr('xss-v33-stable')"
      }
    }
    description = "OWASP Cross Site Scripting prevention"
  }

  # Default allow rule
  rule {
    action   = "allow"
    priority = 2147483647
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    description = "Default allow rule"
  }
}
