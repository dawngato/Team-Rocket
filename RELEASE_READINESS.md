# Release readiness

## Decision

**Not ready for a real election.** Suitable for a synthetic educational demo of
local authorization, encrypted-ballot-shaped boundaries, append-only evidence,
receipt inclusion mechanics, and controlled tamper detection.

## Blocking gates

- Pin and validate one established election engine and native tally verifier.
- Prove one-accepted-ballot semantics against that engine's actual credential/
  re-vote protocol.
- Deploy identity, casting, witness, and auditor trust domains with separate
  privileges and independently controlled operators.
- Complete server-authenticated scope enforcement for all web role routes.
- Produce a final archive plus out-of-band trust bundle and run all five attack
  demonstrations from clean evidence copies.
- Complete Android tests in a stable Gradle environment; build iOS only on
  macOS/Xcode; run desktop and contract toolchains before claiming them.

## Demo-safe claims

The jury/demo may show synthetic data, truthful `PENDING_WITNESS`/`LIMITED`
states, duplicate rejection, verifier PASS/FAIL for the wrapper, and the Android
privacy correction. It must say that the repository is an educational prototype
and that local witness/chain fixtures do not establish independent custody.

## Release status vocabulary

Use `NOT_STARTED`, `IMPLEMENTED_UNTESTED`, `TESTED_PASS`, `TESTED_FAIL`,
`LIMITED`, or `BLOCKED` with a source path and exact command. Never replace a
missing verification result with a green UI badge.
