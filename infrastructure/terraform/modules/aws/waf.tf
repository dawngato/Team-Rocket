# AWS WAFv2 Web ACL Configuration
# Protects dual public origins with rate limiting, AWS managed rules, and DDoS protection

resource "aws_wafv2_web_acl" "main" {
  name        = "himvote-waf-${var.environment}"
  description = "Production WAF protecting HimVote Edge endpoints"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  # Rate limiting rule: maximum 500 requests per 5 minutes per IP
  rule {
    name     = "RateLimitPerIP"
    priority = 10

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 500
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "HimVoteRateLimitRule"
      sampled_requests_enabled   = true
    }
  }

  # AWS Managed Core Rule Set
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 20

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "HimVoteCommonRules"
      sampled_requests_enabled   = true
    }
  }

  # AWS Managed Known Bad Inputs Rule Set
  rule {
    name     = "AWSManagedRulesKnownBadInputs"
    priority = 30

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "HimVoteKnownBadInputs"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "HimVoteWAFMetrics"
    sampled_requests_enabled   = true
  }

  tags = {
    Environment = var.environment
  }
}
