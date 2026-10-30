"""
Custom exceptions for checkpoint worker.
"""


class CheckpointWorkerError(Exception):
    """Base exception for all checkpoint worker errors."""
    pass


class DisputedTreeError(CheckpointWorkerError):
    """
    Raised when a conflicting leaf hash is encountered for a leaf index.
    The election must immediately transition to DISPUTED state.
    """
    def __init__(self, election_id: str, leaf_index: int, expected_hash: str, actual_hash: str):
        self.election_id = election_id
        self.leaf_index = leaf_index
        self.expected_hash = expected_hash
        self.actual_hash = actual_hash
        super().__init__(
            f"Conflict at leaf {leaf_index} for election {election_id}: "
            f"expected {expected_hash} but found {actual_hash}"
        )


class LeafGapError(CheckpointWorkerError):
    """
    Raised or logged when a gap in leaf index sequence is detected in outbox.
    Worker must never skip gaps.
    """
    def __init__(self, election_id: str, expected_index: int, found_index: int):
        self.election_id = election_id
        self.expected_index = expected_index
        self.found_index = found_index
        super().__init__(
            f"Gap detected for election {election_id}: "
            f"expected leaf {expected_index} but found {found_index}"
        )


class WitnessError(CheckpointWorkerError):
    """Base exception for witness communication or signature errors."""
    pass


class WitnessConnectionError(WitnessError):
    """Raised when communication with witness service fails after retries."""
    pass


class InvalidWitnessSignatureError(WitnessError):
    """Raised when the cryptographic signature returned by witness is invalid."""
    pass


class WitnessRejectionError(WitnessError):
    """Raised when the witness explicitly rejects the checkpoint."""
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(f"Witness rejected checkpoint with status {status_code}: {detail}")
