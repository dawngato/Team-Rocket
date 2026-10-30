# HimVote System Documentation Suite

This directory contains the complete technical architecture, security analysis, cryptographic reviews, and verification documentation for the HimVote platform.

```text
Documentation Index:

1. Threat Model and Security Architecture
   * File: docs/threat_model.md
   * Description: Analysis of threat actors, attack vectors, trust domains, and mitigations.

2. Cryptographic and Operational Assumptions
   * File: docs/security_assumptions.md
   * Description: Hardness foundations, non collusion requirements, and graceful degradation boundaries.

3. System Data Flows and Architecture
   * File: docs/data_flows.md
   * Description: Detailed topology of dual database origins, RFC 9474 blind issuance, casting, Merkle logging, and blockchain anchoring.

4. Cryptographic Voting Engine Review
   * File: docs/crypto_engine_review.md
   * Description: Development engine review. Profile VEEM remains a stand in and no external engine adoption is claimed.

5. Privacy Limitations and Security Boundaries
   * File: docs/privacy_limitations.md
   * Description: Transparent technical definition of what the platform solves and what it explicitly does not solve.

6. Automated Security and Integrity Test Results
   * File: docs/test_results.md
   * Description: Verification evidence matrix for tests Q7_01 through Q7_05, protocol tests, and governance tests.

7. Cryptographic Key Management Architecture
   * File: docs/key_management.md
   * Description: Key lifecycles, HSM and Cloud KMS operations, trustee ceremonies, and out of band trust pin distribution.

8. Independent Multi Organization Witness Deployment Guide
   * File: docs/witness_deployment_guide.md
   * Description: Operational setup and verification guide for external partner institutions operating witness nodes.

9. Local Development Runbook
   * File: docs/runbook_local.md
   * Description: Local container setup, development endpoints, and end to end election walkthrough.

10. Accessibility Statement and WCAG 2.2 AA Breakdown
    * File: docs/accessibility_statement.md
    * Description: Complete accessibility compliance breakdown across Web, Android, iOS, and Windows clients.

11. Production Readiness Gate and Sign Off Protocol
    * File: docs/production_readiness_gate.md
    * Description: Eleven item mandatory verification checklist required before opening live elections.

12. Architecture Decision Records (ADRs)
    * Directory: docs/adr/
    * Description: Architectural decisions covering engine selection, dual databases, blind credentials, Merkle logging, and offline verification.
```
