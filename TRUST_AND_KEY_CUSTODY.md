# Trust and key custody

## Current local model

The repository has local witness keys, local chain adapters, fixture trust pins,
and an auditor/verifier flow. These are reproducible development artifacts. They
are not independently operated authorities when generated and retained by the
same checkout/operator.

## Required production custody

| Key/material | Required owner | Must not be controlled by |
|---|---|---|
| Identity/issuer key | identity authority | casting database administrator |
| Election/trustee shares | separately designated trustees | web/admin operator alone |
| Witness signing key/history | external witness organization | election database operator |
| Auditor attestation key | independent auditor | election officer/admin |
| Public trust pins | auditor-installed out-of-band store | imported archive alone |
| Chain relayer key | relayer operator | trustee or voter identity service |

The verifier must reject an archive-supplied replacement for a pinned key. A
local Anvil chain is `LOCAL_ANVIL`, not independent finality. `ACCEPTED`,
`WITNESSED`, `ANCHORED`, `INCLUDED_FINAL`, and `TALLY_VERIFIED` remain distinct.

## Evidence required before publication

An auditor must obtain the trust bundle independently, compare fingerprints,
verify signed manifest/checkpoint continuity, run the standalone verifier, and
retain a signed report. Any `FAIL`, missing final checkpoint, key mismatch, or
`ENGINE_NATIVE_TALLY: NOT_CHECKED` blocks publication.
