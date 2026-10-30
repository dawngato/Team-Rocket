# SecureVote completion gap analysis

Date: 2026 10 30

This report is based on the files actually present in `Team Rocket`. The requested SecureVote folders, five reference documents, source archives, independent engine verifier bundle, and external audit report are absent. They are not treated as inspected.

## Evidence boundary

The active product namespace is HimVote. Existing tests, fixtures, service code, web code, Android code, iOS source, WinUI source, Avalonia Linux source, Solidity source, witness source, and verifier source were inspected. Local development evidence is not production certification.

## Gap register

| ID | Area | Finding | Severity | Current state | Acceptance evidence |
| --- | --- | --- | --- | --- | --- |
| G01 | Source reconciliation | The requested specifications and Helios, Belenios, and ElectChain archives are missing. | Critical | BLOCKED | `tools/source_audit.py` reports `INCOMPLETE`. |
| G02 | Voting engine | Profile VEEM is a development adapter, not a selected external engine with an official independent verifier. | Critical | LIMITED | `docs/crypto_engine_review.md`, `docs/ENGINE_DECISION.md`, and engine tests. |
| G03 | One accepted cast | Casting database uniqueness and row locking are tested, but external engine native revoting semantics remain unreviewed. | Critical | LIMITED | `services/casting/tests`, `tests/acceptance`. |
| G04 | Admin identity | The admin API previously accepted caller supplied actor headers. Production now rejects development actor assertions unless explicitly enabled, but a real identity gateway assertion is not integrated. | Critical | LIMITED | `services/admin_api/src/routers/elections.py`, `services/admin_api/tests/test_api_endpoints.py`. |
| G05 | Casting lifecycle control | Internal open and close routes previously had no production authentication. They now require `INTERNAL_CONTROL_TOKEN` in production. Service mesh identity and rotation remain deployment work. | High | LIMITED | `services/casting/src/security.py`, `services/casting/tests/test_security.py`. |
| G06 | Account recovery | Recovery now has a one time hashed token, reset endpoint, expiry, replay rejection, and session revocation. Production remains blocked until an independently controlled notification adapter is configured. | High | LIMITED | `services/identity_issuer/routers/auth.py`, `services/identity_issuer/tests/test_auth_flow.py`. |
| G07 | MFA custody | TOTP secrets are stored as secret material in the identity database model and bootstrap returns the secret. Hardware backed WebAuthn is not implemented. | High | LIMITED | `services/identity_issuer/models.py`, `routers/bootstrap.py`. |
| G08 | Role scope | Role data has scope fields and local tests cover invitation and approval behavior. Full tenant, department, and election scope enforcement across every endpoint is not proven. | High | LIMITED | Identity router tests and missing endpoint matrix. |
| G09 | Election approval | Lifecycle and freeze guards exist. Several admin router endpoints still use the actor boundary rather than a validated role and scope decision. | High | LIMITED | `services/admin_api/src/routers/elections.py`. |
| G10 | Witness independence | The repository has a witness service and local emulator. A separate organization, separate key custody, and independent operational history are not present locally. | Critical | LIMITED | `witness/`, `docs/witness_deployment_guide.md`. |
| G11 | Chain finality | Solidity contract and relayer source exist. Foundry is unavailable in this environment and no production network finality evidence exists. | High | NOT_BUILT | `chain/`, `services/anchor_relayer/`. |
| G12 | Desktop target | Avalonia Linux source exists under `apps/desktop/HimVote.Linux`. The Windows client remains WinUI 3, which conflicts with the requested Avalonia Windows target. Native build execution is not available in this environment. | High | LIMITED | `apps/desktop/HimVote.Linux`, `apps/desktop/HimVote.Windows`. |
| G13 | iOS | SwiftUI source and tests exist, but macOS and Xcode are required and were not available. | High | NOT_BUILT | `apps/ios/Package.swift`, `docs/platform_test_matrix.md`. |
| G14 | Evidence verifier | Standalone audit, attestation, and inclusion verification are implemented with external trust inputs and fail closed statuses. Native external engine proof verification remains blocked by G02. | High | LIMITED | `verifier/`, `verifier/test_verifier.py`, `tests/test_verifier.py`. |
| G15 | Production infrastructure | Compose profiles exist, but real HSM or KMS, two independent database operations, mTLS, backup restoration, and independent witness operations are not proven here. | Critical | LIMITED | `compose.prod.yaml`, `infrastructure/`, production gate. |
| G16 | Privacy | Identity and casting service boundaries and header rejection are tested. Network timing correlation, colluding logs, small electorates, and compromised devices remain unresolved limitations. | High | LIMITED | `docs/privacy_limitations.md`, casting security tests. |
| G17 | API contract | OpenAPI exists and client source exists. Generated client drift and complete parity across all platforms require CI on native runners. | Medium | LIMITED | `packages/openapi/`, `.github/workflows/ci.yml`. |
| G18 | External audit findings | F01 through F20, H01 through H16, and B01 through B17 cannot be mapped to upstream code because the archives and audit report are absent. | Critical | BLOCKED | `docs/SOURCE_ATTRIBUTION.md`, source audit output. |

## Completed in this pass

The following code changes are real and locally tested.

1. Admin CORS now uses configured origins rather than wildcard origins with credentials.
2. Admin request identifiers are generated by the server rather than reflected from a caller header.
3. Admin lifecycle actions fail closed when development actor assertions are disabled.
4. Casting open and close routes require an internal control token in production mode.
5. Regression tests cover both production guard behaviors.
6. The standalone verifier supports `python -m verifier verify`, signed final root checking, and `--verify-inclusion` tracker validation.

## Next order

1. Obtain the missing reference inputs and rerun source license and finding reconciliation.
2. Select an external engine through a real native proof of concept.
3. Add a production recovery notification adapter and validated identity assertions before enabling production admin actions.
4. Run Foundry, Windows, iOS, and staging topology checks on their required runners.
5. Obtain independent security, cryptographic, privacy, accessibility, and operational review.

