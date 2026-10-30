# Architecture Decision Record 005: Standalone Offline Independent Verifier Architecture

## Status
Accepted

## Date
2026_10_30

## Context
Election audit mechanisms that depend on the operational election server to produce tally summaries or verify cryptographic proofs create a single point of failure and vulnerability. An election server could report that its internal checks passed while hiding manipulated databases or altered code.

Genuine end to end verifiability requires that an independent auditor, student organization, or third party observer can verify the entire election on an air gapped or offline workstation using zero server APIs.

## Decision
We implement a standalone Python CLI tool (`verifier/verify.py`) designed for offline, air gapped audit execution.

The verifier implements the following architectural rules:
1. Complete Isolation: Executes with no network connectivity required. All election evidence is loaded from a self contained export directory.
2. External Trust Pins: Rejects any cryptographic keys, certificates, or manifest digests packaged inside the export archive. All verification keys (Issuer public key, Witness public keys, Auditor key fingerprint, Chain contract address) must be loaded from an independently acquired trust pin file.
3. Strict Mathematical Recomputation:
   * Recomputes canonical bytes per RFC 8785 and Merkle tree root per RFC 9162 from raw leaves 0 through N minus 1.
   * Compares the recomputed root against the independently fetched witness final checkpoint.
   * Evaluates blind credential proofs and confirms credential nullifiers are unique and correctly bound to the manifest.
   * Validates zero knowledge ballot selection proofs.
   * Recomputes the homomorphic tally and verifies decryption proofs against trustee public keys.
   * Verifies blockchain anchor receipts and finality confirmations.
4. Deterministic Reporting and Exit Codes: Emits a structured JSON audit report with cryptographic checksums. Returns exit code 0 only when all mandatory checks pass.
5. Parser Hardening: Defends against archive path traversal, symbolic link exploits, duplicate JSON keys, and memory exhaustion from oversize archives.

## Consequences

### Positive Consequences
* Zero trust in server infrastructure: An attacker who fully compromises the production web servers and databases cannot produce a fraudulent election result that passes the offline verifier.
* Portability: The verifier CLI can be executed on macOS, Linux, and Windows workstations by non technical auditors with basic Python environments.
* Verifiable Audit Trail: The resulting audit report is signed by the independent auditor with an offline hardware key, providing a non repudiable attestation required before official result publication.

### Negative Consequences and Mitigations
* Audit package size: Exporting complete encrypted ballots and zero knowledge proofs creates multi gigabyte archives for large elections. Mitigated by streaming serialization and compressed archive packaging.
* Computational cost: Verifying thousands of zero knowledge proofs on an offline laptop requires significant CPU time. Mitigated by parallel proof verification across multi core processors.
