"""
Witness client for fetching witnessed checkpoints.
Interacts with HimVote witness service.
"""

from typing import Any, Dict, List, Optional
import requests
from anchor_relayer.models import WitnessedCheckpoint


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
        response = requests.get(url, timeout=self.timeout_seconds)
        if response.status_code == 404:
            return None
        response.raise_for_status()
        data = response.json()
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
            if response.status_code == 404:
                return []
            response.raise_for_status()
            data = response.json()
            items = data.get("checkpoints", data if isinstance(data, list) else [])
            return [self._parse_checkpoint_payload(item) for item in items]
        except Exception:
            return []

    def _parse_checkpoint_payload(self, data: Dict[str, Any]) -> WitnessedCheckpoint:
        return WitnessedCheckpoint(
            election_commitment=data["election_commitment"],
            sequence=int(data["sequence"]),
            digest=data["digest"],
            previous_digest=data.get("previous_digest", "0x" + "0" * 64),
            is_final=bool(data.get("is_final", False)),
            witness_signature=data.get("witness_signature"),
        )
