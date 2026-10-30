# Privacy Engineering Data Flow

Document Date: 30 October 2026
System: SecureVote / HimVote
Classification: Information Flow Analysis and Unlinkability Guarantees

## 1. Information Flow Matrix

<table>
<tr><th>Message / Operation</th><th>Origin Actor</th><th>Destination Service</th><th>Contains Identity?</th><th>Contains Vote Choice?</th><th>Session Cookie Present?</th><th>Credential Nullifier?</th><th>Mitigation / Safeguard</th></tr>
<tr><td>User Authentication</td><td>Student Browser</td><td>Identity Issuer</td><td>Yes (Email, Student ID)</td><td>No</td><td>Yes (Auth Cookie)</td><td>No</td><td>Argon2id hashing, short lived session tokens</td></tr>
<tr><td>Blind Token Request</td><td>Student Browser</td><td>Identity Issuer</td><td>Yes (Session Token)</td><td>No</td><td>Yes</td><td>No (Blinded message only)</td><td>RFC 9474 RSA Blinding; issuer cannot view unblinded message</td></tr>
<tr><td>Ballot Encryption</td><td>Voting Booth Sandbox</td><td>Local Client Memory</td><td>No</td><td>Yes (In memory only)</td><td>No</td><td>No</td><td>ElGamal encryption with zero knowledge validity proof</td></tr>
<tr><td>Ballot Submission</td><td>Isolated Client Origin</td><td>Casting Gateway</td><td>No (Strictly Forbidden)</td><td>No (Ciphertext only)</td><td>No (Headers stripped)</td><td>Yes (Hashed nullifier)</td><td>Casting origin security middleware rejects identity bearer tokens</td></tr>
<tr><td>Outbox Enqueue</td><td>Casting Gateway</td><td>PostgreSQL Outbox Table</td><td>No</td><td>No (Ciphertext only)</td><td>No</td><td>Yes (Committed nullifier)</td><td>Separate database cluster; zero foreign keys to identity</td></tr>
<tr><td>Merkle Leaf Ingestion</td><td>Checkpoint Worker</td><td>Witness Service</td><td>No</td><td>No (Ciphertext only)</td><td>No</td><td>Yes (Unlinked commitment)</td><td>RFC 8785 canonical JSON; RFC 9162 Merkle tree construction</td></tr>
<tr><td>Checkpoint Anchor</td><td>Anchor Relayer</td><td>Ethereum Smart Contract</td><td>No</td><td>No</td><td>No</td><td>No</td><td>Anchors only tree size, Merkle root, and manifest digest</td></tr>
<tr><td>Audit Evidence Export</td><td>Admin API</td><td>Public Auditor</td><td>No</td><td>No (Ciphertext only)</td><td>No</td><td>Yes (Nullifiers only)</td><td>Complete evidence archive contains zero student identifiers</td></tr>
<tr><td>Receipt Tracking</td><td>Student Browser</td><td>Casting Origin</td><td>No</td><td>No</td><td>No</td><td>No (Opaque receipt handle)</td><td>Receipt maps to Merkle leaf index without choice revelation</td></tr>
</table>

## 2. Key Privacy Protections

1. Two Database Cluster Isolation:
   * Identity records and casting records reside in physically separate database instances with separate credentials and networks.
   * No database table, query, foreign key, or export joins a student identity to a cast ballot.

2. Anonymous Authorization:
   * Blind signature scheme decouples student eligibility verification from ballot authorization.
   * The identity issuer signs a blinded token without learning the underlying nullifier.
   * The student unblinds the signature locally; the unblinded token is presented to the casting gateway anonymously.

3. Redaction and Log Isolation:
   * Reverse proxy and application logs redact IP addresses, user agents, and authorization headers on the casting gateway.
   * No unique correlation identifiers span both identity and casting requests.
