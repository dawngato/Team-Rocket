# Election engine compatibility report

## Result

**BLOCKED for the official engine gate.** The repository contains an executable
development-profile adapter and strict casting boundary, but no completed
compatibility validation against a checked-out Helios, Belenios, ElectionGuard,
or equivalent established election engine version.

## Observed code

- `services/election_engine/` exposes a local development adapter.
- `services/casting/src/engine_client.py` delegates ballot/proof validation in
  remote mode and fails closed when the validator is unavailable or malformed.
- `services/casting/src/service.py` never treats base64 decoding as cryptographic
  proof validation.
- `apps/android/.../CredentialRepository.kt` intentionally refuses to mint a
  locally hashed credential when the validated blind-credential protocol is not
  available.
- `apps/desktop/verifier/` reports `ENGINE_NATIVE_TALLY: NOT_CHECKED`.

## Required release gate

1. Pin one upstream engine version, source digest, license, and official verifier.
2. Produce a synthetic encrypted election using the native protocol.
3. Validate credential issuance, ballot proof, accepted set, trustee decryption,
   tally proof, and announced result with the native verifier.
4. Prove the intended one-accepted-ballot policy against actual engine replay/
   re-vote semantics, not only a database unique constraint.
5. Store golden byte vectors and run them from web, Android, iOS, and desktop
   clients that are actually built.

Until those steps pass, use `LIMITED`/`BLOCKED`, never `VERIFIED` or `AUDIT_PASS`.
