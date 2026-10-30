# HimVote web implementation status

This file is a web scoped pointer. The authoritative current status for the
whole repository is [`FEATURE_STATUS.md`](../../FEATURE_STATUS.md).

## Verified in the current checkout

- `npm run typecheck` passes using the installed web dependencies.
- `/usr/bin/node node_modules/vitest/vitest.mjs run` passes 15 files and 90 tests.
- `/usr/bin/node node_modules/next/dist/bin/next build` passes.
- The production browser smoke script passes public rendering, CSP hydration,
  reduced motion, mobile navigation, and unauthenticated private route guards.
- Admin, officer, teacher, auditor, and student pages use service clients or
  explicit unavailable and limited states rather than silently substituting
  fixture records in the reviewed workflows.

## Explicit limits

The browser ballot producer currently targets HimVote's custom development
engine. That engine reports `established_protocol=false`; it is not an
independently reviewed election engine. A real-election claim remains blocked
until an established engine, its native booth, its proof verifier, and its
independent tally workflow are integrated.

The browser cannot independently establish witness custody from an API root
alone. Receipt states therefore remain limited until an externally pinned
witness checkpoint and standalone verifier report are available.

The normal `npm test` wrapper on this host resolves `node` to Bun 1.4.2 and
its esbuild service stops while loading Vitest. The same Vitest command under
the installed system Node binary passes. This is an environment issue, not a
test result to hide.
