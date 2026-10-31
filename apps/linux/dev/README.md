# HimVote mock /v1 server (DEV ONLY — never ship)

Local stand-in for the real 16-container Docker backend, built exactly from
`../API_CONTRACT.md`. Gives the Flutter Linux client a live /v1 target on this
box (which has no Docker/WSL) until Phase 5 wires the real gateway.

## Run

    python apps/linux/dev/mock_v1_server.py          # ports 8080/8081/8082
    python apps/linux/dev/mock_v1_server.py --offset 100   # 8180/8181/8182

Stdlib only — no pip installs. Ctrl+C to stop.

## Origins (as the Flutter Settings screen expects)

  Identity   http://localhost:8080   auth, elections, admin audit
  Casting    http://localhost:8081   cast ballot, engine endpoints
  Witness    http://localhost:8082   verify_inclusion, verify_tally, public_key

## Demo logins (Identity origin)

  admin@campus.edu / admin123   (role: admin)
  demo@campus.edu  / demo123    (role: student)

Any request that needs a token: POST /v1/auth/login, then
`Authorization: Bearer <access_token>`.

## Seeded data (resets on restart — state is in-memory)

  elec-1  Student Council President 2026      status: open      4 candidates
  elec-2  Drama Society Committee 2026        status: counting  850 ballots tallied
  elec-3  Fee Clause Amendment Referendum     status: scheduled 2 candidates

Ballots cast via /v1/cast/ immediately return a 4-stage receipt
(SUBMITTED -> ACCEPTED -> WITNESSED -> ANCHORED) and increment the mock tally,
so ResultsComparison / DIFF chips have real numbers. One-student-one-vote is
enforced when `student_number` is sent in the cast body (409 on repeat).

## Swap to the live backend (Phase 5)

Same contract, same port defaults. Point the three origin base URLs at the real
gateway and stop this process — no client code changes expected. If the real
service ever differs from API_CONTRACT.md, the contract is the source of truth;
file an issue rather than patching the mock silently.
