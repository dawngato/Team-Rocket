# HimVote Independent Multi Organization Witness Deployment Guide

## 1. Overview and Purpose

In the HimVote security model, the witness service is the primary technical countermeasure against historical log rewriting, ballot truncation, and administrative equivocation. To guarantee genuine independence, the witness service must be operated by a separate legal and operational entity (e.g. an independent partner university, an election monitoring organization, or a regional bar council).

Under no circumstances should the university hosting the election possess administrative access, root credentials, or cryptographic keys for the independent witness nodes.

___

## 2. Cryptographic Role and Verification Logic

The witness service operates as an autonomous cryptographic verification daemon exposing three endpoints:
* `POST /checkpoints`: Receives incremental Merkle log proposals.
* `POST /elections/{id}/final`: Finalizes election state and signs the final checkpoint.
* `GET /elections/{id}/final`: Publicly serves the independent final checkpoint to auditors.

```text
Verification Algorithm Executed by Witness on Each Checkpoint:

1. Origin and Manifest Verification:
   * Verifies that the checkpoint signature matches the pinned Log Writer Key for this election.
   * Validates that election_id exists in the authorized manifest registry and manifest_digest matches the frozen manifest commitment.

2. Monotonic Tree Progression:
   * Verifies tree_size > last_acknowledged_tree_size.
   * Rejects any checkpoint where tree_size <= last_acknowledged_tree_size or where sequence numbers exhibit gaps.

3. Consistency Proof Verification:
   * Mathematically evaluates the RFC 9162 Merkle consistency proof demonstrating that the new Merkle root is an append only extension of the previous Merkle root.
   * Rejects proposals where historical leaves were modified or omitted.

4. Append Only Local Persistence:
   * Writes the proposal to local write once storage before generating a signature.

5. Cryptographic Co Signing:
   * Signs the canonical checkpoint bytes using the Witness Private Key held in the external HSM or KMS.
   * Returns a signed witness acknowledgement containing the signature and timestamp.

6. Finality Lock:
   * Once a FINAL checkpoint is signed, the witness permanently locks the election.
   * Refuses any subsequent incremental proposals and refuses conflicting alternate finals.
```

___

## 3. Infrastructure and System Requirements

```text
Recommended Production Topology:

* Operating Environment: Dedicated Virtual Machine or hardened container environment.
* CPU and Memory: 2 vCPU, 4 GB RAM.
* Storage: 50 GB NVMe encrypted SSD with write once append only logging.
* Cryptographic Backend: Dedicated KMS (AWS KMS, GCP Cloud KMS) or hardware token (YubiKey HSM / PKCS#11).
* Network: Public IPv4/IPv6 with TLS 1.3 reverse proxy and strict firewall rules restricting access to known HimVote outbound IP ranges.
* Access Control: SSH keys held exclusively by the external witness organization. Zero access granted to HimVote system operators.
```

___

## 4. Step by Step Deployment Procedure

### Step 1: Clone Witness Repository
```bash
git clone https://github.com/himvote/himvote.git
cd himvote/witness
```

### Step 2: Provision Isolated Cryptographic Key
Generate an Ed25519 signing key within the external organization cloud KMS or hardware token:
```bash
# Example AWS KMS key generation via python utility
python scripts/create_witness_key.py
```
Record the public key fingerprint and share it with the University Election Authority out of band for inclusion in the frozen manifest.

### Step 3: Configure Environment Variables
Create the witness configuration file `/etc/himvote/witness.env`:
```text
WITNESS_PORT=8443
WITNESS_STORAGE_PATH=/var/lib/himvote/witness_store.db
WITNESS_KEY_BACKEND=aws_kms
WITNESS_KEY_ID=arn:aws:kms:region:account:key/key_id
PINNED_ELECTION_MANIFESTS_DIR=/etc/himvote/manifests
LOG_LEVEL=INFO
```

### Step 4: Import Frozen Election Manifest
Obtain the signed election manifest out of band from the Election Authority and place it into the manifests directory:
```bash
cp manifest_election_2026.json /etc/himvote/manifests/
```
Verify the manifest signature against the university public key before enabling ingestion.

### Step 5: Launch Witness Daemon
Deploy the systemd service unit `/etc/systemd/system/himvote_witness.service`:
```ini
[Unit]
Description=HimVote Independent Witness Service
After=network.target

[Service]
Type=simple
User=witness_daemon
Group=witness_daemon
WorkingDirectory=/opt/himvote/witness
EnvironmentFile=/etc/himvote/witness.env
ExecStart=/opt/himvote/witness/venv/bin/python main.py
Restart=always
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=default.target
```
Enable and start the service:
```bash
systemctl daemon_reexec
systemctl enable himvote_witness
systemctl start himvote_witness
```

___

## 5. Health Monitoring and Incident Response

```text
Operational Checks:

1. Daily Liveness and Latency Check
   * Query GET /health status endpoint. Ensure p99 verification latency remains under 200 milliseconds.

2. Fork and Equivocation Detection Alarm
   * The witness daemon raises an immediate PagerDuty or OpsGenie high priority alert if an incoming proposal exhibits:
       * A tree size rollback
       * A failed Merkle consistency proof
       * A conflicting proposal for a finalized election
   * In any such event, the witness logs the full cryptographic evidence and flags the election as DISPUTED.

3. Out of Band Audit Inquiries
   * During the official post election audit, the Independent Auditor will query GET /elections/{id}/final directly from this witness instance to compare against the export archive.
```
