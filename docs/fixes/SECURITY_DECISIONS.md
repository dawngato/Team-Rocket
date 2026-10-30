# HimVote Security Decisions and Integrity Commitments

This document records the foundational security decisions, integrity guarantees, and disclosure principles governing HimVote.

## 1. Transparent Security Disclosure

### Custom Election Engine Status (VEEM)
- The election engine implementation contains custom zero knowledge and homomorphic encryption logic.
- Decision: Do not falsely claim compliance with audited upstream protocols such as Helios or Belenios.
- The engine explicitly self-identifies as `custom_development_unverified` across all headers and service metadata.
- Production deployments must acknowledge this limitation until an independent third party cryptographic audit is performed.

### Witness Independence and Chain Custody
- The witness service and Foundry Anvil node currently run alongside election services on the same EC2 instance.
- Decision: Mark the witness service as `SIMULATED_WITNESS`.
- Colocated persistence does not constitute independent operator custody. An adversarial host administrator could rewrite local state across all containers.
- For genuine non-repudiation, the witness key custody and database must be operated by a physically and administratively segregated entity as documented in `docs/witness_deployment_guide.md`.

---

## 2. Voter Privacy and Credential Protection

### Navigation URL Hygiene
- Voter credentials, RSA blind signatures, ZK proofs, and ballot choices are never placed inside query strings or browser navigation URLs.
- Rationale: Query parameters leak into server access logs, browser history, proxy caches, and HTTP Referer headers.
- Enforcement: Android and iOS client handoffs transmit only the election binding ID and opaque state tokens in URLs. Credential exchange is handled exclusively via secure same-origin back-channels.

### Authentication Rate Limiting
- Multi-worker brute force resistance is enforced via Redis Sorted Sets using atomic sliding window transactions.
- Prevents denial of service and credential stuffing attacks across distributed API instances.
- Automatic fail-safe fallback to thread-safe in-memory sliding window deque ensures local developer isolation without external dependencies.

---

## 3. Evidence Packaging and Standalone Verification

### Archive Safety and Determinism
- Exported evidence ZIP archives are deduplicated to guarantee unique member paths.
- Standalone verifier strictly checks for duplicate entries and directory traversal attempts, rejecting corrupted or malicious archives with `BadArchiveError`.
- Manifest digests, checkpoint roots, and tally proofs are canonicalized using RFC 8785 JSON Canonicalization Scheme (JCS) before hashing.

---

## 4. Production TLS and Transport Hardening

### Transport Layer Security
- Production traffic enforces TLS 1.2 and TLS 1.3 exclusively with forward secrecy cipher suites.
- Cleartext HTTP on port 80 is strictly redirected via HTTP 301 to port 443 HTTPS.
- HTTP Strict Transport Security (HSTS) is enabled with `max-age=63072000; includeSubDomains; preload`.

### Cookie Hardening
- Authentication cookies (`session_id`) enforce `HttpOnly`, `SameSite=Lax`, and `Secure` attributes when running in production environments.
