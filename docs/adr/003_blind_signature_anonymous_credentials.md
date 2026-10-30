# Architecture Decision Record 003: Blind Signature Anonymous Credentials via RFC 9474

## Status
Accepted

## Date
2026_10_30

## Context
Voter authorization in institutional elections requires that only eligible, registered students may cast ballots, while simultaneously ensuring that the system cannot trace which voter cast which ballot. Traditional approaches utilizing pseudonymous tokens, single use voting links, or direct bearer tokens fail to provide cryptographic unlinkability if the token generation service retains issuance logs.

HimVote requires an open, mathematically proven protocol that guarantees unlinkability even if the credential issuing authority is fully compromised and retains all transaction logs.

## Decision
We implement anonymous voting credentials using RSA Blind Signatures for Privacy per RFC 9474.

The issuance protocol operates as follows:
1. Eligibility Gate: The student authenticates to the Identity Origin using institutional credentials and multi factor authentication. The service verifies the student exists in the frozen election roster snapshot.
2. Client Blinding: The voter client application generates a random 256 bit credential secret and a cryptographic blinding factor. It blinds the secret per RFC 9474 and submits the blinded message to `POST /v1/credentials/issue`.
3. Atomic Slot Reservation: The database inserts a reservation in `credential_issuance_records` with constraint `UNIQUE(election_id, student_id)`.
4. Blind Signature Generation: The service signs the blinded message using the election issuer private key stored in an HSM or KMS, and returns the blinded signature to the client. The issuer never observes the unblinded secret.
5. Client Unblinding: The client unblinds the signature using the blinding factor, obtaining a valid RSA signature over the unblinded credential secret.
6. Nullifier Derivation: When casting, the client derives an anonymous credential nullifier and attaches the credential signature as an anonymous authorization proof.
7. Casting Validation: The casting service verifies that the credential signature is mathematically valid under the election issuer public key, and verifies that the nullifier has never been recorded in `accepted_encrypted_ballots`.

## Consequences

### Positive Consequences
* Unconditional mathematical unlinkability: Even if the issuer database records every blinded message, timestamp, and IP address, it is mathematically impossible to link an unblinded credential presented at the casting origin with the blinded message signed during issuance.
* Standardized cryptography: Utilizes reviewed RFC 9474 specification rather than proprietary zero knowledge credential constructions.
* Strict one vote per student enforcement: The database unique constraint guarantees each student obtains at most one blind signature per election.

### Negative Consequences and Mitigations
* If a voter client loses the unblinded credential secret before casting, the system cannot reissue a new credential without violating the one token limit. Mitigated by persisting credentials in platform secure storage (Keychain, Keystore, DPAPI) and warning voters that credential issuance is irrevocable.
* Timing attacks: If a student casts immediately after receiving a credential, network observers might infer a link. Mitigated by closing the issuance window before opening the casting window.
