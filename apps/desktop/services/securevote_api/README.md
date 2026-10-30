# SecureVote API integrity prototype

This directory is an isolated FastAPI prototype slice for SecureVote. It is
intentionally limited to server-side lifecycle and evidence mechanics:

- server-authoritative `DRAFT -> ROSTER_APPROVED -> FROZEN -> OPEN -> CLOSED`
  election state transitions;
- synthetic role headers with backend authorization checks;
- frozen candidate and roster data;
- SQLite `BEGIN IMMEDIATE` transactions for strict one-accepted-ballot
  enforcement and close/cast serialization;
- deterministic JSON evidence leaves and SHA-256 record digests;
- a durable SQLite outbox row created in the same transaction as ballot
  acceptance; and
- privacy-safe receipt responses that do not return a student ID or candidate.

## Explicit security boundary

This is an **integrity/evidence prototype only**. It has **no vetted encrypted
election engine**, no native ballot proof validation, no tally proof, no blind
credential protocol, no independent witness, no blockchain anchor, and no
claim of ballot secrecy, receipt-freeness, coercion resistance, or real-election
suitability. The `encrypted_ballot` and `proof_artifact` fields are opaque demo
artifacts and are not cryptographically interpreted by this service.

The synthetic credential table retains a student-to-credential relationship in
the identity-side table so local eligibility can be demonstrated. Accepted
ballot records contain only a credential digest and no `student_id`; this is
not sufficient to establish unlinkability against a colluding operator.

## Run locally

From this directory:

```bash
python -m venv .venv
. .venv/bin/activate
python -m pip install -e '.[test]'
uvicorn securevote_api.app:app --reload
```

The default database is `securevote.sqlite3` in the current working directory.
Set `SECUREVOTE_DB_PATH` to choose another SQLite file. For a local health
check, open `http://127.0.0.1:8000/healthz`.

All API mutations require `X-Actor-Role` and `X-Actor-ID` headers. These headers
are a synthetic demo authorization mechanism, not production authentication.
Casting accepts a pre-provisioned opaque synthetic credential and never accepts
`student_id` or `candidate_id` in the ballot request.

## Test

```bash
pytest
```

The tests cover invalid lifecycle transitions, post-freeze mutation attempts,
100 concurrent duplicate submissions, close/cast race semantics, unauthorized
roles, deterministic evidence/outbox behavior, health, and the absence of
`student_id` from ballot records.
