#!/usr/bin/env python3
"""
HimVote dev mock — /v1 API server per apps/linux/API_CONTRACT.md.

DESIGN: three origins on three ports, exactly as the contract defines:
  Identity origin  http://localhost:8080  (auth, elections, admin audit)
  Casting origin   http://localhost:8081  (anonymous ballot cast + engine)
  Witness origin   http://localhost:8082  (receipt verification, tally, pubkey)

Purposes:
  1. Give the Flutter Linux app (feat/linux-flutter) a live /v1 target while the
     real 16-container Docker stack is unavailable on this dev box.
  2. Match FastAPI conventions ({detail: ...} errors, Bearer tokens, status
     codes) so swapping mock -> live gateway in Phase 5 is config-only.

DEV ONLY — never ship this. Stdlib only (no pip installs needed).

Run:  python dev/mock_v1_server.py          # ports 8080/8081/8082
      python dev/mock_v1_server.py --offset 100   # 8180/8181/8182
Stop: Ctrl+C
"""
import argparse
import json
import random
import re
import string
import threading
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

STARTED_AT = time.time()

# --------------------------------------------------------------------------- #
# State (in-memory, seeded; resets on restart)                                #
# --------------------------------------------------------------------------- #

WITNESS_PUBKEY = (
    "b1d7a2f3c4e5d6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2"
)

def iso(offset_s):
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() + offset_s))

class State:
    def __init__(self):
        self.tokens = {}                 # token -> profile
        self.ballots = {}                # btch -> receipt entry
        self.audit_events = []
        self.approvals = []
        self.voted = {}                  # election_id -> set(student_number)
        self._seed()

    def log_audit(self, actor, action, target, detail=""):
        ev = {
            "id": str(uuid.uuid4()),
            "at": iso(0),
            "actor": actor,
            "action": action,
            "target": target,
            "detail": detail,
        }
        self.audit_events.append(ev)
        return ev

    def _seed(self):
        # --- users -----------------------------------------------------------
        self.users = {
            "admin@campus.edu": {"id": "u-admin-1", "password": "admin123",
                                 "role": "admin", "name": "Ada Admin",
                                 "email": "admin@campus.edu",
                                 "student_number": "ADM-0001"},
            "demo@campus.edu": {"id": "u-stu-1", "password": "demo123",
                                "role": "student", "name": "Demo Student",
                                "email": "demo@campus.edu",
                                "student_number": "STU2026001"},
            "priya@campus.edu": {"id": "u-stu-2", "password": "demo123",
                                 "role": "student", "name": "Priya Nair",
                                 "email": "priya@campus.edu",
                                 "student_number": "STU2026017"},
        }
        # --- elections --------------------------------------------------------
        self.elections = {
            "elec-1": {
                "id": "elec-1",
                "title": "Student Council President 2026",
                "status": "open",
                "starts_at": iso(-7200), "ends_at": iso(86400),
                "description": "Annual election for Student Council President.",
            },
            "elec-2": {
                "id": "elec-2",
                "title": "Drama Society Committee 2026",
                "status": "counting",
                "starts_at": iso(-172800), "ends_at": iso(-3600),
                "description": "Committee seats for the Drama Society.",
            },
            "elec-3": {
                "id": "elec-3",
                "title": "Fee Clause Amendment Referendum",
                "status": "scheduled",
                "starts_at": iso(7200), "ends_at": iso(172800),
                "description": "Ratify the revised fee-clause amendment.",
            },
        }
        # --- candidates --------------------------------------------------------
        self.candidates = {
            "elec-1": [
                {"id": "c-1-1", "name": "Aarav Mehta", "slate": "Merit Coalition",
                 "manifesto": "Transparent budgets, better hostel infrastructure."},
                {"id": "c-1-2", "name": "Sofia D'Souza", "slate": "Unity Front",
                 "manifesto": "Mental-health support and open forums."},
                {"id": "c-1-3", "name": "Rohan Verma", "slate": "Innovate Now",
                 "manifesto": "Tech labs, hackathons and industry mentorship."},
                {"id": "c-1-4", "name": "Nandini Rao", "slate": "Green Campus",
                 "manifesto": "Sustainability, recycling and solar power."},
            ],
            "elec-2": [
                {"id": "c-2-1", "name": "Kabir Shah", "slate": "Ensemble",
                 "manifesto": "Annual productions and street-play workshops."},
                {"id": "c-2-2", "name": "Meera Iyer", "slate": "Spotlight",
                 "manifesto": "Film club crossover and lighting upgrades."},
                {"id": "c-2-3", "name": "Dev Patel", "slate": "Curtain Call",
                 "manifesto": "Backstage training and equipment audit."},
            ],
            "elec-3": [
                {"id": "c-3-1", "name": "Yes — Ratify", "slate": "Amendment text",
                 "manifesto": "Adopt the revised fee clause as drafted."},
                {"id": "c-3-2", "name": "No — Reject", "slate": "Amendment text",
                 "manifesto": "Send the clause back to committee."},
            ],
        }
        # --- seeded tally for the counting election (elec-2) -------------------
        self.tallies = {
            "elec-1": {"c-1-1": 0, "c-1-2": 0, "c-1-3": 0, "c-1-4": 0},
            "elec-2": {"c-2-1": 412, "c-2-2": 287, "c-2-3": 151},
            "elec-3": {"c-3-1": 0, "c-3-2": 0},
        }
        self.total_ballots = {"elec-1": 0, "elec-2": 850, "elec-3": 0}
        # --- audit trail --------------------------------------------------------
        self.log_audit("system", "ELECTION_CREATED", "elec-2",
                       "Drama Society Committee")
        self.log_audit("system", "ELECTION_OPENED", "elec-1",
                       "Student Council President 2026")
        self.log_audit("admin@campus.edu", "ELECTION_CLOSED", "elec-2",
                       "polls closed; tally frozen")
        self.approvals = [
            {"id": "ap-1", "kind": "ELECTION_CREATE", "at": iso(-1800),
             "summary": "Poster: Sports Secretary by-election 2026 (open 72h)",
             "status": "pending"},
            {"id": "ap-2", "kind": "ELECTION_FREEZE", "at": iso(-600),
             "summary": "Freeze elec-2 tally for independent recount",
             "status": "pending"},
        ]


STATE = State()

# --------------------------------------------------------------------------- #
# Route tables per origin                                                     #
# --------------------------------------------------------------------------- #

def _json_body(handler):
    length = int(handler.headers.get("Content-Length") or 0)
    if not length:
        return {}
    try:
        return json.loads(handler.rfile.read(length) or b"{}")
    except json.JSONDecodeError:
        return {}


def _bearer_token(handler):
    auth = handler.headers.get("Authorization") or ""
    return auth[7:] if auth.startswith("Bearer ") else None


def _require_auth(handler):
    token = _bearer_token(handler)
    profile = STATE.tokens.get(token)
    if not profile:
        handler.respond(401, {"detail": "Not authenticated"})
        return None
    return profile


def _election_or_404(handler, eid):
    election = STATE.elections.get(eid)
    if not election:
        handler.respond(404, {"detail": f"Election {eid} not found"})
        return None
    return election


# ---------------------------- Identity :8080 -------------------------------- #

def identity_routes():
    return [
        (r"^/v1/health$", "GET", id_health),
        (r"^/v1/auth/login$", "POST", auth_login),
        (r"^/v1/auth/logout$", "POST", auth_logout),
        (r"^/v1/auth/mfa/setup$", "POST", auth_mfa_setup),
        (r"^/v1/auth/mfa/verify$", "POST", auth_mfa_verify),
        (r"^/v1/auth/me$", "GET", auth_me),
        (r"^/v1/auth/claim$", "POST", auth_claim),
        (r"^/v1/elections$", "GET", elections_list),
        (r"^/v1/elections$", "POST", elections_create),
        (r"^/v1/elections/([^/]+)$", "GET", election_get),
        (r"^/v1/elections/([^/]+)$", "PUT", election_update),
        (r"^/v1/elections/([^/]+)/candidates$", "GET", election_candidates),
        (r"^/v1/elections/([^/]+)/results$", "GET", election_results),
        (r"^/v1/elections/([^/]+)/evidence$", "GET", election_evidence),
        (r"^/v1/elections/([^/]+)/(open|pause|close|freeze|cancel)$",
         "POST", election_transition),
        (r"^/v1/admin/audit-events$", "GET", admin_audit_events),
        (r"^/v1/admin/approvals$", "GET", admin_approvals),
    ]


def id_health(handler, _m):
    handler.respond(200, {"status": "ok", "origin": "identity", "service": "himvote-mock"})


def auth_login(handler, _m):
    body = _json_body(handler)
    identifier = str(body.get("identifier", "")).strip().lower()
    password = body.get("password")
    user = STATE.users.get(identifier)
    if not user or user["password"] != password:
        handler.respond(401, {"detail": "Invalid identifier or password"})
        return
    token = "t_" + "".join(random.choices(
        string.ascii_lowercase + string.digits, k=32))
    profile = {k: user[k] for k in ("id", "role", "name", "email", "student_number")}
    STATE.tokens[token] = profile
    mfa_enabled = "$" in identifier  # dev trick: demo@campus.edu$ lets you see a code
    handler.respond(200, {
        "access_token": token,
        "session": {"id": str(uuid.uuid4()), "started_at": iso(0),
                    "mfa_enabled": mfa_enabled, "device": "mock-linux"},
        "profile": profile,
    })


def auth_logout(handler, _m):
    token = _bearer_token(handler)
    STATE.tokens.pop(token, None)
    handler.respond(200, {"ok": True})


def auth_mfa_setup(handler, _m):
    if not _require_auth(handler):
        return
    secret = "MOCK" + "".join(random.choices(string.ascii_uppercase + "234567", k=16))
    handler.respond(200, {"secret": secret,
                          "qr": "data:image/svg+xml;base64,MOCKQR",
                          "issuer": "HimVote", "account": "mock-user"})


def auth_mfa_verify(handler, _m):
    if not _require_auth(handler):
        return
    body = _json_body(handler)
    code = str(body.get("code", ""))
    handler.respond(200, {"ok": code in ("000000", "123456")})


def auth_me(handler, _m):
    profile = _require_auth(handler)
    if profile:
        handler.respond(200, {
            "id": profile["id"], "role": profile["role"], "name": profile["name"],
            "email": profile["email"], "student_number": profile.get("student_number"),
            "mfa_enabled": False, "verified": True,
        })


def auth_claim(handler, _m):
    body = _json_body(handler)
    student_number = str(body.get("student_number", "")).strip()
    if not student_number:
        handler.respond(400, {"detail": "student_number is required"})
        return
    handler.respond(200, {
        "claim_id": str(uuid.uuid4()),
        "status": "accepted" if student_number.isdigit() else "pending_review",
        "student_number": student_number,
        "message": "Profile claimed; vote eligibility pending registrar check.",
    })


def elections_list(handler, _m):
    qs = parse_qs(urlparse(handler.path).query)
    status = qs.get("status", [None])[0]
    out = []
    for e in STATE.elections.values():
        if status and e["status"] != status:
            continue
        out.append({**e, "candidate_count": len(STATE.candidates[e["id"]])})
    handler.respond(200, out)


def elections_create(handler, _m):
    profile = _require_auth(handler)
    if not profile:
        return
    if profile["role"] != "admin":
        handler.respond(403, {"detail": "Admin role required"})
        return
    body = _json_body(handler)
    eid = "elec-" + str(uuid.uuid4())[:8]
    election = {
        "id": eid,
        "title": body.get("title", "Untitled election"),
        "status": body.get("status", "draft"),
        "starts_at": body.get("starts_at", iso(3600)),
        "ends_at": body.get("ends_at", iso(86400)),
        "description": body.get("description", ""),
    }
    STATE.elections[eid] = election
    STATE.candidates[eid] = [{"id": f"c-{eid[-8:]}-{i}",
                              "name": c.get("name", f"Candidate {i+1}"),
                              "slate": c.get("slate", ""),
                              "manifesto": c.get("manifesto", "")}
                             for i, c in enumerate(body.get("candidates", []))]
    STATE.tallies[eid] = {c["id"]: 0 for c in STATE.candidates[eid]}
    STATE.total_ballots[eid] = 0
    STATE.voted[eid] = set()
    STATE.log_audit(profile["email"], "ELECTION_CREATED", eid, election["title"])
    handler.respond(201, election)


def election_get(handler, m):
    election = _election_or_404(handler, m.group(1))
    if election:
        handler.respond(200, {**election,
                              "candidate_count": len(STATE.candidates[election["id"]])})


def election_update(handler, m):
    profile = _require_auth(handler)
    if not profile:
        return
    election = _election_or_404(handler, m.group(1))
    if not election or profile["role"] != "admin":
        return
    body = _json_body(handler)
    for k in ("title", "status", "starts_at", "ends_at", "description"):
        if k in body:
            election[k] = body[k]
    STATE.log_audit(profile["email"], "ELECTION_UPDATED", election["id"])
    handler.respond(200, election)


def election_candidates(handler, m):
    eid = m.group(1)
    if eid not in STATE.elections:
        handler.respond(404, {"detail": f"Election {eid} not found"})
        return
    handler.respond(200, STATE.candidates[eid])


def election_results(handler, m):
    eid = m.group(1)
    election = _election_or_404(handler, eid)
    if not election:
        return
    tally = STATE.tallies.get(eid, {})
    rows = sorted(
        ({"candidate_id": cid, "candidate_name": next(
            (c["name"] for c in STATE.candidates[eid] if c["id"] == cid), cid),
          "votes": votes} for cid, votes in tally.items()),
        key=lambda r: r["votes"], reverse=True)
    handler.respond(200, {
        "election_id": eid, "title": election["title"],
        "status": election["status"],
        "total_ballots": STATE.total_ballots.get(eid, 0),
        "turnout_pct": 68.4,
        "rows": rows,
        "published_at": iso(0) if election["status"] in ("counting", "certified") else None,
    })


def election_evidence(handler, m):
    eid = m.group(1)
    election = _election_or_404(handler, eid)
    if not election:
        return
    handler.respond(200, {
        "election_id": eid, "status": election["status"],
        "archive_url": f"http://localhost:8082/v1/evidence/{eid}.zip",
        "sha256": "0" * 64,
        "blocks": 3, "merkle_root": hex(random.getrandbits(256)),
    })


def election_transition(handler, m):
    profile = _require_auth(handler)
    if not profile:
        return
    election = _election_or_404(handler, m.group(1))
    if not election or profile["role"] != "admin":
        return
    action = m.group(2)
    election["status"] = {"open": "open", "pause": "paused", "close": "closed",
                          "freeze": "certified", "cancel": "cancelled"}[action]
    STATE.log_audit(profile["email"], f"ELECTION_{action.upper()}", election["id"])
    handler.respond(200, election)


def admin_audit_events(handler, _m):
    if not _require_auth(handler):
        return
    qs = parse_qs(urlparse(handler.path).query)
    limit = int(qs.get("limit", [50])[0])
    handler.respond(200, {"events": STATE.audit_events[-limit:][::-1],
                          "total": len(STATE.audit_events)})


def admin_approvals(handler, _m):
    if not _require_auth(handler):
        return
    handler.respond(200, {"approvals": STATE.approvals})


# ----------------------------- Casting :8081 -------------------------------- #

def casting_routes():
    return [
        (r"^/v1/health$", "GET", cast_health),
        (r"^/v1/cast/?$", "POST", cast_ballot),
        (r"^/v1/engine/encrypt_ballot$", "POST", engine_encrypt_ballot),
        (r"^/v1/engine/validate_ballot$", "POST", engine_validate_ballot),
    ]


def cast_health(handler, _m):
    handler.respond(200, {"status": "ok", "origin": "casting", "service": "himvote-mock"})


def _receipt_stages(now_epoch):
    return [
        {"stage": "SUBMITTED", "at": iso(-4), "note": "ballot accepted by Gateway"},
        {"stage": "ACCEPTED", "at": iso(-3), "note": "gateway signed & forwarded"},
        {"stage": "WITNESSED", "at": iso(-2), "note": "independent witness recorded leaf"},
        {"stage": "ANCHORED", "at": iso(0), "note": "Merkle root anchored to chain"},
    ]


def cast_ballot(handler, _m):
    body = _json_body(handler)
    election_id = body.get("election_id")
    selections = body.get("selections") or []
    if not election_id or election_id not in STATE.elections:
        handler.respond(404, {"detail": "Unknown election_id"})
        return
    election = STATE.elections[election_id]
    # one-student-one-vote (when the caller identifies itself)
    voter = body.get("student_number") or body.get("voter_id")
    if voter:
        STATE.voted.setdefault(election_id, set())
        if voter in STATE.voted[election_id]:
            handler.respond(409, {"detail": "Vote already recorded for this voter",
                                  "btch": None})
            return
        STATE.voted[election_id].add(voter)
    # record tally
    for sel in selections:
        cid = sel if isinstance(sel, str) else sel.get("candidate_id")
        if cid in STATE.tallies.setdefault(election_id, {}):
            STATE.tallies[election_id][cid] += 1
    STATE.total_ballots[election_id] = STATE.total_ballots.get(election_id, 0) + 1
    # receipt
    btch = "HV-" + "-".join(
        "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
        for _ in range(3))
    stages = _receipt_stages(time.time())
    entry = {
        "btch": btch,
        "election_id": election_id,
        "election_title": election["title"],
        "submitted_at": iso(0),
        "status": "ANCHORED",
        "voter_ref": str(uuid.uuid4())[:12],
        "stages": stages,
    }
    STATE.ballots[btch] = entry
    handler.respond(200, {
        "btch": btch,
        "submission_status": "ACCEPTED",
        "stages": [s["stage"] for s in stages],
        "receipt_wallet_entry": entry,
    })


def engine_encrypt_ballot(handler, _m):
    body = _json_body(handler)
    handler.respond(200, {
        "encrypted_ballot": hex(random.getrandbits(512)),
        "blinding_factor": hex(random.getrandbits(256)),
        "scheme": "blind-sig (mock)",
    })


def engine_validate_ballot(handler, _m):
    handler.respond(200, {"valid": True, "checks": [
        {"name": "schema", "ok": True},
        {"name": "one-vote-per-election", "ok": True},
        {"name": "candidate-id-exists", "ok": True},
    ]})


# ----------------------------- Witness :8082 -------------------------------- #

def witness_routes():
    return [
        (r"^/v1/health$", "GET", witness_health),
        (r"^/v1/engine/verify_inclusion$", "POST", witness_verify_inclusion),
        (r"^/v1/engine/verify_tally$", "POST", witness_verify_tally),
        (r"^/witness/public_key$", "GET", witness_public_key),
    ]


def witness_health(handler, _m):
    handler.respond(200, {"status": "ok", "origin": "witness", "service": "himvote-mock"})


def witness_verify_inclusion(handler, _m):
    body = _json_body(handler)
    btch = str(body.get("btch", ""))
    known = btch in STATE.ballots
    handler.respond(200, {
        "status": "ANCHORED" if known else "UNKNOWN_RECEIPT",
        "btch": btch or "HV-0000-0000-0000",
        "leaf_index": len(STATE.ballots) if known else 0,
        "proof": {
            "type": "inclusion_proof", "spec": "RFC 9162",
            "leaf_index": random.randint(0, 2 ** 20),
            "merkle_path": [hex(random.getrandbits(256)) for _ in range(6)],
            "root_hash": hex(random.getrandbits(256)),
        },
        "witness": {"pubkey": WITNESS_PUBKEY[:64],
                    "signature": hex(random.getrandbits(256))},
        "verified_at": iso(0),
    })


def witness_verify_tally(handler, _m):
    body = _json_body(handler)
    eid = body.get("election_id")
    election = STATE.elections.get(eid)
    if not election:
        handler.respond(404, {"detail": "Unknown election_id"})
        return
    tally = STATE.tallies.get(eid, {})
    expected = {cid: v for cid, v in tally.items()}
    handler.respond(200, {
        "election_id": eid,
        "status": "VERIFIED" if election["status"] in ("counting", "certified", "closed")
                  else "UNVERIFIED",
        "identity_origin_tally": expected,
        "witness_tally": dict(expected),
        "match": True,
        "ledger_ref": "0x" + "".join(random.choices(string.hexdigits.lower(), k=64)),
    })


def witness_public_key(handler, _m):
    handler.respond(200, {"public_key": WITNESS_PUBKEY, "algorithm": "Ed25519",
                          "fingerprint": WITNESS_PUBKEY[:32]})


# --------------------------------------------------------------------------- #
# HTTP plumbing (CORS enabled for Flutter web preview)                        #
# --------------------------------------------------------------------------- #

def make_handler(routes):
    compiled = [(re.compile(p), method, fn) for p, method, fn in routes]

    class Handler(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"
        server_version = "HimVoteMock/0.1"

        def log_message(self, fmt, *args):
            print(f"[{self.server.server_address[1]}] {self.command} "
                  f"{self.path} -> {args[0] if args else ''}")

        def _cors(self):
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods",
                             "GET, POST, PUT, DELETE, OPTIONS")
            self.send_header("Access-Control-Allow-Headers",
                             "Authorization, Content-Type")

        def do_OPTIONS(self):
            self.send_response(204)
            self._cors()
            self.send_header("Content-Length", "0")
            self.end_headers()

        def respond(self, code, payload):
            raw = json.dumps(payload).encode("utf-8")
            self.send_response(code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(raw)))
            self._cors()
            self.end_headers()
            self.wfile.write(raw)

        def _dispatch(self):
            parsed = urlparse(self.path)
            for pattern, method, fn in compiled:
                if method != self.command:
                    continue
                m = pattern.match(parsed.path)
                if m:
                    fn(self, m)
                    return
            self.respond(404, {"detail": "Not found"})

        do_GET = _dispatch
        do_POST = _dispatch
        do_PUT = _dispatch
        do_DELETE = _dispatch

    return Handler


def serve(port, routes):
    srv = ThreadingHTTPServer(("127.0.0.1", port), make_handler(routes))
    print(f"  {srv.server_address[0]}:{port}  ({len(routes)} routes)")
    srv.serve_forever()


def main():
    ap = argparse.ArgumentParser(description="HimVote mock /v1 server (dev only)")
    ap.add_argument("--offset", type=int, default=0,
                    help="add to base ports 8080/8081/8082")
    args = ap.parse_args()
    base = 8080 + args.offset
    print(f"HimVote mock /v1 — 3 origins (contract: apps/linux/API_CONTRACT.md)")
    print(f"Demo logins: admin@campus.edu / admin123   demo@campus.edu / demo123")
    threads = []
    for off, routes in ((0, identity_routes()), (1, casting_routes()),
                        (2, witness_routes())):
        t = threading.Thread(target=serve, args=(base + off, routes), daemon=True)
        t.start()
        threads.append(t)
    try:
        while True:
            time.sleep(3600)
    except KeyboardInterrupt:
        print("\nMock server stopped.")


if __name__ == "__main__":
    main()
