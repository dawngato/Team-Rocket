# HimVote — Linux Client ↔ Backend API Contract

Single source of truth for the Flutter Linux app. Both feature agents code against
this. Base URL is configured per-origin in the Settings screen (defaults to
`http://localhost:8080`). All bodies are JSON. All authenticated calls send
`Authorization: Bearer <token>` obtained from `/v1/auth/login`.

## Origins (3 independent, set in Settings)
- Identity Origin (auth): default `http://localhost:8080`
- Casting Origin (anonymous ballot): default `http://localhost:8081`
- Witness Origin (independent): default `http://localhost:8082`

## Auth — Identity Origin
| Method | Path | Body | Returns |
|--------|------|------|---------|
| POST | `/v1/auth/login` | `{identifier, password, mfa_token?}` | `{access_token, session, profile}` |
| POST | `/v1/auth/logout` | — | 200 |
| POST | `/v1/auth/mfa/setup` | `{}` | `{secret, qr}` |
| POST | `/v1/auth/mfa/verify` | `{code}` | `{ok}` |
| GET  | `/v1/auth/me` | — | `SessionProfile` |
| POST | `/v1/auth/claim` | `{student_number, ...}` | `BootstrapClaimResponse` |

## Elections & Candidates — Identity Origin
| Method | Path | Returns |
|--------|------|---------|
| GET | `/v1/elections` | `ElectionList` (list; filter by status) |
| GET | `/v1/elections/{id}` | `Election` |
| GET | `/v1/elections/{id}/candidates` | `List<Candidate>` |
| GET | `/v1/elections/{id}/results` | `PublishedResults` |
| GET | `/v1/elections/{id}/evidence` | evidence archive |
| POST | `/v1/elections` | create (admin) |
| POST | `/v1/elections/{id}/open\|pause\|close\|freeze\|cancel` | admin |
| PUT  | `/v1/elections/{id}` | update (admin) |

## Ballot — Casting Origin (Rule 0.1(3): no ballot crypto in the client)
| Method | Path | Body | Returns |
|--------|------|------|---------|
| POST | `/v1/cast/` | `{election_id, selections[]}` | `{btch: receipt handle, receipt_wallet_entry}` |
| POST | `/v1/engine/encrypt_ballot` | vote payload | `EncryptBallotResponse` |
| POST | `/v1/engine/validate_ballot` | ballot | `ValidateBallotResponse` |

## Receipt Verification — Witness / Identity Origin
| Method | Path | Returns |
|--------|------|---------|
| POST | `/v1/engine/verify_inclusion` | `VerifyInclusionResponse` (RFC 9162 proof) |
| POST | `/v1/engine/verify_tally` | `VerifyTallyResponse` |
| GET  | `/witness/public_key` | witness Ed25519 key (for pin verification) |

## Admin Audit Trail — Identity Origin
| Method | Path | Returns |
|--------|------|---------|
| GET | `/v1/admin/audit-events` | `AuditEventList` (append-only admin log) |
| GET | `/v1/admin/approvals` | pending admin approvals |
| GET | `/v1/health` | 200 |

## Data shapes (minimal fields the Linux UI consumes)
- `Election`: `{id, title, status: draft|scheduled|open|paused|closed|counting|certified|archived, starts_at, ends_at, description}`
- `Candidate`: `{id, name, slate, manifesto, photo_url?}`
- `ElectionList`: `[{id, title, status, ...}]`
- `LoginResponse`: `{access_token, profile: {id, role, name, email}}`
- `VerifyInclusionResponse`: `{status: WITNESSED|ANCHORED, proof, leaf_index}`
- `CastResponse`: `{btch, submission_status, stages: [SUBMITTED, ACCEPTED, WITNESSED, ANCHORED]}`

## Rules
1. The Linux client NEVER encrypts a ballot itself (Rule 0.1(3)) — it hands the
   vote to the Casting Origin `/v1/cast/` / engine.
2. Receipts are stored locally at `$XDG_DATA_HOME/himvote/receipts.json`.
3. Settings persist at `$XDG_CONFIG_HOME/himvote/settings.json`.
4. On network absence (audit/offline mode) the client uses the headless engine via
   `apps/linux/himvote_linux.py --headless` (kept as the Python verifier) — do NOT
   reimplement RFC 9162 / blind-signature crypto in Dart.