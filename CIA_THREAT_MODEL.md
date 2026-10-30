# CIA threat model

SecureVote is an educational synthetic prototype. The claims below are
property-specific and do not imply real-election readiness.

| Asset | Confidentiality | Integrity | Availability | Evidence |
|---|---|---|---|---|
| Student identity/roster | scoped identity service only | approval and frozen roster digest | bounded imports/recovery | identity/admin tests |
| Ballot choice | engine ciphertext and no identity in casting model | native proof required; local wrapper is not enough | fail closed when engine unavailable | casting boundary and engine gate |
| One-vote authorization | opaque proof on casting origin | nullifier uniqueness + transaction lock | idempotent retry/status lookup | casting concurrency tests |
| Accepted evidence | no direct identity or plaintext choice | canonical leaf, ordered log, witness checkpoint | durable outbox and replay | checkpoint/verifier tests |
| Published tally | aggregate release only | native tally proof + independent verifier | downloadable final report | currently `NOT_CHECKED` for native proof |
| Trust material | auditor-controlled store | out-of-band key/fingerprint comparison | alternate safe distribution | verifier trust-pin tests |

## Adversaries and negative tests

- Guest requests a private endpoint: deny without embedding protected data.
- Teacher requests another department: deny at service/query scope.
- Student requests another receipt: opaque holder token is required; no identity
  recovery join is allowed.
- Operator inserts, deletes, or edits an accepted record: final checkpoint,
  canonical digest, or verifier consistency fails.
- A credential is replayed concurrently: at most one accepted leaf is created.
- A result total changes without matching proof: verifier fails and publication
  remains blocked.
- A witness key is replaced in the archive: separately pinned key rejects it.

## Residual risk

Compromised voter devices, traffic analysis, coercion, colluding issuer/caster
operators, small electorates, malicious trustees, unavailable external witness,
and the absence of a validated external election engine remain material limits.
