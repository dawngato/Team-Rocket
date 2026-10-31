"""Distributed rate limiter for HimVote Identity Issuer.

Uses Redis for atomic sliding-window throttling across multiple workers/instances
with automatic fallback to process-local bounded memory if Redis is unconfigured
or temporarily unreachable.
"""

from __future__ import annotations

import hashlib
import logging
import os
import time
from collections import deque
from typing import Optional
from fastapi import HTTPException, status

logger = logging.getLogger("identity_issuer.rate_limiter")

try:
    import redis
except ImportError:
    redis = None


class DistributedRateLimiter:
    """Production Redis-backed rate limiter with bounded memory fallback."""

    def __init__(self, redis_url: Optional[str] = None):
        self._redis_client = None
        self._redis_available = False
        self._production = os.getenv("APP_ENV", "development").strip().lower() == "production"
        resolved_url = redis_url or os.getenv("REDIS_URL") or os.getenv("HIMVOTE_REDIS_URL")
        if resolved_url and redis is not None:
            try:
                self._redis_client = redis.Redis.from_url(
                    resolved_url,
                    decode_responses=True,
                    socket_connect_timeout=1.0,
                    socket_timeout=1.0,
                )
                self._redis_client.ping()
                self._redis_available = True
                logger.info("Connected to distributed Redis rate limiter: %s", resolved_url)
            except Exception as exc:
                logger.warning("Redis rate limiter unavailable (%s); using bounded memory fallback", exc)
                self._redis_client = None
                self._redis_available = False

        self._memory_store: dict[str, deque[float]] = {}
        self._max_memory_keys = 10000

    def key(self, prefix: str, *parts: str) -> str:
        """Derive a consistent, fixed-length rate limiting key."""
        joined = ":".join(str(p).strip().lower() for p in parts if p)
        digest = hashlib.sha256(joined.encode("utf-8")).hexdigest()
        return f"{prefix}:{digest}"

    def enforce(
        self,
        key: str,
        limit: int,
        window_seconds: int,
        detail: str = "Too many requests; try again later",
    ) -> None:
        """Enforce request limits within sliding time window."""
        if self._redis_available and self._redis_client is not None:
            try:
                now = time.time()
                redis_key = f"himvote:ratelimit:{key}"
                result = self._redis_client.eval(
                    """
                    redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, ARGV[1])
                    local current = redis.call('ZCARD', KEYS[1])
                    if current >= tonumber(ARGV[2]) then return 0 end
                    redis.call('ZADD', KEYS[1], ARGV[3], ARGV[4])
                    redis.call('EXPIRE', KEYS[1], ARGV[5])
                    return 1
                    """,
                    1,
                    redis_key,
                    now - window_seconds,
                    limit,
                    now,
                    f"{now}:{time.perf_counter()}",
                    max(window_seconds * 2, 60),
                )
                if int(result) == 0:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail=detail,
                    )
                return
            except HTTPException:
                raise
            except Exception as exc:
                logger.warning("Redis rate limit check failed (%s); falling back to memory", exc)

        if self._production:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Shared rate limiting service is currently unavailable. Please retry shortly.",
            )

        # In-memory bounded sliding window fallback
        now = time.monotonic()
        if len(self._memory_store) > self._max_memory_keys:
            keys_to_remove = list(self._memory_store.keys())[:1000]
            for k in keys_to_remove:
                self._memory_store.pop(k, None)

        if key not in self._memory_store:
            self._memory_store[key] = deque()

        queue = self._memory_store[key]
        while queue and (now - queue[0]) > window_seconds:
            queue.popleft()

        if len(queue) >= limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=detail,
            )
        queue.append(now)

    def record_failure(self, key: str, window_seconds: int = 300) -> None:
        """Record an explicit authentication failure."""
        failure_key = f"fail:{key}"
        if self._redis_available and self._redis_client is not None:
            try:
                now = time.time()
                redis_key = f"himvote:failures:{failure_key}"
                pipe = self._redis_client.pipeline()
                pipe.zremrangebyscore(redis_key, 0, now - window_seconds)
                pipe.zadd(redis_key, {f"{now}:{time.perf_counter()}": now})
                pipe.expire(redis_key, window_seconds * 2)
                pipe.execute()
                return
            except Exception as exc:
                logger.warning("Redis failure record failed (%s); using memory fallback", exc)

        now = time.monotonic()
        if failure_key not in self._memory_store:
            self._memory_store[failure_key] = deque()
        queue = self._memory_store[failure_key]
        while queue and (now - queue[0]) > window_seconds:
            queue.popleft()
        queue.append(now)

    def clear(self, key: str) -> None:
        """Clear recorded entries upon successful authentication."""
        if self._redis_available and self._redis_client is not None:
            try:
                self._redis_client.delete(f"himvote:ratelimit:{key}")
                self._redis_client.delete(f"himvote:failures:fail:{key}")
            except Exception:
                pass
        self._memory_store.pop(key, None)
        self._memory_store.pop(f"fail:{key}", None)


rate_limiter = DistributedRateLimiter()
