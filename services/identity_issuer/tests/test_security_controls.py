"""Regression tests for shared throttling and scoped administrative policy inputs."""

import pytest
from fastapi import HTTPException

from services.identity_issuer.rate_limiter import DistributedRateLimiter


def test_local_rate_limiter_is_bounded_and_rejects_after_limit():
    limiter = DistributedRateLimiter(redis_url="")
    limiter.enforce("test-key", limit=2, window_seconds=60)
    limiter.enforce("test-key", limit=2, window_seconds=60)
    with pytest.raises(HTTPException) as error:
        limiter.enforce("test-key", limit=2, window_seconds=60)
    assert error.value.status_code == 429


def test_production_rate_limiter_fails_closed_without_shared_store(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    limiter = DistributedRateLimiter(redis_url="")
    with pytest.raises(HTTPException) as error:
        limiter.enforce("production-key", limit=2, window_seconds=60)
    assert error.value.status_code == 503
