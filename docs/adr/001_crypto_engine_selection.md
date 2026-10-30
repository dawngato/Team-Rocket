# Architecture Decision Record 001: Cryptographic Engine Selection and Profile VEEM

## Status
Development decision only. Live secret ballot elections remain blocked until an external vetted engine binding and the production readiness gate are complete.

## Date
2026_10_30

## Context
HimVote Gate E1 requires a vetted voting engine that can create an encrypted ballot, export native proofs, pass an independent verifier, fail on one byte tamper, enforce single cast without revoting, and expose a supported web booth.

Candidates evaluated:
* Belenios: AGPL, OCaml, native revoting semantics. Conflicts with irrevocable single cast statutes unless the core state machine is rewritten.
* ElectionGuard: MIT, Python and C++ references, cast and spoil lifecycle, heavy Guardian ceremony footprint.

Hard rule from prompt Section 0.1: no custom cryptography for ballot encryption. Clients must use the booth or API of the chosen vetted engine.

## Decision
1. The local adapter suite in `services/election_engine/gate_e1.py` passes its development fixtures against Profile VEEM. It uses reviewed library primitives for credential shaped data, canonicalization, Merkle hashing, and checkpoints, plus a local encrypted ballot path.
2. Profile VEEM is a development and protocol integration stand in. It is not a substitute for Belenios or ElectionGuard external review.
3. Production secret ballot language is LIMITED until ElectionGuard or another vetted engine is wired through `services/election_engine` adapter functions without inventing unsupported proof formats.
4. Single cast enforcement for the casting cluster remains authoritative in PostgreSQL unique constraints and the election row lock, independent of engine revoting defaults.

## Gate E1 evidence recorded in this repository
* Command: `python services/election_engine/gate_e1.py`
* Observed: local adapter checks passed on 30 October 2026
* Limits: no external ElectionGuard or Belenios package binding yet; step 6 booth embed is represented by `booth.py` helper, not a third party booth binary; ballot secrecy claims must show LIMITED or ASSUMED in verifier reports

## Consequences
* Positive: protocol surfaces for cast, export, tally verify, and nullifier uniqueness are exercised in CI.
* Negative: custom ElGamal path must not be marketed as a reviewed election system. Section 9.2 non secret voting label applies if a vetted engine cannot be integrated before go live.
* Follow up: select and bind a maintained vetted engine with a pinned official verifier, or document permanent non secret mode before any live election opens.
