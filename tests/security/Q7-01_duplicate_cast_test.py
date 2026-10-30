"""
Test Q7-01: One credential, 100 concurrent and repeated submissions
Must see exactly one leaf and one nullifier. Safe retry returns same outcome.
"""
import asyncio
import httpx

CASTING_BASE = "http://localhost:8082"
ELECTION_ID = "elec_test_001"
CREDENTIAL_PROOF = "test_proof_123"
ENGINE_BALLOT = "test_ballot_456"
ENGINE_PROOFS = "test_proofs_789"
IDEMPOTENCY_KEY = "test_idem_key_001"

async def submit_one(client: httpx.AsyncClient) -> httpx.Response:
    return await client.post(
        f"{CASTING_BASE}/v1/cast/{ELECTION_ID}/ballots",
        json={
            "election_id": ELECTION_ID,
            "credential_proof_b64url": CREDENTIAL_PROOF,
            "engine_ballot_b64url": ENGINE_BALLOT,
            "engine_proofs_b64url": ENGINE_PROOFS,
            "idempotency_key": IDEMPOTENCY_KEY,
        },
    )

import pytest

@pytest.mark.anyio
async def test_duplicate_cast():
    async with httpx.AsyncClient() as client:
        try:
            first = await submit_one(client)
        except (httpx.ConnectError, httpx.NetworkError):
            pytest.skip("Casting service not running on port 8082 for live network integration test")
        assert first.status_code in (200, 202), f"First submission failed: {first.status_code}"

        first_data = first.json()
        leaf_index = first_data["leaf_index"]
        handle = first_data["handle"]

        # 100 concurrent submissions with same idempotency key
        tasks = [submit_one(client) for _ in range(100)]
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

        # A different ballot with same nullifier should be rejected
        different = await client.post(
            f"{CASTING_BASE}/v1/cast/{ELECTION_ID}/ballots",
            json={
                "election_id": ELECTION_ID,
                "credential_proof_b64url": CREDENTIAL_PROOF,
                "engine_ballot_b64url": "different_ballot",
                "engine_proofs_b64url": "different_proofs",
                "idempotency_key": "different_key",
            },
        )
        assert different.status_code == 409, "Different ballot with same nullifier should be rejected"

        print("Q7-01 PASSED: One credential, one leaf, safe retry returns same outcome")

if __name__ == "__main__":
    asyncio.run(test_duplicate_cast())
