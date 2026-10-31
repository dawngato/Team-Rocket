# HimVote Standalone Auditor and Verifier CLI

## Overview

The verifier CLI provides standalone cryptographic audit verification for institutional elections under Section 6.8 of prompt specification.
It verifies evidence archives independently of election servers and never trusts public keys packaged inside evidence exports.

## Commands

### 0. HimVote compatible module command

The standalone module entry point is:

```bash
python -m verifier verify --archive <evidence_dir_or_archive> --trust <pins_json> --report <output_report_json> --final <witness_final_json> --roster <roster_approval_json> --issuance <issuer_closure_json> --chain <chain_anchor_json>
```

The independent final checkpoint, roster approval, issuance closure, and chain anchor remain required evidence. If any are omitted, the command returns exit code 3 and does not claim a verification pass.

The normal command is strict. It requires native ballot and tally evidence from the selected vetted engine. The current repository Profile VEEM fixture is a development adapter and is rejected by the strict command because its test profile can contain plaintext selections. The fixture runner must opt in explicitly with `--allow-development-profile`, and that option is for local tests only.

The `--verify-inclusion` option accepts a JSON tracker with `election_id`, `manifest_digest`, `leaf_index`, `leaf_digest`, `audit_path`, and optional `root`. Each audit path entry contains a sibling `hash` and a `position` of `left` or `right`. The tracker is checked against the exported canonical leaf and the externally signed final root. A malformed or mismatched tracker fails closed.

### 1. audit_evidence

Audits election evidence package and outputs an unsigned compliance report JSON file.

Command syntax:

```bash
python verifier/verify.py audit_evidence --export <dir_or_archive> --trust <pins_json> --final <witness_final_json> --roster <roster_approval_json> --issuance <issuer_closure_json> --chain <chain_anchor_json> --report <output_report_json>
```

For the local plaintext fixture only:

```bash
python verifier/verify.py audit_evidence --export <dir_or_archive> --trust <pins_json> --final <witness_final_json> --roster <roster_approval_json> --issuance <issuer_closure_json> --chain <chain_anchor_json> --report <output_report_json> --allow-development-profile
```

Options:

* export: directory or zip or tar archive containing election export manifest, leaves, and results
* trust: path to external trust pins JSON containing pinned public keys
* final: path to independent witness final checkpoint JSON
* roster: path to roster approval JSON signed by authorized roster approver
* issuance: path to issuance closure JSON signed by identity issuer
* chain: path to consortium blockchain anchor record JSON
* report: path to output report JSON file

### 2. verify_attestation

Verifies independent auditor cryptographic signature over an audit report.

Command syntax:

```bash
python verifier/verify.py verify_attestation --report <report_json> --attestation <auditor_signature_json> --trust <pins_json>
```

Options:

* report: path to verified compliance report JSON
* attestation: path to auditor signature JSON file
* trust: path to external trust pins JSON containing pinned auditor public key

## Strict Verification Steps

* Step 1: Trust Pins Loading
  Load pinned keys strictly from external trust pins file. Keys embedded inside export packages are ignored and never trusted.

* Step 2: Manifest and Authorizations Verification
  Verify canonical manifest bytes against manifest digest. Verify roster approval signature against pinned approver key. Verify issuance closure signature against pinned issuer key. Ensure issued count does not exceed public eligible count.

* Step 3: Independent Final Witness Checkpoint
  Verify witness final checkpoint signature against pinned witness key. Confirm checkpoint kind is marked FINAL. Match election ID, manifest digest, issued count, and roster commitment.

* Step 4: Merkle Tree Consistency
  Verify that leaves form a continuous sequence from 0 to N minus 1 without gaps or duplicate leaf indices, matching final tree size N.

* Step 5: Canonical Bytes and Merkle Root Recomputation
  Recompute canonical RFC 8785 bytes for each ballot leaf. Compute leaf hashes with 0x00 prefix. Verify last leaf digest matches witness checkpoint. Compute RFC 9162 Merkle tree root and verify exact match with witness final checkpoint.

* Step 6: Credential Proofs and Nullifier Uniqueness
  Confirm all credential nullifiers are strictly unique across all leaves. Verify cryptographic credential proofs using pinned issuer key.

* Step 7: Engine Ballot Proofs and Tally Verification
  Decode native engine ballots and verify cryptographic validity and tally proofs. A plaintext development fixture is not accepted by the strict command.

* Step 8: Blockchain Contract Anchor and Finality
  Verify chain ID, contract address, and contract code hash match pinned values. Verify anchored digest matches witness final checkpoint or Merkle root. Confirm transaction has reached finalized status with sufficient confirmation depth.

* Step 9: Parser Safety and Boundary Protection
  Strictly reject path traversal attempts such as parent directory references. Strictly reject symlinks in archives or directories. Strictly reject duplicate keys in JSON payloads. Strictly reject float values in canonical records. Enforce maximum archive size of 100 megabytes and maximum uncompressed content limit of 500 megabytes.

* Step 10: Compliance Report Generation
  Output report JSON documenting statuses for all 11 required properties.

## Reported Properties

* RECORD_INTEGRITY: Merkle tree consistency, leaf completeness, root matching
* CREDENTIAL_UNIQUENESS: Nullifier uniqueness and valid issuer proofs
* ROSTER_ATTESTATION: Independent roster approval verification
* TALLY_PROOF: Recomputed tally match against announced totals
* ANCHOR_FINALITY: Consortium blockchain anchor verification and finality
* BALLOT_SECRECY_ASSUMPTIONS: Documented cryptographic engine assumptions
* CAST_AS_INTENDED: Inclusion proofs verifiable against witnessed root
* RECEIPT_FREENESS: Limited property documented in privacy limitations
* COMPROMISED_ENDPOINT_RESISTANCE: Limited property regarding endpoint malware
* INDEPENDENT_OPERATORS: Distinct operational roles for authorities
* REAL_WORLD_ELIGIBILITY: Pre election roster verification

Property statuses include PASS, FAIL, LIMITED, ASSUMED, NOT_SUPPORTED, or UNVERIFIABLE.

## Exit Codes

* 0: All mandatory cryptographic and authorization checks pass
* 2: Cryptographic or authorization failure detected
* 3: Unverifiable election evidence due to missing or untrusted material
* 4: Bad archive, unsafe path traversal, symlink, duplicate keys, or malformed JSON
