# HimVote Security Assumptions

## 1. Cryptographic Assumptions

The security and integrity properties of HimVote depend on standard, mathematically vetted cryptographic hardness assumptions and reviewed algorithm specifications. No proprietary or experimental cryptographic primitives are used.

```text
Cryptographic Primitives and Foundational Assumptions:

1. Collision Resistance and Preimage Resistance of SHA256
   * Assumption: Computing x and y such that SHA256(x) equals SHA256(y) with x != y requires on average 2^128 operations.
   * System Usage: RFC 9162 Merkle log leaf hashes SHA256(0x00 || leaf_bytes) and interior node hashes SHA256(0x01 || left || right), manifest digests, checkpoint digests, and nullifier derivations.

2. RSA Blind Signature Hardness (RFC 9474)
   * Assumption: An attacker cannot forge an RSA blind signature without knowledge of the private key, and the unblinded signature cannot be linked to the blinded token presented during issuance.
   * Mathematical Basis: Hardness of factoring large composite integers and computing modular e th roots.
   * System Usage: Anonymous credential issuance decoupling student identity from ballot submission tokens.

3. Hardness of the Discrete Logarithm Problem
   * Assumption: Given cyclic group G with generator g and element h in G, finding x such that g^x equals h is computationally infeasible.
   * System Usage: Threshold ElGamal ballot encryption and Chaum Pedersen zero knowledge proofs.

4. Zero Knowledge Proof Soundness and Completeness
   * Assumption: Non interactive zero knowledge proofs constructed with the Fiat Shamir heuristic are computationally sound. A prover cannot convince a verifier of a false statement except with negligible probability.
   * System Usage: Proving that encrypted ballots contain valid selections from approved candidate lists without revealing selections.

5. Canonical Serialization Determinism (RFC 8785)
   * Assumption: Canonical JSON transforms equivalent JSON objects into an identical sequence of UTF 8 bytes, eliminating serialization ambiguities.
   * System Usage: Hashing ballot evidence records, checkpoint structures, and manifests.

6. Password Key Derivation Hardness (Argon2id)
   * Assumption: Argon2id provides memory hard resistance against GPU, FPGA, and ASIC based offline brute force attacks.
   * System Usage: Administrative and student password verification.
```

___

## 2. Operational and Architectural Assumptions

```text
Operational Assumptions:

1. Independent Multi Organization Witness Deployment
   * Assumption: The witness service is deployed, managed, and monitored by an external organization distinct from the university running HimVote.
   * Rationale: Prevents university administrators from unilaterally modifying historical Merkle trees or producing truncated logs without immediate detection.

2. Non Collusion Between Identity and Casting Authorities
   * Assumption: Identity database operators and casting database operators do not collude to combine network connection logs, TLS session tickets, or server access traces.
   * Structural Enforceability: Distinct physical servers, separate cloud accounts, independent database credentials, distinct KMS keys, and isolated edge routing origins.

3. Secure Key Storage in Hardware Security Modules or Cloud KMS
   * Assumption: Private keys for the blind issuer, witness nodes, relayer, and auditor are held in FIPS 140 2 Level 3 HSMs or managed Cloud KMS. Private key material is never exported or present in application memory outside cryptographic operations.
   * System Usage: Signing blind credentials, signing witness checkpoints, and signing audit attestations.

4. Bounded Network Clock Synchronization
   * Assumption: System clocks across casting nodes and identity nodes are synchronized via authenticated Network Time Protocol with drift bounded below 500 milliseconds.
   * System Usage: Enforcing strict transition times for issuance cutoff, election opening, and election closing.

5. Consortium Blockchain Liveness and Finality
   * Assumption: The underlying EVM network provides censorship resistance, blocks progress regularly, and achieves finality within the configured confirmation threshold. Reorganizations deeper than the finality parameter do not occur.
   * System Usage: Immutable commitment anchoring via HimVoteAnchor.sol.

6. Offline Auditor Workstation Integrity
   * Assumption: The independent auditor executes the standalone Python verifier CLI in an uncompromised workstation environment with pinned trust anchors obtained out of band.
   * System Usage: Validating audit packages before signing public attestation statements.
```

___

## 3. Boundary Conditions and Graceful Degradation

```text
Boundary Conditions and System Behaviors:

1. Compromised Voter Endpoint
   * Boundary: The voter device hosts malware, screen recorders, or keyboard interceptors.
   * Result: Cryptographic protocols cannot prevent a compromised OS from capturing plaintext selections before encryption. The system provides verifiability of cast ballots but cannot protect secrecy against endpoint spyware.

2. Total Authority Collusion
   * Boundary: University leadership, database administrators, and network infrastructure operators actively conspire.
   * Result: Even under total internal collusion, administrators cannot alter election outcomes without detection because independent witness signatures and on chain anchors cannot be forged without witness and relayer private keys.

3. Low Turnout in Small Electorates
   * Boundary: Total voter turnout in an election contest falls below the minimum anonymity threshold defined in the election manifest.
   * Result: Cryptographic tallying remains correct, but individual choices could be deduced through demographic elimination. The system enforces an automated policy marking the election outcome as PRIVACY_LIMITED and suppresses granular breakdown data.

4. Permanent Witness Service Outage
   * Boundary: External witness nodes become permanently unreachable during or after an election.
   * Result: The election engine transitions state to UNVERIFIABLE. Publication is permanently blocked until witness evidence is restored or a formal election dispute is resolved.
```
