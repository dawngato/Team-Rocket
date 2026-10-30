# HimVote Cryptographic Key Rotation Runbook

## 1. Scope and Rotation Schedules

This runbook defines the operational procedures for scheduled and emergency rotation of cryptographic keys across all HimVote trust domains.

```text
Key Rotation Schedules:

* Credential Issuer Key (RSA 4096): Rotated per election cycle. Reused keys across elections are strictly prohibited.
* Merkle Log Writer Key (Ed25519): Rotated per election cycle.
* Blockchain Relayer Key (Secp256k1): Rotated every 90 days or per semester.
* Witness Keys (Ed25519): Rotated annually by independent witness operators.
* Database Encryption Keys (AES 256 GCM): Rotated every 365 days via Cloud KMS automatic rotation.
* TLS Certificates: Rotated every 60 days via Let's Encrypt or ACM.
```

___

## 2. Key State Transition Governance

Key rotation adheres to the state machine defined in docs/key_management.md:
* Active Key transitions from ACTIVE to ROTATED upon activation of the successor key.
* The retired key remains stored in the HSM/KMS to allow historical signature verification, but all new signing authorizations are revoked.
* State transitions must be authenticated with a rotation record signed by the Trust Authority.

___

## 3. Scheduled Rotation Procedure: Credential Issuer Key

### Step 1: Provision Successor Key in Cloud KMS
Provision the successor RSA 4096 key pair inside the HSM or Cloud KMS with non exportable attributes:
```bash
python ops/scripts/provision_kms_key.py issuer_key election_id_2026_fall
```

### Step 2: Register Public Key in Election Manifest Draft
Export the public key in canonical JWK format and register the key ID and SHA256 fingerprint in the draft manifest:
```bash
python ops/scripts/register_manifest_key.py election_id_2026_fall issuer_key
```

### Step 3: Update Service IAM Policy
Grant `identity_issuer` service accounts permission to invoke `kms:Sign` on the new key ARN while preserving `kms:Verify` access to older keys:
```bash
python ops/scripts/update_iam_kms_policy.py identity_issuer new_key_arn
```

### Step 4: Verification Smoke Test
Execute an automated test issuance in staging to confirm the new key pair signs blind tokens successfully and the public key verifies unblinded signatures.

___

## 4. Emergency Rotation Procedure (Suspected Compromise)

If a private key is suspected of compromise:
1. Immediately declare a Security Incident and invoke `ops/runbooks/suspected_compromise.md`.
2. Transition key state to COMPROMISED using signed revocation notice.
3. If an election is currently in progress, trigger emergency election freeze.
4. Issue a formal advisory to the Independent Auditor and publish key revocation records to out of band trust distribution channels.
