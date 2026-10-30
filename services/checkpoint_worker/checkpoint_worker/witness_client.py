"""
HTTP client for Witness service communication.
Handles checkpoint submission, exponential backoff retries, and signature verification.
"""

import time
import random
import logging
from typing import Optional, Dict, Any, List
import httpx

from checkpoint_worker.crypto.signatures import (
    verify_witness_signature,
    load_ed25519_public_key,
)
from checkpoint_worker.exceptions import (
    WitnessConnectionError,
    InvalidWitnessSignatureError,
    WitnessRejectionError,
)

logger = logging.getLogger(__name__)


class WitnessClient:
    """
    Robust HTTP client to communicate with witness service.
    Enforces pinned witness public key verification.
    """

    def __init__(
        self,
        witness_url: str,
        pinned_witness_public_key: Optional[str] = None,
        timeout_seconds: float = 5.0,
        max_retries: int = 3,
        retry_backoff_base: float = 0.5,
    ):
        self.witness_url = witness_url.rstrip("/")
        self.pinned_public_key_raw = pinned_witness_public_key
        self.pinned_public_key = (
            load_ed25519_public_key(pinned_witness_public_key)
            if pinned_witness_public_key
            else None
        )
        self.timeout_seconds = timeout_seconds
        self.max_retries = max_retries
        self.retry_backoff_base = retry_backoff_base

    def set_pinned_public_key(self, public_key_raw: str) -> None:
        """Update or set pinned witness public key."""
        self.pinned_public_key_raw = public_key_raw
        self.pinned_public_key = load_ed25519_public_key(public_key_raw)

    def post_checkpoint(
        self,
        checkpoint_dict: Dict[str, Any],
        canonical_bytes: bytes,
        checkpoint_digest: str,
        writer_signature_hex: str,
        writer_key_id: str,
        consistency_proof_hex: List[str],
        previous_witness_sequence: int = 0,
    ) -> Dict[str, Any]:
        """
        Submit checkpoint to witness service endpoint POST /checkpoints.
        Retries upon transient network faults.
        Verifies witness cryptographic signature prior to returning.
        """
        endpoint = f"{self.witness_url}/checkpoints"
        payload = {
            "checkpoint": checkpoint_dict,
            "canonical_bytes_hex": canonical_bytes.hex(),
            "checkpoint_digest": checkpoint_digest,
            "signature": writer_signature_hex,
            "writer_key_id": writer_key_id,
            "consistency_proof": consistency_proof_hex,
        }

        attempt = 0
        last_exception: Optional[Exception] = None

        while attempt < self.max_retries:
            attempt += 1
            try:
                with httpx.Client(timeout=self.timeout_seconds) as client:
                    response = client.post(endpoint, json=payload)

                if response.status_code in (200, 201):
                    data = response.json()
                    self._verify_response(
                        response_data=data,
                        canonical_bytes=canonical_bytes,
                        previous_witness_sequence=previous_witness_sequence,
                        election_id=checkpoint_dict["election_id"],
                        expected_digest=checkpoint_digest,
                    )
                    return data

                if response.status_code in (400, 403, 409, 422):
                    detail = response.text
                    logger.error(
                        "Witness rejected checkpoint with status %d: %s",
                        response.status_code,
                        detail,
                    )
                    raise WitnessRejectionError(response.status_code, detail)

                logger.warning(
                    "Witness returned server error status %d on attempt %d",
                    response.status_code,
                    attempt,
                )

            except (httpx.RequestError, httpx.TimeoutException) as exc:
                last_exception = exc
                logger.warning(
                    "Network error connecting to witness on attempt %d: %s",
                    attempt,
                    str(exc),
                )
            except WitnessRejectionError:
                raise
            except InvalidWitnessSignatureError:
                raise
            except Exception as exc:
                last_exception = exc
                logger.warning(
                    "Unexpected error communicating with witness on attempt %d: %s",
                    attempt,
                    str(exc),
                )

            if attempt < self.max_retries:
                sleep_duration = self.retry_backoff_base * (2 ** (attempt - 1))
                jitter = random.uniform(0.0, 0.2)
                time.sleep(sleep_duration + jitter)

        raise WitnessConnectionError(
            f"Failed to communicate with witness service after {self.max_retries} attempts: {last_exception}"
        )

    def _verify_response(
        self,
        response_data: Dict[str, Any],
        canonical_bytes: bytes,
        previous_witness_sequence: int,
        election_id: str,
        expected_digest: str,
    ) -> None:
        """
        Validate witness response structure and cryptographic signature.
        """
        required_fields = [
            "witness_signature",
            "witness_sequence",
            "witness_key_id",
            "checkpoint_digest",
        ]
        for field in required_fields:
            if field not in response_data:
                raise InvalidWitnessSignatureError(f"Missing required witness field: {field}")

        resp_digest = response_data["checkpoint_digest"]
        if resp_digest != expected_digest:
            raise InvalidWitnessSignatureError(
                f"Witness acknowledged digest mismatch: expected {expected_digest} but received {resp_digest}"
            )

        if not self.pinned_public_key:
            logger.warning("No pinned witness public key configured; skipping signature verification")
            return

        sig_hex = response_data["witness_signature"]
        is_valid = verify_witness_signature(
            public_key=self.pinned_public_key,
            signature_hex=sig_hex,
            canonical_checkpoint_bytes=canonical_bytes,
            previous_witness_sequence=previous_witness_sequence,
            election_id=election_id,
        )

        if not is_valid:
            raise InvalidWitnessSignatureError(
                f"Witness cryptographic signature verification failed for election {election_id}"
            )
