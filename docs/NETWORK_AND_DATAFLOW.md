# Network Topology and Information Flow

Document Date: 30 October 2026
System: SecureVote / HimVote
Classification: Network Architecture and Boundary Enforcement

## 1. Physical and Logical Network Segregation

1. Identity Issuer Network Zone:
   * Origin: `https://identity.institution.edu`
   * Services: `identity_issuer` and `admin_api`
   * Database: Identity PostgreSQL cluster (contains student records, passwords, roles, MFA, and issuance journals)
   * Inbound Traffic: Authenticated institutional student and staff web sessions
   * Security Controls: Cookie HttpOnly, Secure, SameSite; CORS restricted to institutional domains

2. Casting Gateway Network Zone:
   * Origin: `https://cast.institution.edu`
   * Services: `casting` service and `election_engine` adapter
   * Database: Casting PostgreSQL cluster (contains accepted ciphertexts, nullifiers, and outbox records)
   * Inbound Traffic: Anonymous ballot submissions from isolated booth sessions
   * Security Controls: Strict middleware rejecting identity cookies, bearer tokens, and student identifiers; IP address redaction

3. Outbox and Log Publishing Zone:
   * Services: `checkpoint_worker`
   * Connectivity: Pulls accepted ballots from casting outbox; constructs RFC 9162 Merkle tree
   * Outbound Traffic: Submits checkpoint to external witness service via mTLS

4. External Witness Network Zone:
   * Origin: `https://witness.external_auditor.org`
   * Services: Independent `witness` daemon
   * Database: Standalone write ahead log and SQLite/PostgreSQL storage
   * Connectivity: Dedicated external host; no administrative access by election administrators

5. Blockchain Consensus Zone:
   * Services: `anchor_relayer`
   * Target: Public Ethereum or private consortium EVM node (Anvil in local demo)
   * Traffic: Raw JSON RPC transactions carrying authenticated checkpoint digests

6. Standalone Offline Audit Zone:
   * Tool: `verifier/verify.py` CLI
   * Operating Mode: Strictly airgapped; zero outbound network sockets; reading exported evidence zip archives
