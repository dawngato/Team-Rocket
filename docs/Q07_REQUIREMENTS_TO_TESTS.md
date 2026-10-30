# Question 07 Requirements to Tests Contract

Document Date: 30 October 2026
System: SecureVote / HimVote
Classification: Acceptance Criteria and Negative Test Verification

## Seven Core Acceptance Requirements

<table>
<tr><th>ID</th><th>Exact Requirement</th><th>Demonstrable Outcome</th><th>Negative Test Path</th><th>Verification Status</th></tr>
<tr><td>Q07.01</td><td>Authorized election management</td><td>Authorized official adds candidates and roster, opens/closes election, publishes verifiable result</td><td>tests/security/test_permissions.py</td><td>PASS</td></tr>
<tr><td>Q07.02</td><td>One eligible student, one accepted ballot</td><td>First valid ballot accepted; duplicate submissions rejected under sequential and concurrent loads</td><td>tests/security/Q7_01_duplicate_cast_test.py</td><td>PASS</td></tr>
<tr><td>Q07.03</td><td>Voter privacy</td><td>Stored ballot evidence has no direct student to candidate linkage; encrypted ballots used</td><td>tests/security/test_privacy_leakage.py</td><td>PASS</td></tr>
<tr><td>Q07.04</td><td>Tamper detection</td><td>Changing committed artifact contradicts separately authenticated checkpoint root</td><td>tests/security/Q7_03_deletion_test.py and Q7_04_modification_test.py</td><td>PASS</td></tr>
<tr><td>Q07.05</td><td>Independent result verification</td><td>Standalone CLI verifies election evidence, Merkle commitments, and tallies with backend offline</td><td>tests/test_verifier.py</td><td>PASS</td></tr>
<tr><td>Q07.06</td><td>Security testing</td><td>Five mandated attacks run with recorded reproducible artifacts and nonzero exit codes on tampered inputs</td><td>tests/run_tests.py</td><td>PASS</td></tr>
<tr><td>Q07.07</td><td>Security documentation</td><td>Threat model, cryptographic assumptions, operational controls, and limitations recorded</td><td>docs/security/CLAIMS_AND_LIMITATIONS.md</td><td>PASS</td></tr>
</table>

## Security Property Verification Matrix

<table>
<tr><th>Property</th><th>Cryptographic Primitive</th><th>Proof Location</th><th>Acknowledged Limitation</th></tr>
<tr><td>Eligibility</td><td>Roster snapshot signing with Ed25519</td><td>services/identity_issuer/</td><td>Relies on authoritative institutional registrar enrollment source</td></tr>
<tr><td>At Most One Ballot</td><td>PostgreSQL row lock and nullifier uniqueness</td><td>services/casting/</td><td>Requires database ACID transaction isolation</td></tr>
<tr><td>Choice Secrecy</td><td>ElGamal encryption with zero knowledge proof</td><td>services/election_engine/</td><td>Small electorates can leak choice through unanimous tally</td></tr>
<tr><td>Inclusion Proof</td><td>RFC 9162 Merkle tree audit path</td><td>services/checkpoint_worker/</td><td>Does not prove voter was uncoerced outside voting booth</td></tr>
<tr><td>History Integrity</td><td>Independent witness signed checkpoints</td><td>witness/</td><td>Local witness emulator is under single developer control</td></tr>
<tr><td>Verifiable Tally</td><td>Threshold decryption verification</td><td>verifier/verify.py</td><td>Requires trustee quorum presence for final decryption</td></tr>
<tr><td>Anchor Finality</td><td>Solidity contract on EVM chain</td><td>chain/contracts/</td><td>Local Anvil chain provides demonstration, not public consensus</td></tr>
</table>
