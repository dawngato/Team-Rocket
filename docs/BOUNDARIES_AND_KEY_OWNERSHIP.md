# Trust Boundaries and Key Ownership

Document Date: 30 October 2026
System: SecureVote / HimVote
Classification: Key Management and Custody Architecture

## 1. Key Roles and Custody Matrix

<table>
<tr><th>Key Identifier</th><th>Algorithm</th><th>Custodian / Owner</th><th>Storage Location</th><th>Purpose</th><th>Rotation Protocol</th></tr>
<tr><td>Roster Approver Key</td><td>Ed25519</td><td>Institutional Registrar</td><td>Hardware Token / Cloud KMS</td><td>Signs approved voter roster snapshot before freeze</td><td>Per academic session rotation</td></tr>
<tr><td>Identity Issuer Key</td><td>RSA 2048 / 4096</td><td>Identity Service Operator</td><td>Isolated HSM</td><td>Issues RFC 9474 blind credential signatures</td><td>Annual rotation with overlap period</td></tr>
<tr><td>Election Trustee Keys</td><td>ElGamal / Curve25519</td><td>Independent Faculty Trustees</td><td>Individual Encrypted Stores</td><td>Threshold encryption public key and tally shares</td><td>Per election key generation ceremony</td></tr>
<tr><td>Log Writer Key</td><td>Ed25519</td><td>Checkpoint Worker Daemon</td><td>Service Vault Secret</td><td>Signs outbound Merkle tree checkpoints</td><td>Quarterly service credential rotation</td></tr>
<tr><td>Witness Key</td><td>Ed25519</td><td>Independent Witness Organization</td><td>External Organization HSM</td><td>Validates monotonicity and signs witness final checkpoint</td><td>Out of band public key pin update</td></tr>
<tr><td>Relayer Key</td><td>ECDSA secp256k1</td><td>Anchor Relayer Daemon</td><td>KMS Managed Transaction Signer</td><td>Submits checkpoint transactions to Ethereum smart contract</td><td>Automatic gas account rekeying</td></tr>
<tr><td>Auditor Key</td><td>Ed25519</td><td>Independent Certified Auditor</td><td>Auditor Hardware Device</td><td>Signs public audit attestations after verifier pass</td><td>Independently managed by auditor</td></tr>
</table>

## 2. Independence and Separation Invariants

1. Roster Approver cannot issue credentials or cast ballots.
2. Identity Issuer never sees unblinded credential nullifiers or cast ballots.
3. Casting Gateway possesses no identity keys and has no database access to student personal records.
4. Election Trustees cannot decrypt individual ballots prior to election closure.
5. Witness Service operates outside the application database and rejects non monotonic sequence updates.
6. Standalone Verifier operates with zero network connection and trusts only independently pinned public keys.
