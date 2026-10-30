"""
Contract client for interacting with HimVoteAnchor.
Reads on chain state to reconcile checkpoints and verify sequences.
"""

from typing import Any, Dict, Optional, Tuple
from web3 import Web3
from web3.contract import Contract
from anchor_relayer.abi import HIMVOTE_ANCHOR_ABI


class HimVoteAnchorClient:
    """
    Client for interacting with the HimVoteAnchor smart contract.
    """

    def __init__(self, w3: Web3, contract_address: str):
        self.w3 = w3
        self.contract_address = Web3.to_checksum_address(contract_address)
        self.contract: Contract = self.w3.eth.contract(
            address=self.contract_address,
            abi=HIMVOTE_ANCHOR_ABI,
        )

    def to_bytes32(self, val: str) -> bytes:
        """
        Converts hex string to 32 byte value.
        """
        if isinstance(val, bytes):
            return val
        if val.startswith("0x"):
            val = val[2:]
        val = val.rjust(64, "0")
        return bytes.fromhex(val)

    def get_latest_sequence(self, election_commitment: str) -> int:
        """
        Fetches the latest sequence number anchored for an election.
        """
        commitment_bytes = self.to_bytes32(election_commitment)
        return self.contract.functions.latestSequence(commitment_bytes).call()

    def is_finalized(self, election_commitment: str) -> bool:
        """
        Returns true if the election is marked final on chain.
        """
        commitment_bytes = self.to_bytes32(election_commitment)
        return self.contract.functions.isFinalized(commitment_bytes).call()

    def get_checkpoint(self, election_commitment: str, sequence: int) -> Tuple[int, bytes, bytes, bool, int, int]:
        """
        Returns checkpoint record from contract for a sequence.
        """
        commitment_bytes = self.to_bytes32(election_commitment)
        return self.contract.functions.getCheckpoint(commitment_bytes, sequence).call()

    def get_latest_checkpoint(self, election_commitment: str) -> Tuple[int, bytes, bytes, bool, int, int]:
        """
        Returns the latest checkpoint record for an election.
        """
        commitment_bytes = self.to_bytes32(election_commitment)
        return self.contract.functions.getLatestCheckpoint(commitment_bytes).call()

    def is_already_anchored(self, election_commitment: str, sequence: int, digest: str) -> bool:
        """
        Reconciles contract state to check if checkpoint was already recorded.
        Returns true if sequence exists on chain with identical digest.
        """
        latest_seq = self.get_latest_sequence(election_commitment)
        if sequence > latest_seq:
            return False

        seq, on_chain_digest, _, _, _, _ = self.get_checkpoint(election_commitment, sequence)
        target_digest = self.to_bytes32(digest)
        return seq == sequence and on_chain_digest == target_digest
