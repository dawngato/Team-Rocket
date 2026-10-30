# Upstream Repository Findings Disposition

Document Date: 30 October 2026
Scope: 53 Upstream Security Findings from ElectChain, Helios, and Belenios Analysis

## 1. ElectChain Findings F01 through F20

<table>
<tr><th>Finding ID</th><th>Description</th><th>Disposition</th><th>Local Evidence and Implementation</th></tr>
<tr><td>F01</td><td>Direct Firestore candidate count increments</td><td>AVOIDED</td><td>Server authoritative database with atomic transactions in services/casting/</td></tr>
<tr><td>F02</td><td>Client maintained election open close state</td><td>AVOIDED</td><td>Server enforced UTC voting window and state machine in services/casting/src/service.py</td></tr>
<tr><td>F03</td><td>Access code used directly as voter identity</td><td>AVOIDED</td><td>RFC 9474 RSA blind signatures decouple identity from casting tokens</td></tr>
<tr><td>F04</td><td>Unbounded public read of all user elections</td><td>AVOIDED</td><td>Scoped API authorization in services/admin_api/ and services/identity_issuer/</td></tr>
<tr><td>F05</td><td>Uninitialized tallies defaulting incorrectly</td><td>MITIGATED_AND_TESTED</td><td>Zero ballot initialization verified in services/election_engine/</td></tr>
<tr><td>F06</td><td>Live vote totals leaking during voting</td><td>AVOIDED</td><td>Tallies remain confidential until formal election closure and publication</td></tr>
<tr><td>F07</td><td>Non atomic multi document writes</td><td>AVOIDED</td><td>PostgreSQL row locking with single transaction commit boundary</td></tr>
<tr><td>F08</td><td>Stale client snapshot overwrites</td><td>AVOIDED</td><td>Optimistic concurrency control and monotonic leaf indexing</td></tr>
<tr><td>F09</td><td>Missing election roster authorization</td><td>AVOIDED</td><td>Roster snapshot signing and verification in services/identity_issuer/</td></tr>
<tr><td>F10</td><td>Insecure client token caching</td><td>MITIGATED_AND_TESTED</td><td>Hardware Keystore and Keychain storage with no sync attributes</td></tr>
<tr><td>F11</td><td>Absence of automated security regression tests</td><td>MITIGATED_AND_TESTED</td><td>38 automated security tests in tests/run_tests.py</td></tr>
<tr><td>F12</td><td>Unverified blockchain marketing claims</td><td>AVOIDED</td><td>Solidity contract deployed to Anvil with verified Foundry tests</td></tr>
<tr><td>F13</td><td>Hardcoded administrative credentials</td><td>AVOIDED</td><td>One time bootstrap invitation with immediate endpoint deactivation</td></tr>
<tr><td>F14</td><td>Unauthenticated administrative endpoints</td><td>AVOIDED</td><td>Role based access controls on every protected route</td></tr>
<tr><td>F15</td><td>Lack of input bounds checking</td><td>MITIGATED_AND_TESTED</td><td>Pydantic v2 schemas validating all request payloads</td></tr>
<tr><td>F16</td><td>Plaintext password storage</td><td>AVOIDED</td><td>Argon2id password hashing with custom salt and high memory cost</td></tr>
<tr><td>F17</td><td>Cross site scripting in candidate bios</td><td>MITIGATED_AND_TESTED</td><td>React HTML escaping and CSP headers in apps/web/</td></tr>
<tr><td>F18</td><td>Missing audit event logging</td><td>MITIGATED_AND_TESTED</td><td>Append only administrative audit log in services/admin_api/</td></tr>
<tr><td>F19</td><td>Lack of voter receipt tracking</td><td>MITIGATED_AND_TESTED</td><td>Cryptographic receipt handle and Merkle inclusion proof tracking</td></tr>
<tr><td>F20</td><td>Unrestricted election creation</td><td>AVOIDED</td><td>Scoped role permissions and administrative review workflow</td></tr>
</table>

## 2. Helios Findings H01 through H16

<table>
<tr><th>Finding ID</th><th>Description</th><th>Disposition</th><th>Local Evidence and Implementation</th></tr>
<tr><td>H01</td><td>Optional plaintext password auth</td><td>AVOIDED</td><td>Argon2id mandatory for all local credentials with TOTP MFA</td></tr>
<tr><td>H02</td><td>Password reminder email vulnerability</td><td>AVOIDED</td><td>No cleartext password emailing; short lived hashed reset tokens only</td></tr>
<tr><td>H03</td><td>Identity linked CastVote metadata leakage</td><td>AVOIDED</td><td>Strict origin separation between identity issuer and casting gateway</td></tr>
<tr><td>H04</td><td>IP logging linking voter to ballot</td><td>AVOIDED</td><td>Proxy header redaction and no IP storage in ballot tables</td></tr>
<tr><td>H05</td><td>Native revoting violating single cast rules</td><td>MITIGATED_AND_TESTED</td><td>Database nullifier uniqueness prevents revoting per Section 0.1 Rule 2</td></tr>
<tr><td>H06</td><td>Trustee key share centralization</td><td>AVOIDED</td><td>Independent trustee roles with separate threshold key shares</td></tr>
<tr><td>H07</td><td>Admin database tampering undetectable</td><td>MITIGATED_AND_TESTED</td><td>RFC 9162 Merkle tree with independent witness signatures</td></tr>
<tr><td>H08</td><td>Unauthenticated roster modifications</td><td>AVOIDED</td><td>Roster freeze ceremony requiring independent approver signature</td></tr>
<tr><td>H09</td><td>Asynchronous ballot verification race conditions</td><td>MITIGATED_AND_TESTED</td><td>Synchronous ballot validation before database outbox insertion</td></tr>
<tr><td>H10</td><td>Premature verified checkmarks in UI</td><td>MITIGATED_AND_TESTED</td><td>Distinct UI states: Submitted, Accepted, Witnessed, Anchored</td></tr>
<tr><td>H11</td><td>Insecure default debug settings</td><td>AVOIDED</td><td>Strict production environment flags and hardened CORS</td></tr>
<tr><td>H12</td><td>Weak session cookie configuration</td><td>MITIGATED_AND_TESTED</td><td>HttpOnly, Secure, and SameSite cookie flags enforced</td></tr>
<tr><td>H13</td><td>Lack of rate limiting on sensitive routes</td><td>MITIGATED_AND_TESTED</td><td>Rate limiting middleware on auth and credential routes</td></tr>
<tr><td>H14</td><td>Unprotected election freeze transitions</td><td>MITIGATED_AND_TESTED</td><td>State machine lifecycle guards in services/admin_api/</td></tr>
<tr><td>H15</td><td>Voter participation status leakage</td><td>MITIGATED_AND_TESTED</td><td>Turnout metrics withheld or privacy limited per manifest rules</td></tr>
<tr><td>H16</td><td>Single database cross domain joins</td><td>AVOIDED</td><td>Separate PostgreSQL database clusters for identity and casting</td></tr>
</table>

## 3. Belenios Findings B01 through B17

<table>
<tr><th>Finding ID</th><th>Description</th><th>Disposition</th><th>Local Evidence and Implementation</th></tr>
<tr><td>B01</td><td>Collapsed credential, trustee, and witness roles</td><td>AVOIDED</td><td>Separation of issuer, witness, relayer, and auditor services</td></tr>
<tr><td>B02</td><td>Trustee secret availability loss</td><td>MITIGATED_AND_TESTED</td><td>Threshold decryption requiring quorum rather than unanimous presence</td></tr>
<tr><td>B03</td><td>Native revoting policy collision</td><td>MITIGATED_AND_TESTED</td><td>Nullifier uniqueness enforces exactly one accepted ballot</td></tr>
<tr><td>B04</td><td>Unpinned public keys accepted by clients</td><td>AVOIDED</td><td>Trust pins file pinned independently of election evidence archive</td></tr>
<tr><td>B05</td><td>Web booth supply chain injection risks</td><td>MITIGATED_AND_TESTED</td><td>Subresource integrity and Chrome Custom Tab / ASWebAuthenticationSession isolation</td></tr>
<tr><td>B06</td><td>Small electorate deanonymization</td><td>MITIGATED_AND_TESTED</td><td>Threshold privacy check marking small contests as PRIVACY_LIMITED</td></tr>
<tr><td>B07</td><td>Missing revocation and recovery audit trail</td><td>MITIGATED_AND_TESTED</td><td>Issuance journal records all credential requests append only</td></tr>
<tr><td>B08</td><td>Dispute monitoring absence</td><td>MITIGATED_AND_TESTED</td><td>Dispute state and auditor attestation workflow in verifier</td></tr>
<tr><td>B09</td><td>License compliance obligations</td><td>MITIGATED_AND_TESTED</td><td>Clear attribution and isolated service adapter boundaries</td></tr>
<tr><td>B10</td><td>Inconsistent JSON serialization in proofs</td><td>AVOIDED</td><td>RFC 8785 JSON Canonicalization Scheme across all components</td></tr>
<tr><td>B11</td><td>Unbounded archive file processing</td><td>MITIGATED_AND_TESTED</td><td>Parser safety bounds: 100MB archive, 500MB uncompressed, 10000 files</td></tr>
<tr><td>B12</td><td>Path traversal in evidence archives</td><td>MITIGATED_AND_TESTED</td><td>Zip slip and symlink rejection in verifier and desktop clients</td></tr>
<tr><td>B13</td><td>Silent fallback to insecure verification</td><td>AVOIDED</td><td>Verifier fails closed on any cryptographic anomaly or missing proof</td></tr>
<tr><td>B14</td><td>Unchecked clock drift in voting window</td><td>AVOIDED</td><td>Authoritative server UTC timestamp controls all state transitions</td></tr>
<tr><td>B15</td><td>Lack of mobile native booth integration</td><td>MITIGATED_AND_TESTED</td><td>Isolated browser sessions in Android and iOS native clients</td></tr>
<tr><td>B16</td><td>Duplicate nullifier acceptance under concurrency</td><td>MITIGATED_AND_TESTED</td><td>SELECT FOR UPDATE row locks in services/casting/</td></tr>
<tr><td>B17</td><td>Lack of independent audit CLI</td><td>MITIGATED_AND_TESTED</td><td>Standalone Python CLI in verifier/verify.py</td></tr>
</table>
