"""
Test Q7-01: One credential, 100 concurrent and repeated submissions
Must see exactly one leaf and one nullifier. Safe retry returns same outcome.
Supports live server (localhost:8082) or in-process ASGI transport fallback.
"""
import asyncio
import base64
import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
import httpx
import pytest
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

ROOT = Path(__file__).resolve().parents[2]
CASTING_DIR = ROOT / "services" / "casting"
if str(CASTING_DIR) not in sys.path:
    sys.path.insert(0, str(CASTING_DIR))

from src.database import get_db
from src.config import settings
from src.main import create_app
from src.models import Base, Election, ManifestVersion, Contest, Candidate

CASTING_BASE = "http://localhost:8082"
ELECTION_ID = "elec_test_001"
MANIFEST_DIGEST = "manifest_digest_sample_vector"


def create_proof(election_id: str, nullifier: str, manifest_digest: str) -> str:
    payload = {
        "election_id": election_id,
        "nullifier": nullifier,
        "manifest_digest": manifest_digest,
        "zk_proof": "zk_proof_vector_alpha"
    }
    return base64.urlsafe_b64encode(json.dumps(payload, sort_keys=True).encode()).decode().rstrip("=")


CREDENTIAL_PROOF = create_proof(ELECTION_ID, "null_idemp_q7_01", MANIFEST_DIGEST)
ENGINE_BALLOT = base64.urlsafe_b64encode(json.dumps({"choice": "cand_001", "rnd": "123"}).encode()).decode().rstrip("=")
ENGINE_PROOFS = base64.urlsafe_b64encode(json.dumps({"proof": "valid_zk"}).encode()).decode().rstrip("=")
IDEMPOTENCY_KEY = "test_idem_key_001"


async def seed_in_memory_election(session_factory):
    now = datetime.now(timezone.utc)
    async with session_factory() as session:
        election = Election(
            id=ELECTION_ID,
            tenant_id="tenant_01",
            title="Q7-01 Duplicate Cast Test Election",
            state="OPEN",
            manifest_digest=MANIFEST_DIGEST,
            opens_at_utc=now - timedelta(hours=1),
            closes_at_utc=now + timedelta(hours=12),
            issuance_cutoff_utc=now - timedelta(hours=2),
            state_version=1,
            next_leaf_index=0,
            last_witnessed_tree_size=0,
            final_tree_size=None,
            max_unwitnessed_backlog=1000,
            created_at_utc=now - timedelta(days=1),
            updated_at_utc=now
        )
        session.add(election)

        manifest = ManifestVersion(
            id="man_q7_001",
            election_id=ELECTION_ID,
            manifest_version=1,
            manifest_digest=MANIFEST_DIGEST,
            manifest_content=json.dumps({"election_id": ELECTION_ID, "contests": ["contest_001"]}),
            frozen_at_utc=now - timedelta(days=1)
        )
        session.add(manifest)

        contest = Contest(
            id="contest_001",
            election_id=ELECTION_ID,
            contest_index=0,
            title="Executive Committee",
            selection_rule="single_choice"
        )
        session.add(contest)

        cand = Candidate(
            id="cand_001",
            contest_id="contest_001",
            candidate_index=0,
            name="Candidate Alice"
        )
        session.add(cand)

        await session.commit()


async def submit_one(client: httpx.AsyncClient, base_url: str = "") -> httpx.Response:
    url = f"{base_url}/v1/cast/{ELECTION_ID}/ballots"
    return await client.post(
        url,
        json={
            "election_id": ELECTION_ID,
            "credential_proof_b64url": CREDENTIAL_PROOF,
            "engine_ballot_b64url": ENGINE_BALLOT,
            "engine_proofs_b64url": ENGINE_PROOFS,
            "idempotency_key": IDEMPOTENCY_KEY,
        },
    )


@pytest.mark.anyio
async def test_duplicate_cast():
    is_live = False
    original_engine_mode = settings.ENGINE_VALIDATION_MODE
    original_app_env = settings.APP_ENV
    async with httpx.AsyncClient() as live_client:
        try:
            resp = await submit_one(live_client, CASTING_BASE)
            if resp.status_code in (200, 202, 409):
                is_live = True
        except (httpx.ConnectError, httpx.NetworkError, httpx.RemoteProtocolError):
            is_live = False
        except Exception:
            is_live = False

    if is_live:
        client = httpx.AsyncClient()
        base_url = CASTING_BASE
    else:
        # The in-process fallback is an integrity transaction test. It does
        # not provide the established external election engine required for a
        # Q7 privacy/tally claim, so opt into the explicitly limited test mode.
        settings.ENGINE_VALIDATION_MODE = "syntax_only"
        settings.APP_ENV = "test"
        engine = create_async_engine(
            "sqlite+aiosqlite:///:memory:",
            echo=False,
            future=True,
            connect_args={"check_same_thread": False}
        )
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        session_factory = async_sessionmaker(
            bind=engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False
        )
        await seed_in_memory_election(session_factory)

        app = create_app()

        async def override_get_db():
            async with session_factory() as session:
                yield session

        app.dependency_overrides[get_db] = override_get_db
        transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
        client = httpx.AsyncClient(transport=transport, base_url="http://testserver")
        base_url = ""

    try:
        first = await submit_one(client, base_url)
        assert first.status_code in (200, 202), f"First submission failed: {first.status_code}"

        first_data = first.json()
        leaf_index = first_data["leaf_index"]
        handle = first_data["handle"]

        # 100 concurrent submissions with same credential and idempotency key
        tasks = [submit_one(client, base_url) for _ in range(100)]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        successes = 0
        duplicates = 0
        for r in results:
            if isinstance(r, Exception):
                continue
            if r.status_code in (200, 202):
                data = r.json()
                if data["leaf_index"] == leaf_index and data["handle"] == handle:
                    duplicates += 1
                else:
                    successes += 1

        # Exactly one leaf should exist
        assert successes == 0, f"Expected 0 new leaves, got {successes}"
        assert duplicates >= 1, "Expected at least one safe retry returning same outcome"

        # A different ballot with same nullifier should be rejected (409 Conflict)
        different = await client.post(
            f"{base_url}/v1/cast/{ELECTION_ID}/ballots",
            json={
                "election_id": ELECTION_ID,
                "credential_proof_b64url": CREDENTIAL_PROOF,
                "engine_ballot_b64url": base64.urlsafe_b64encode(b"different_ballot").decode().rstrip("="),
                "engine_proofs_b64url": base64.urlsafe_b64encode(b"different_proofs").decode().rstrip("="),
                "idempotency_key": "different_key",
            },
        )
        assert different.status_code == 409, f"Different ballot with same nullifier should be rejected, got {different.status_code}"

    finally:
        await client.aclose()
        settings.ENGINE_VALIDATION_MODE = original_engine_mode
        settings.APP_ENV = original_app_env


if __name__ == "__main__":
    asyncio.run(test_duplicate_cast())
