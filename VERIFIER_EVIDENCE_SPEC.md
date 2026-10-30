# Standalone verifier evidence specification

The verifier accepts an untrusted directory/ZIP and a separately supplied trust
file. It uses strict JSON parsing, safe archive extraction, canonical bytes,
detached signatures, domain-separated Merkle hashing, and property-specific
verdicts.

## Required inputs

```text
securevote-verify --archive final-election-export.zip \
  --trust externally-obtained-trust-pins.json \
  --report audit-report.json
```

The local wrapper's actual CLI is documented in
`apps/desktop/verifier/README.md` and `apps/desktop/verifier/cli.py`. The root
verifier is `verifier/verify.py`.

## Checks

| Check | Verdict rule |
|---|---|
| Archive safety | reject traversal, symlinks, encrypted/duplicate/oversized members |
| Manifest | canonical digest and detached signature match external pin |
| Ballots | ordered leaves, unique opaque IDs/nullifiers, no identity/plaintext choice fields |
| Merkle evidence | recompute root and checkpoint continuity |
| Witness | signed key, sequence, tree size, root, and final digest match external pin |
| Tally | announced shape/digest consistent; native election-engine proof required for PASS |
| Optional chain | chain ID, contract, code hash, receipt, finality, and reorg state |

The wrapper intentionally reports native engine tally as `NOT_CHECKED`. A report
with only integrity-wrapper PASS values cannot authorize a real result.
