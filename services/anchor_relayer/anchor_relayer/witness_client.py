"""
Witness client for fetching witnessed checkpoints.
Interacts with HimVote witness service.
"""

from typing import Any, Dict, List, Mapping, Optional
from urllib.parse import quote
import requests
from anchor_relayer.models import WitnessedCheckpoint
from anchor_relayer.witness_verification import (
    WitnessTrustError,
    resolve_election_commitment,
    verify_witness_acknowledgement,
)


class WitnessServiceError(RuntimeError):
    """Raised when the witness endpoint cannot provide relayer checkpoints."""


class WitnessClient:
    """
    HTTP client for querying witnessed checkpoints from witness node.
    """

    def __init__(
        self,
        base_url: str,
        timeout_seconds: float = 10.0,
        pinned_public_key: Optional[str] = None,
        election_commitments: Optional[Mapping[str, str]] = None,
    ):
        self.base_url = base_url.rstrip("/")
        self.timeout_seconds = timeout_seconds
        self.pinned_public_key = pinned_public_key
        self.election_commitments = dict(election_commitments or {})

    def get_final_checkpoint(self, election_id: str) -> Optional[WitnessedCheckpoint]:
        """
        Fetches the final signed checkpoint for an election from the witness.
        """
        url = f"{self.base_url}/elections/{quote(election_id, safe='')}/final"
        try:
            response = requests.get(url, timeout=self.timeout_seconds)
        except requests.RequestException as exc:
            raise WitnessServiceError("Could not reach the witness final-checkpoint endpoint") from exc
        if response.status_code == 404:
            return None
        try:
            response.raise_for_status()
            data = response.json()
        except (requests.RequestException, ValueError) as exc:
            raise WitnessServiceError("The witness final-checkpoint response was unavailable or invalid") from exc
        return self._parse_checkpoint_payload(data)

    def get_unanchored_checkpoints(self, election_id: Optional[str] = None) -> List[WitnessedCheckpoint]:
        """
        Fetches checkpoints only for elections with an explicit chain commitment.
        """
        if not self.pinned_public_key:
            raise WitnessServiceError("WITNESS_PUBLIC_KEY must be configured before fetching checkpoints")
        if not self.election_commitments:
            raise WitnessServiceError("WITNESS_ELECTION_COMMITMENTS must configure at least one election")

        election_ids = [election_id] if election_id else sorted(self.election_commitments)
        if any(configured_id not in self.election_commitments for configured_id in election_ids):
            raise WitnessServiceError("The requested election has no configured chain commitment")

        checkpoints: List[WitnessedCheckpoint] = []
        for configured_election_id in election_ids:
            url = f"{self.base_url}/elections/{quote(configured_election_id, safe='')}/checkpoints"
            try:
                response = requests.get(url, timeout=self.timeout_seconds)
                response.raise_for_status()
                data = response.json()
            except requests.RequestException as exc:
                raise WitnessServiceError(
                    f"Could not retrieve checkpoints for election {configured_election_id!r} from the witness service"
                ) from exc
            except ValueError as exc:
                raise WitnessServiceError("The witness checkpoint-list response was not valid JSON") from exc
            if isinstance(data, dict) and "checkpoints" in data:
                items = data["checkpoints"]
            elif isinstance(data, list):
                items = data
            else:
                raise WitnessServiceError("The witness checkpoint-list response must be an array")
            try:
                checkpoints.extend(self._parse_checkpoint_payload(item) for item in items)
            except WitnessTrustError as exc:
                raise WitnessServiceError(str(exc)) from exc
        return checkpoints

    def _parse_checkpoint_payload(self, data: Dict[str, Any]) -> WitnessedCheckpoint:
        if not isinstance(data, dict):
            raise WitnessServiceError("The witness returned a checkpoint with an invalid shape")
        try:
            verified = verify_witness_acknowledgement(data, self.pinned_public_key)
            commitment = resolve_election_commitment(
                verified["election_id"], self.election_commitments
            )
        except WitnessTrustError as exc:
            raise WitnessServiceError(str(exc)) from exc
        return WitnessedCheckpoint(
            election_commitment=commitment,
            sequence=verified["sequence"],
            digest=verified["digest"],
            previous_digest=verified["previous_digest"],
            is_final=verified["is_final"],
            witness_signature=verified["witness_signature"],
        )
