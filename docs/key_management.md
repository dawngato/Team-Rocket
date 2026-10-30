# HimVote Cryptographic Key Management Architecture

## 1. Key Hierarchy and Cryptographic Roles

HimVote mandates distinct, election scoped cryptographic key pairs for all protocol operations. No single key pair is permitted to fulfill multiple operational roles.

```text
Cryptographic Key Matrix:

1. Roster Approver Key
   * Algorithm: Ed25519 or ECDSA P256
   * Scope: Election specific roster version
   * Storage: Institution hardware token or HSM
   * Purpose: Signs canonical roster snapshot digest and eligible student count
   * Protection: Held exclusively by the appointed Roster Approver

2. Credential Issuer Key
   * Algorithm: RSA 4096 bit per RFC 9474
   * Scope: Election specific blind credential issuance
   * Storage: Cloud KMS or Network HSM (non exportable)
   * Purpose: Signs blinded student credential requests
   * Protection: services/identity_issuer accesses key via mTLS with strict IAM role

3. Merkle Log Writer Key
   * Algorithm: Ed25519
   * Scope: Election log checkpoints
   * Storage: Cloud KMS or Network HSM
   * Purpose: Signs RFC 9162 checkpoint proposals sent to witness nodes
   * Protection: Held exclusively by services/checkpoint_worker

4. Independent Witness Keys
   * Algorithm: Ed25519
   * Scope: Multi organization witness checkpoints
   * Storage: External organization HSM or dedicated KMS
   * Purpose: Signs verified monotonic checkpoints and final election state
   * Protection: Completely outside university infrastructure and control

5. Independent Auditor Key
   * Algorithm: Ed25519
   * Scope: Post election audit attestation
   * Storage: Offline workstation hardware security key (e.g. YubiKey)
   * Purpose: Signs the verified audit report
   * Protection: University administrators possess zero access to this key

6. Blockchain Relayer Key
   * Algorithm: Secp256k1 (EVM standard)
   * Scope: Transaction relayer service
   * Storage: Cloud KMS with per transaction gas and spending limits
   * Purpose: Submits anchorCheckpoint transactions to HimVoteAnchor.sol
   * Protection: services/anchor_relayer restricted by contract RELAYER_ROLE

7. Election Trustee Keys
   * Algorithm: Threshold ElGamal over Curve25519 or prime modular group
   * Scope: Election specific ballot encryption and tally decryption
   * Storage: Individual hardware tokens held by designated faculty and student trustees
   * Purpose: Collective decryption of aggregate election tally proofs
   * Protection: Requires k out of n threshold presence to compute tally decryption
```

___

## 2. Key Lifecycle State Machine

Every cryptographic key registered within HimVote adheres to a deterministic lifecycle state machine governed by the Trust Authority.

```text
State Machine:
  [CREATED] ──► [ACTIVE] ──► [ROTATED] ──► [REVOKED]
                    │
                    ▼
              [COMPROMISED]
```

* **CREATED**: Key pair generated inside certified HSM or KMS with non exportable attribute. Public key exported and registered in manifest.
* **ACTIVE**: Authorized for signing operations during the active election phase.
* **ROTATED**: Superseded by a subsequent key pair. Historical signatures remain verifiable, but new signing requests are rejected.
* **REVOKED**: Formally invalidated prior to scheduled expiration. All subsequent signatures are deemed invalid.
* **COMPROMISED**: Suspected or confirmed private key exfiltration. Triggers immediate publication freeze and automatic transition of election state to DISPUTED.

Every lifecycle transition must be authenticated by an explicit cryptographic state transition record signed by the Trust Authority.

___

## 3. Hardware Security Modules and Cloud KMS Integration

Production deployments enforce hardware backed cryptographic boundary isolation:

* **Hardware Certification**: FIPS 140 2 Level 3 or higher certified HSM (e.g. AWS CloudHSM, Google Cloud HSM, or on premises PKCS#11 network appliances).
* **Non Exportability**: All production private keys are generated directly inside the HSM with the `exportable=false` attribute permanently set. No API endpoint exists to extract private key bytes.
* **Access Separation**: Access policies utilize principle of least privilege. The `identity_issuer` service IAM role permits exclusively `kms:Sign` for the Issuer Key, while denying all access to relayer or witness keys.
* **Development Fixture Isolation**: Development environments utilize ephemeral test keys located in `fixtures/`. Production containers and binaries execute an automated assertion during bootstrap that verifies key fingerprints against known development fixtures. If any fixture key is detected, the service immediately halts execution.

___

## 4. Scripted Trustee Key Ceremony

Generation of threshold election keys requires a formal, multi party ceremony executed in an isolated environment.

```text
Ceremony Protocol and Checklist:

1. Participants and Quorum
   * Ceremony Master: Directs execution and timing.
   * Appointed Trustees: Minimum n equals 3 trustees representing faculty, student union, and administration. Quorum threshold set to k equals 2.
   * Independent Observers: Legal counsel and external election monitor.
   * Scribe: Records video, audio, and physical sign off logs.

2. Physical Environment Isolation
   * Air gapped room without wireless networks, mobile phones, or unauthorized recording equipment.
   * Dedicated clean workstations booting from verified live operating systems.

3. Execution Sequence
   * Step 4.1: Trustee workstations execute vetted open source polynomial secret sharing script.
   * Step 4.2: Each trustee generates their individual private key share directly onto an encrypted hardware token.
   * Step 4.3: Public key shares are exchanged and combined to compute the joint election public encryption key.
   * Step 4.4: Each trustee produces a zero knowledge proof of knowledge of their private share.
   * Step 4.5: The joint election public key and all public shares are published to the election manifest.

4. Formal Attestation
   * All participants sign a physical and cryptographic ceremony affidavit.
   * Public key fingerprints and hash commitments are recorded in ops/runbooks/ceremony_records.md.
```

___

## 5. Out of Band Trust Pin Distribution

To defend against tampering of the public audit export archive, the standalone verifier CLI loads trust pins from external, independently verified channels.

```text
Out of Band Channels:

1. Printed Verification Placards
   * Physical posters displayed in institutional administration buildings and student unions prior to voting.
   * Contains QR codes encoding SHA256 fingerprints of:
       * Election Manifest Digest
       * Credential Issuer Public Key
       * Witness Public Keys
       * Chain Contract Address and Chain ID
       * Verifier CLI SHA256 checksum

2. Secondary Institutional Web Presence
   * Trust pins published on an immutable, independently hosted static page (e.g. security.institution.edu/himvote_pins.json).
   * Backed by DNSSEC and separate TLS certificates from the election domain.

3. Pre Configured Auditor Workstation Files
   * The Independent Auditor imports trust pins directly into verifier configuration prior to receiving the election export archive.
   * The verifier CLI rejects any trust key supplied inside the election export archive.
```

___

## 6. Key Revocation and Compromise Response Runbook

1. **Detection and Declaration**: Any suspected key exfiltration (e.g. unauthorized KMS API call, anomalous signature) must be declared immediately to the On Call Incident Commander.
2. **Immediate Freeze**: The Incident Commander triggers the emergency freeze endpoint `POST /v1/admin/elections/{id}/freeze_emergency`. Election state shifts to PAUSED or DISPUTED.
3. **Key Revocation Record**: The Trust Authority signs a revocation notice containing the compromised key fingerprint, reason, and effective timestamp.
4. **Independent Witness Notification**: The revocation notice is transmitted to independent witness nodes, which immediately cease accepting checkpoints signed by the compromised key.
5. **Post Compromise Remediation**: Detailed procedures are defined in ops/runbooks/suspected_compromise.md.
