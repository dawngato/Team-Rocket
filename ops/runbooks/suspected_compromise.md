# HimVote Suspected Cryptographic Compromise Incident Runbook

## 1. Scope and Immediate Response Protocol

This runbook establishes mandatory incident response actions when any cryptographic key, server node, administrator account, or database cluster within the HimVote system is suspected of unauthorized access or compromise.

```text
Critical Compromise Indicators:

* Anomalous KMS API calls or unexpected signature requests.
* Unauthorized access detected on Identity DB or Casting DB instances.
* Physical tampering detected on Trustee hardware security tokens.
* Host intrusion detection alerts (e.g. Falco or Wazuh) triggering on production pods.
* Production private key material identified in logs, traces, or public archives.
```

___

## 2. Immediate Emergency Containment Sequence

### Step 1: Trigger Emergency Election Freeze
The Incident Commander immediately executes the emergency freeze endpoint to prevent further state transitions or ballot casting:
```bash
python ops/scripts/freeze_emergency_election.py election_id incident_declared
```
Election state immediately moves to `PAUSED`. Casting and issuance endpoints reject all incoming requests with HTTP 503 SERVICE_FROZEN.

### Step 2: Revoke Compromised Cryptographic Keys
Submit a signed revocation record for the affected key:
```bash
python ops/scripts/revoke_kms_key.py compromised_key_arn reason_compromised
```
The key status transitions to `COMPROMISED` in manifest registries.

### Step 3: Notify Independent Witnesses and Blockchain Validators
Broadcast the signed key revocation certificate to all external witness nodes and relayer services to immediately halt acceptance of checkpoints signed by the compromised key.

### Step 4: Isolate Affected Compute Infrastructure
Terminate compromised Kubernetes pods and isolate underlying virtual machines in restricted quarantine security groups:
```bash
python ops/scripts/quarantine_compromised_nodes.py affected_node_id
```

___

## 3. Forensic Investigation and Resolution

1. **Evidence Preservation**: Take encrypted snapshots of all affected disks, database WAL logs, and network connection flows for third party digital forensics.
2. **Impact Assessment**: Determine whether ballot confidentiality, voter eligibility, or tally integrity was affected:
   * If Credential Issuer Key was compromised: Ineligible voters may have acquired credentials. The election must be cancelled and re held.
   * If Merkle Log Writer Key was compromised: The attacker could propose fraudulent checkpoints. Compare local logs against independent witness records to assess discrepancies.
   * If Trustee Key share was compromised: If fewer than k threshold shares were compromised, tally confidentiality remains secure. If k or more shares were exposed, ballot secrecy is compromised.
3. **Formal Incident Report**: Convene the Institutional Cyber Security Incident Committee and compile a formal breach notification per statutory guidelines.
