# HimVote Architecture Decision Records (ADRs)

This directory documents the core architectural decisions governing the HimVote institutional election platform.

```text
Architecture Decision Records Index:

1. ADR 001: Cryptographic Engine Selection and Profile VEEM Adoption
   * File: docs/adr/001_crypto_engine_selection.md
   * Status: Accepted
   * Summary: Selection of Profile VEEM over Belenios and ElectionGuard to enforce strict single cast voting without revoting.

2. ADR 002: Dual Database Architecture and Origin Separation
   * File: docs/adr/002_dual_database_architecture.md
   * Status: Accepted
   * Summary: Physical and logical isolation of student identity storage from anonymous casting logs.

3. ADR 003: Blind Signature Anonymous Credentials via RFC 9474
   * File: docs/adr/003_blind_signature_anonymous_credentials.md
   * Status: Accepted
   * Summary: Cryptographic decoupling of student identity from ballot tokens using RSA blind signatures.

4. ADR 004: Witness Co Signed Merkle Logs and Consortium Blockchain Anchoring
   * File: docs/adr/004_witness_merkle_checkpoint_chain_anchor.md
   * Status: Accepted
   * Summary: Three tier immutability architecture combining RFC 9162 Merkle trees, independent witnesses, and EVM contract anchors.

5. ADR 005: Standalone Offline Independent Verifier Architecture
   * File: docs/adr/005_offline_independent_verifier_architecture.md
   * Status: Accepted
   * Summary: Design of an air gapped, server independent Python verification CLI loading out of band trust pins.
```
