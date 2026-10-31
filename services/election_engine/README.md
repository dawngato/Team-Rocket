# HimVote Voting Engine Service

## Overview

The HimVote Voting Engine service is a development adapter and protocol test harness. It implements Profile VEEM for synthetic fixtures so that service boundaries, canonical evidence, duplicate enforcement, and failure handling can be exercised.

Profile VEEM is not an official Belenios, ElectionGuard, or Helios implementation. It is not a vetted production voting engine. The HimVote Gate E1 remains blocked until an established engine with its own independently usable verifier passes the required integration proof of concept. This service must not be used to make a production ballot secrecy claim.

## Core Adapter Interface

The engine exposes the six required adapter functions:

* `validate_ballot`: Validates encrypted candidate choices, disjunctive zero knowledge proofs for zero or one selection, and homomorphic sum proofs.
* `verify_credential`: Validates anonymous blind credential proofs, checks election bindings, and derives unique deterministic nullifiers.
* `export_ballots`: Formats accepted ballots and native zero knowledge proofs into canonical RFC 8785 JSON records and computes the RFC 9162 Merkle tree root.
* `verify_tally`: Performs independent tally verification by homomorphically accumulating ciphertexts, checking trustee decryption share proofs, and confirming reported candidate totals.
* `verify_inclusion`: Verifies cryptographic inclusion of cast ballots in the RFC 9162 Merkle log.
* `get_protocol_version`: Returns the development protocol identifier `himvote_veem_v1`.

The adapter is custom development code and is reported as `custom_development_unverified`. It
must not be used for a security-complete release until a separately selected
established engine, its native booth and its independent verifier have passed
the release gate. Mathematical correctness tests in this repository do not
substitute for that external protocol review.

## Development cryptographic architecture: Profile VEEM

The voting engine relies on vetted mathematical primitives and standards:

### 1. Discrete Logarithm Subgroup
Group parameters originate from RFC 5114 Section 2.3, providing a 2048 bit MODP prime with a 256 bit prime order subgroup:
* Modulus prime P: 2048 bits
* Subgroup prime order Q: 256 bits
* Generator G: Element of prime order Q in Z_p^*

Every public key, ciphertext component, and proof commitment is strictly verified to reside in the prime order subgroup G_q before evaluation.

### 2. Exponential ElGamal Encryption
Candidate selections employ exponential ElGamal:
* Joint election public key H is formed from the product of trustee public key shares modulo P.
* For each candidate option, vote v in {0, 1} is encrypted with ephemeral randomness r in Z_q:
  * a = G^r mod P
  * b = (H^r * G^v) mod P

### 3. Cramer Damgard Schoenmakers Disjunctive Proofs
Each candidate ciphertext includes a non interactive disjunctive zero knowledge proof demonstrating that the encrypted plaintext equals zero or one, without revealing which choice was selected. The Fiat Shamir transform generates challenges bound to the manifest digest, election identifier, candidate identifier, and ciphertext components.

### 4. Chaum Pedersen Homomorphic Sum Proofs
Because exponential ElGamal is additively homomorphic, the product of candidate ciphertexts encrypts the sum of selections. The engine generates and verifies a Chaum Pedersen proof that the homomorphic sum encrypts exactly one, enforcing that voters make valid selections.

### 5. Threshold Trustee Decryption and DLEQ Proofs
Multiple independent trustees participate in election tallying:
* Each trustee holds a private secret share and publishes a public key share with a Schnorr proof of knowledge.
* During tallying, all accepted ciphertexts are homomorphically multiplied across ballots for each contest candidate.
* Each trustee provides a partial decryption share accompanied by a Chaum Pedersen discrete logarithm equality (DLEQ) proof.
* Decryption shares are combined to reveal the plaintext element G^T, where T represents total votes. A baby step giant step discrete logarithm solver recovers final integer tallies.

### 6. Anonymous Blind Credentials and Deterministic Nullifiers
Credential issuance adheres to RFC 9474 principles:
* The voter generates a secret token S and blinds it using the issuer RSA public key.
* The issuer signs the blinded token without learning the voter secret.
* The voter unblinds the signature and presents the credential upon casting.
* The casting origin verifies the signature and computes the deterministic nullifier:
  nullifier = SHA256("himvote_nullifier_v1:" + election_id + ":" + S)
* Because the nullifier is deterministic per election and voter token, duplicate casts are immediately rejected, while identity remains decoupled from ballot choice.

### 7. Tamper Evident RFC 9162 Merkle Log
Cast ballots are recorded in an append only Merkle log:
* Leaf hash: SHA256(0x00 || canonical_leaf_bytes)
* Node hash: SHA256(0x01 || left_child || right_child)
* Audit paths enable voters to verify ballot inclusion against the public Merkle root.

## Local adapter verification block

The engine includes a local adapter regression suite in `gate_e1.py`. It validates development behavior against five checks. These checks are useful regression evidence only; they are not an established engine integration or external protocol gate:

1. Real Encrypted Ballot Creation and Casting: Generates authentic exponential ElGamal ballots with zero knowledge proofs and successfully casts them.
2. Native Proof Artifact Export: Exports canonical JSON proof artifacts and Merkle tree roots.
3. Independent Tally Verification: Executes standalone tally verification against homomorphically accumulated ciphertexts and trustee decryption shares.
4. Byte Level Tamper Detection: Modifies single bytes within ballot ciphertexts and zero knowledge proofs, confirming that verification strictly fails.
5. Single Cast Enforcement: Proves that repeated submission attempts using spent nullifiers are rejected.

## Directory Structure

```text
services/election_engine/
* __init__.py         Package exports and entrypoints
* adapter.py          VotingEngineAdapter implementation
* constants.py        RFC 5114 group parameters and protocol constants
* crypto.py           ElGamal, CDS proofs, sum proofs, DLEQ, Merkle tree
* credentials.py      RFC 9474 blind signature issuance and nullifiers
* booth.py            Voter client ballot encryption module
* verifier.py         Independent tally verifier CLI and library
* gate_e1.py          Gate E1 verification script
* README.md           Comprehensive service documentation
* tests/              Pytest verification suite
  * test_adapter.py
  * test_credentials.py
  * test_crypto.py
  * test_gate_e1.py
  * test_single_cast.py
  * test_tamper_detection.py
```

## Running Verification and Tests

To run the automated Gate E1 verification script:

```bash
python3 services/election_engine/gate_e1.py
```

To run the comprehensive test suite with pytest:

```bash
pytest services/election_engine/tests
```

To run the standalone tally verifier:

```bash
python3 services/election_engine/verifier.py manifest.json export.json tally.json trustees.json
```
