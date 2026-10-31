"""
Shared, bounded rate limiter for HimVote Identity Issuer.

Supports distributed Redis backends when configured, and falls back to a
thread-safe, bounded LRU in-memory store to prevent memory exhaustion and DoS.
"""

import os
import time
import hashlib
import threading
from collections import OrderedDict, deque
from typing import Optional
from fastapi import HTTPException, Request, status


class RateLimiter:
    """Thread-safe, bounded rate limiter with optional Redis backing."""

    def __init__(self, max_entries: int = 10000):
        self.max_entries = max_entries
        self.lock = threading.Lock()
        self._local_cache: OrderedDict[str, deque[float]] = OrderedDict()
        self._redis_client = None

        redis_url = os.getenv("REDIS_URL")
        if redis_url:
            try:
                import redis
                client = redis.from_url(redis_url, decode_responses=True)
                client.ping()
                self._redis_client = client
            except Exception:
                self._redis_client = None

    def check_rate_limit(
        self,
        key: str,
        max_attempts: int = 5,
        window_seconds: int = 300,
        error_detail: str = "Too many attempts; please wait and try again later",
    ) -> None:
        """Raise HTTP 429 if the key has exceeded max_attempts within window_seconds."""
        if self._redis_client:
            try:
                current_time = time.time()
                pipeline = self._redis_client.pipeline()
                pipeline.zremrangebyscore(f"rl:{key}", 0, current_time - window_seconds)
                pipeline.zcard(f"rl:{key}")
                results = pipeline.execute()
                count = results[1]
                if count >= max_attempts:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail=error_detail,
                    )
                return
            except HTTPException:
                raise
            except Exception:
                # Redis error: gracefully fall back to local bounded cache
                pass

        now = time.monotonic()
        with self.lock:
            attempts = self._local_cache.get(key)
            if attempts is not None:
                while attempts and now - attempts[0] > window_seconds:
                    attempts.popleft()
                if len(attempts) >= max_attempts:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail=error_detail,
                    )
                self._local_cache.move_to_end(key)

    def record_failure(self, key: str, window_seconds: int = 300) -> None:
        """Record a failed attempt for the key."""
        if self._redis_client:
            try:
                current_time = time.time()
                pipeline = self._redis_client.pipeline()
                pipeline.zadd(f"rl:{key}", {f"{current_time}_{time.monotonic()}": current_time})
                pipeline.expire(f"rl:{key}", window_seconds)
                pipeline.execute()
                return
            except Exception:
                pass

        now = time.monotonic()
        with self.lock:
            if key not in self._local_cache:
                if len(self._local_cache) >= self.max_entries:
                    # Pop LRU item
                    self._local_cache.popitem(last=False)
                self._local_cache[key] = deque()
            self._local_cache[key].append(now)
            self._local_cache.move_to_end(key)

    def reset(self, key: str) -> None:
        """Reset attempts for a key upon successful action."""
        if self._redis_client:
            try:
                self._redis_client.delete(f"rl:{key}")
            except Exception:
                pass
        with self.lock:
            self._local_cache.pop(key, None)


# Global singleton instance
rate_limiter = RateLimiter(max_entries=10000)


def build_rate_limit_key(request: Request, prefix: str, identifier: str) -> str:
    """Create a normalized key hashed with remote IP and identifier."""
    remote = request.client.host if request.client else "unknown"
    ident_clean = identifier.strip().lower()
    return hashlib.sha256(f"{prefix}:{remote}:{ident_clean}".encode("utf-8")).hexdigest()
