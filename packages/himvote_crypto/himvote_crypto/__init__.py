"""HimVote Core Reviewed Cryptography and Canonicalization Package.

Provides production grade cryptographic primitives and data canonicalization:
* RFC 8785 JSON Canonicalization Scheme (JCS)
* RFC 9162 Merkle Tree and Proofs (Leaf hash, Node hash, Inclusion, Consistency)
* RFC 9474 RSA Blind Signatures (Blind, BlindSign, Finalize, Verify)
* RFC 8032 Ed25519 Signing and Verification
* Canonical election evidence data structures
"""

from himvote_crypto.ed25519 import (
    b64url_decode,
    b64url_encode,
    generate_keypair as generate_ed25519_keypair,
    sign as ed25519_sign,
    sign_attestation,
    sign_checkpoint,
    verify as ed25519_verify,
    verify_attestation,
    verify_checkpoint,
)
from himvote_crypto.exceptions import (
    BlindingError,
    CanonicalizationError,
    ConsistencyProofError,
    CryptoError,
    DuplicateKeyError,
    Ed25519Error,
    FloatNotPermittedError,
    InclusionProofError,
    InvalidSignatureError,
    InvalidUnicodeError,
    MerkleError,
    RSABlindError,
)
from himvote_crypto.jcs import (
    canonical_digest,
    canonical_digest_hex,
    canonicalize,
    canonicalize_json_string,
    loads as jcs_loads,
)
from himvote_crypto.merkle import (
    LEAF_PREFIX,
    NODE_PREFIX,
    MerkleTree,
    consistency_proof,
    empty_tree_hash,
    inclusion_proof,
    leaf_hash,
    merkle_tree_hash,
    merkle_tree_hash_from_hashes,
    node_hash,
    verify_consistency,
    verify_inclusion,
)
from himvote_crypto.models import (
    BallotEvidenceRecord,
    CheckpointRecord,
)
from himvote_crypto.rsa_blind import (
    BlindingSecret,
    RSABSSAVariant,
    client_blind,
    client_finalize,
    generate_rsa_keypair,
    prepare_msg,
    server_blind_sign,
    verify_signature as verify_rsa_blind_signature,
)

__version__ = "1.0.0"

__all__ = [
    # JCS
    "canonicalize",
    "jcs_loads",
    "canonicalize_json_string",
    "canonical_digest",
    "canonical_digest_hex",
    # Merkle
    "leaf_hash",
    "node_hash",
    "empty_tree_hash",
    "merkle_tree_hash",
    "merkle_tree_hash_from_hashes",
    "inclusion_proof",
    "verify_inclusion",
    "consistency_proof",
    "verify_consistency",
    "MerkleTree",
    "LEAF_PREFIX",
    "NODE_PREFIX",
    # RSA Blind
    "RSABSSAVariant",
    "BlindingSecret",
    "prepare_msg",
    "client_blind",
    "server_blind_sign",
    "client_finalize",
    "verify_rsa_blind_signature",
    "generate_rsa_keypair",
    # Ed25519
    "generate_ed25519_keypair",
    "ed25519_sign",
    "ed25519_verify",
    "sign_checkpoint",
    "verify_checkpoint",
    "sign_attestation",
    "verify_attestation",
    "b64url_encode",
    "b64url_decode",
    # Models
    "BallotEvidenceRecord",
    "CheckpointRecord",
    # Exceptions
    "CryptoError",
    "CanonicalizationError",
    "DuplicateKeyError",
    "FloatNotPermittedError",
    "InvalidUnicodeError",
    "MerkleError",
    "InclusionProofError",
    "ConsistencyProofError",
    "RSABlindError",
    "BlindingError",
    "InvalidSignatureError",
    "Ed25519Error",
]
