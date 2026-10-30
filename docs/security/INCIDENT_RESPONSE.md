# Incident Response and Recovery Procedures

**Document Revision**: 2026.10  
**Classification**: Operational Contingency & Dispute Resolution  
**Auditor**: HimVote Autonomous Security Documentation Agent  

---

## 1. Severity Classifications

| Severity Level | Trigger Conditions | Operational Protocol | Response Time |
| :--- | :--- | :--- | :--- |
| **SEV-1 (Critical)** | Merkle root mismatch, on-chain split-view attack, witness private key exposure | Immediate election halt, freeze casting gateway, activate forensic auditor quorum | **< 15 minutes** |
| **SEV-2 (High)** | Database outbox desynchronization, 50% witness node failure, active DDoS attack | Failover to secondary database, enable traffic scrubbers, switch RPC endpoints | **< 30 minutes** |
| **SEV-3 (Medium)** | Single witness timeout, transient EVM relayer gas exhaustion | Re-broadcast anchor transaction, restart container daemon | **< 2 hours** |

---

## 2. Incident Response Playbooks

### Playbook 1: Merkle Root Mismatch / Ledger Dispute
1. **Detection**: Standalone verifier or witness node alerts that computed root $\ne$ anchored root.
2. **Immediate Containment**:
   - The Casting Gateway is placed into `AUDIT_DISPUTE` maintenance mode via administrative kill-switch.
   - Database writes to `accepted_encrypted_ballots` are suspended (`SET TRANSACTION READ ONLY`).
3. **Forensic Investigation**:
   - Compare the local PostgreSQL leaf table with the signed checkpoints from all witness nodes.
   - Identify the exact leaf index where divergence occurred.
4. **Dispute Resolution**:
   - If server-side corruption occurred, rebuild the Merkle tree from the verified outbox journals.
   - If an unauthorized insert/deletion occurred, declare the compromised election invalid and initiate an institutional review.

---

### Playbook 2: Witness Private Key Compromise
1. **Revocation Notice**:
   - The compromised key ID is added to `revoked_keys` in the institutional governance contract.
2. **Key Rotation Ceremony**:
   - A new Ed25519 key pair is generated on an air-gapped HSM.
   - An emergency multi-signature transaction updates `trust_pins.json` signed by 3 of 5 trustees.
3. **Re-Attestation**:
   - The remaining honest witnesses re-verify the Merkle log up to the latest valid checkpoint and sign with the updated key quorum.

---

### Playbook 3: Credential Revocation (Pre-Voting Window)
If a student reports identity theft prior to casting:
1. The student authenticates in person with physical government photo ID at the campus registrar.
2. The registrar flags the compromised enrollment record as `REVOKED` in the Identity Issuer.
3. Because blind signatures decouple tokens from identity, a re-issue token is granted only if the student has not already cast. If a nullifier has already been committed to the ballot box, the vote cannot be revoked without breaking ballot secrecy (strict single-cast invariant).
