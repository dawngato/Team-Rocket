# Trust Roots and Key Rotation Protocol

Document Date: 30 October 2026
System: SecureVote / HimVote
Classification: Independent Key Pinning and Compromise Recovery

## 1. Pinned Trust Configuration Structure

The verifier CLI relies on a separately distributed `trust_pins.json` file. It strictly rejects any trust configuration packaged inside the untrusted election export archive.

Pinned Elements:
1. `roster_approver_public_key`: Ed25519 public key of the registrar authority.
2. `issuer_public_key`: RSA public key used to verify blind credential proofs.
3. `witness_public_key`: Ed25519 public key of the independent witness service.
4. `chain_id` and `contract_address`: Expected Ethereum consensus identifiers.
5. `contract_code_hash`: Expected keccak256 bytecode hash of HimVoteAnchor contract.
6. `election_manifest_digest`: Canonical SHA256 digest of the frozen election manifest.

## 2. Key Rotation Protocol

1. Scheduled Routine Rotation:
   * Issuer and Witness keys are rotated at predetermined academic term boundaries.
   * A transitional key publication artifact is signed by both the existing key and the new replacement key.
   * Pinned trust configurations are updated across auditor repositories out of band.

2. Emergency Revocation Protocol:
   * If a private key is compromised, an emergency key revocation certificate is published.
   * Active elections using the compromised key transition immediately to PAUSED or CANCELLED.
   * No election results may be certified under a compromised key.
   * Standalone verifier checks the revocation registry prior to issuing an audit pass.
