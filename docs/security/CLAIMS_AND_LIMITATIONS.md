# Security Claims and Verified Limitations

Document Date: 30 October 2026
System: SecureVote / HimVote
Classification: Educational Prototype Compliance Statement

## 1. Verified Properties What Can Be Proved

1. Record Integrity:
   * Reconstructed RFC 9162 Merkle tree matches witnessed final checkpoint root.
   * Every leaf record is canonicalized using RFC 8785 JSON rules.
   * Any insertion, deletion, or modification of leaf records causes Merkle root mismatch.

2. Credential Uniqueness and Single Cast:
   * Each eligible voter receives one anonymous blind token.
   * Credential nullifiers are strictly unique in the casting database.
   * Concurrent and sequential duplicate cast attempts are rejected atomically.

3. Roster Attestation:
   * Frozen voter roster snapshot is attested by Roster Approver Ed25519 signature before election opens.
   * Mid election additions or roster modifications are strictly rejected.

4. Tally Proof:
   * Standalone verifier recomputes contest tallies independently.
   * Verified tallies match certified announced results exactly.

5. Anchor Finality:
   * Monotonic checkpoint sequence anchored to Ethereum EVM contract.
   * Historical forks and rollbacks are detected by sequence continuity.

## 2. Acknowledged Limitations What Cannot Be Proved

1. Receipt Freeness Outside the Voting Booth:
   * Status: LIMITED.
   * Reason: While receipt handles do not disclose candidate selections, an adversary who physically coerces a student during booth interaction cannot be prevented by cryptography alone.

2. Compromised Endpoint Resistance:
   * Status: LIMITED.
   * Reason: If a voter device is rooted, jailbroken, or infected with keyloggers, screen contents and unencrypted inputs can be observed prior to booth encryption.

3. Ballot Secrecy in Small Electorates:
   * Status: ASSUMED.
   * Reason: When a contest has very few eligible voters or voting is unanimous, the final tally mathematically exposes voter selections regardless of encryption.

4. Localhost Multi Process Independence:
   * Status: LIMITED.
   * Reason: Running witness and relayer services on the same local Docker host provides functional protocol verification, but true operational independence requires separate organizational key custody.
