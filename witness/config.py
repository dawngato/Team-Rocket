"""
Configuration management for HimVote Witness service.
Loads settings from environment variables with safe production defaults.
"""

import os
import json
from typing import Dict, Optional


class WitnessConfig:
    """Witness service configuration container."""

    def __init__(
        self,
        witness_id: Optional[str] = None,
        db_path: Optional[str] = None,
        audit_log_path: Optional[str] = None,
        private_key_hex: Optional[str] = None,
        key_file_path: Optional[str] = None,
        require_writer_signature: bool = True,
        pinned_writers: Optional[Dict[str, str]] = None,
        host: str = "0.0.0.0",
        port: int = 8000
    ):
        self.witness_id = witness_id or os.getenv("WITNESS_ID", "himvote_witness_primary")
        self.db_path = db_path or os.getenv("WITNESS_DB_PATH", "witness_data/witness.db")
        self.audit_log_path = audit_log_path or os.getenv("WITNESS_AUDIT_LOG_PATH", "witness_data/audit.jsonl")
        self.private_key_hex = private_key_hex or os.getenv("WITNESS_PRIVATE_KEY_HEX")
        self.key_file_path = key_file_path or os.getenv("WITNESS_KEY_FILE_PATH", "witness_data/witness_key.hex")
        req_sig = os.getenv("WITNESS_REQUIRE_WRITER_SIGNATURE", "true").lower() in ("1", "true", "yes")
        self.require_writer_signature = require_writer_signature and req_sig
        self.host = os.getenv("WITNESS_HOST", host)
        self.port = int(os.getenv("WITNESS_PORT", str(port)))
        allowed_origins_env = os.getenv("WITNESS_ALLOWED_ORIGINS", "")
        if allowed_origins_env:
            self.allowed_origins = [orig.strip() for orig in allowed_origins_env.split(",") if orig.strip()]
        else:
            self.allowed_origins = [
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:8080",
                "http://127.0.0.1:8080",
            ]

        self.pinned_writers: Dict[str, str] = pinned_writers or {}
        env_pinned = os.getenv("WITNESS_PINNED_WRITERS")
        if env_pinned:
            try:
                parsed = json.loads(env_pinned)
                if isinstance(parsed, dict):
                    self.pinned_writers.update(parsed)
            except Exception:
                pass


def get_default_config() -> WitnessConfig:
    """Create configuration instance from environment."""
    return WitnessConfig()
