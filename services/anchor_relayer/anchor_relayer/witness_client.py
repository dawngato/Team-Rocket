"""
Witness client for fetching witnessed checkpoints.
Interacts with HimVote witness service.
"""

from typing import Any, Dict, List, Optional
import requests
from anchor_relayer.models import WitnessedCheckpoint


class WitnessServiceError(RuntimeError):
    """Raised when the witness endpoint cannot provide relayer checkpoints."""


class WitnessClient:
    """
    HTTP client for querying witnessed checkpoints from witness node.
    """

    def __init__(self, base_url: str, timeout_seconds: float = 10.0):
        self.base_url = base_url.rstrip("/")
        self.timeout_seconds = timeout_seconds

    def get_final_checkpoint(self, election_id: str) -> Optional[WitnessedCheckpoint]:
        """
        Fetches the final signed checkpoint for an election from the witness.
        """
        url = f"{self.base_url}/elections/{election_id}/final"
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
        Fetches witnessed checkpoints pending on chain anchoring.
        """
        url = f"{self.base_url}/checkpoints/pending_anchor"
        params = {}
        if election_id:
            params["election_id"] = election_id

        try:
            response = requests.get(url, params=params, timeout=self.timeout_seconds)
            response.raise_for_status()
            data = response.json()
        except requests.RequestException as exc:
            raise WitnessServiceError("Could not retrieve pending checkpoints from the witness service") from exc
        except ValueError as exc:
            raise WitnessServiceError("The witness pending-checkpoint response was not valid JSON") from exc

        if isinstance(data, dict):
            items = data.get("checkpoints")
        elif isinstance(data, list):
            items = data
        else:
            items = None
        if not isinstance(items, list):
            raise WitnessServiceError("The witness response did not contain a checkpoint list")
        return [self._parse_checkpoint_payload(item) for item in items]

    def _parse_checkpoint_payload(self, data: Dict[str, Any]) -> WitnessedCheckpoint:
        if not isinstance(data, dict):
            raise WitnessServiceError("The witness returned a checkpoint with an invalid shape")
        required = ("election_commitment", "sequence", "digest")
        if any(key not in data for key in required):
            raise WitnessServiceError(
                "The witness checkpoint does not include the commitment, sequence, and digest required by the relayer"
            )
        return WitnessedCheckpoint(
            election_commitment=data["election_commitment"],
            sequence=int(data["sequence"]),
            digest=data["digest"],
            previous_digest=data.get("previous_digest", "0x" + "0" * 64),
            is_final=bool(data.get("is_final", False)),
            witness_signature=data.get("witness_signature"),
        )
