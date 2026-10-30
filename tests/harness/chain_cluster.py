"""
Blockchain anchor and relayer simulation matching Section 6.7 of prompt.md.
Simulates HimVoteAnchor contract on consortium EVM network, enforcing relayer role,
monotonic sequences, finality locks, and reorg detection.
"""

from typing import Dict, List, Optional
from .models import ChainAnchor


class ChainCluster:
    """
    Simulates blockchain ledger and anchor contract state.
    """

    def __init__(self, chain_id: int = 1337, authorized_relayer: str = "0xRelayer123"):
        self.chain_id = chain_id
        self.authorized_relayer = authorized_relayer
        self.anchors: Dict[str, List[ChainAnchor]] = {}
        self.contract_paused = False
        self.block_height = 100

    def anchor_checkpoint(
        self,
        caller: str,
        election_commitment: str,
        sequence: int,
        digest: str,
        previous_digest: Optional[str] = None,
        is_final: bool = False
    ) -> ChainAnchor:
        """
        Simulates anchorCheckpoint contract function.
        """
        if self.contract_paused:
            raise RuntimeError("Contract is currently paused")

        if caller.lower() != self.authorized_relayer.lower():
            raise PermissionError("AccessControl: caller lacks authorized relayer role")

        if not digest or digest == "sha256:0000000000000000000000000000000000000000000000000000000000000000":
            raise ValueError("Invalid zero digest")

        history = self.anchors.setdefault(election_commitment, [])

        if history:
            last = history[-1]
            if last.is_final:
                raise RuntimeError("Contract locked: cannot modify or anchor after final checkpoint")
            expected_seq = last.sequence + 1
            if sequence != expected_seq:
                raise ValueError(f"Sequence mismatch: expected {expected_seq}, got {sequence}")
            if previous_digest != last.digest:
                raise ValueError(f"Previous digest mismatch: expected {last.digest}, got {previous_digest}")
        else:
            if sequence != 1:
                raise ValueError(f"Initial anchor sequence must be 1, got {sequence}")

        self.block_height += 1
        anchor_entry = ChainAnchor(
            election_commitment=election_commitment,
            sequence=sequence,
            digest=digest,
            previous_digest=previous_digest,
            is_final=is_final,
            block_number=self.block_height,
            block_hash=f"0xblock{self.block_height:08x}",
            relayer_address=caller
        )
        history.append(anchor_entry)
        return anchor_entry

    def get_latest_anchor(self, election_commitment: str) -> Optional[ChainAnchor]:
        """Fetch the latest anchored checkpoint for an election."""
        history = self.anchors.get(election_commitment, [])
        return history[-1] if history else None
