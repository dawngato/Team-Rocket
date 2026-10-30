# Web scope and evidence boundary

The earlier web only audit is superseded by the repository wide register at
[`FEATURE_STATUS.md`](../../FEATURE_STATUS.md). This file preserves the web
specific boundaries that still matter when reviewing the application.

## Current web behavior

- Public pages render without privileged navigation or operational fixture
  metrics.
- Production middleware redirects unauthenticated private route families to
  the login page.
- Student credential and ballot pages validate same election handoffs and
  create the current custom engine's encrypted ballot artifacts in the
  browser.
- Service clients validate response shapes and surface API failures instead
  of reporting local success.
- Receipt inclusion is mathematically checked only when the casting service
  supplies complete evidence. The API supplied root is not an independent
  trust root.

## Current conflicts and limits

| Area | Current resolution |
|---|---|
| Established election engine | The custom engine is labeled development and unverified. Production requires an external established provider and blocks otherwise. |
| Independent witness | Local witness and chain profiles are simulated. The web shows limited status without an out of band pinned checkpoint. |
| Auditor signing | The web imports an externally signed attestation; it never exports or handles a private signing key. |
| Native handoff | Android uses configured HTTPS build values. iOS rejects secret artifacts in URLs and waits for a secure back channel. Native builds were not run here. |
| Backend authority | Admin, teacher, officer and auditor mutations call service boundaries. A deployed production run is still needed for actor scope, MFA, migrations and delivery adapters. |
| Test runtime | Web tests pass under system Node. The host `npm` command resolves `node` to Bun 1.4.2, whose esbuild service stops during Vitest startup. |

No row in this file should be read as evidence of real election suitability;
see the root register for executed commands and remaining blockers.
