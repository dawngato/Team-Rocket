"""
Unit and concurrency tests for database lock coordination in casting service.
Verifies event loop lock registries, thread safety, and concurrent worker coordination.
"""

import asyncio
import pytest
from src.database import get_election_lock, reset_election_locks


@pytest.mark.anyio
async def test_election_lock_consistency():
    """
    Verifies that calling get_election_lock multiple times for the same election
    returns the exact same asyncio Lock instance within the same event loop.
    """
    election_id = "election_alpha"
    lock1 = get_election_lock(election_id)
    lock2 = get_election_lock(election_id)
    assert lock1 is lock2


@pytest.mark.anyio
async def test_distinct_election_locks():
    """
    Verifies that different elections receive separate asyncio Lock instances.
    """
    lock_a = get_election_lock("election_alpha")
    lock_b = get_election_lock("election_beta")
    assert lock_a is not lock_b


@pytest.mark.anyio
async def test_reset_election_locks():
    """
    Verifies that reset_election_locks clears registry so subsequent calls
    create fresh lock instances.
    """
    election_id = "election_gamma"
    lock_orig = get_election_lock(election_id)
    reset_election_locks()
    lock_new = get_election_lock(election_id)
    assert lock_orig is not lock_new


@pytest.mark.anyio
async def test_concurrent_workers_coordination():
    """
    Simulates concurrent workers contending on the same election lock.
    Verifies mutual exclusion and serialization without deadlock.
    """
    election_id = "election_contention"
    lock = get_election_lock(election_id)
    counter = 0
    concurrency_count = 10

    async def worker_task(worker_index: int):
        nonlocal counter
        async with lock:
            current = counter
            await asyncio.sleep(0.01)
            counter = current + 1
            return worker_index

    results = await asyncio.gather(*[worker_task(i) for i in range(concurrency_count)])
    assert len(results) == concurrency_count
    assert counter == concurrency_count
