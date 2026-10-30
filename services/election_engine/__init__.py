"""HimVote Voting Engine Service Module.
Adapter for vetted voting engine Profile VEEM.
"""

from .adapter import (
    BallotValidationError,
    CredentialValidationError,
    DuplicateNullifierError,
    ElectionEngineError,
    InclusionVerificationError,
    TallyVerificationError,
    VotingEngineAdapter,
)
from .booth import create_encrypted_ballot
from .constants import PROTOCOL_VERSION, SCHEMA_BALLOT_EVIDENCE, SCHEMA_CHECKPOINT
from .credentials import (
    IssuerKeyPair,
    VoterCredential,
    derive_nullifier,
    verify_credential_proof,
)
from .crypto import (
    DLEQProof,
    DisjunctiveProof,
    ElGamalCiphertext,
    MerkleTree,
    SumProof,
    TrusteeKeyPair,
    canonical_json,
    prove_disjunctive,
    prove_dleq,
    prove_sum,
    sha256_digest,
    solve_discrete_log,
    verify_disjunctive,
    verify_dleq,
    verify_sum,
)
from .verifier import run_verification

__all__ = [
    "VotingEngineAdapter",
    "ElectionEngineError",
    "BallotValidationError",
    "CredentialValidationError",
    "DuplicateNullifierError",
    "TallyVerificationError",
    "InclusionVerificationError",
    "create_encrypted_ballot",
    "IssuerKeyPair",
    "VoterCredential",
    "derive_nullifier",
    "verify_credential_proof",
    "ElGamalCiphertext",
    "DisjunctiveProof",
    "SumProof",
    "DLEQProof",
    "TrusteeKeyPair",
    "MerkleTree",
    "canonical_json",
    "sha256_digest",
    "prove_disjunctive",
    "verify_disjunctive",
    "prove_sum",
    "verify_sum",
    "prove_dleq",
    "verify_dleq",
    "solve_discrete_log",
    "run_verification",
    "PROTOCOL_VERSION",
    "SCHEMA_BALLOT_EVIDENCE",
    "SCHEMA_CHECKPOINT",
]
