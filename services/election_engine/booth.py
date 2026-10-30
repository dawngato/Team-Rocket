"""Voting booth module for voter client ballot encryption and proof generation.
Performs client side exponential ElGamal encryption, Cramer Damgard Schoenmakers
disjunctive 0 or 1 proofs, and homomorphic sum proof.
"""

import secrets
from typing import Any, Dict, List, Tuple

from .constants import G, P, Q
from .crypto import (
    ElGamalCiphertext,
    canonical_json,
    prove_disjunctive,
    prove_sum,
    sha256_digest,
)


def create_encrypted_ballot(
    election_id: str,
    manifest_digest: str,
    candidates: List[str],
    selected_candidate_id: str,
    joint_public_key: int,
) -> Tuple[Dict[str, Any], Dict[str, Any], str]:
    """Create a real encrypted ballot with zero knowledge proofs and tracking code."""
    if selected_candidate_id not in candidates:
        raise ValueError("Selected candidate is not in approved candidate list")

    ballot_id = f"ballot_{secrets.token_hex(16)}"
    ciphertexts_list: List[Dict[str, str]] = []
    disjunctive_proofs_list: List[Dict[str, str]] = []

    sum_a = 1
    sum_b = 1
    sum_r = 0

    for cand_id in candidates:
        vote_val = 1 if cand_id == selected_candidate_id else 0
        r_val = secrets.randbelow(Q - 1) + 1

        a_val = pow(G, r_val, P)
        b_val = (pow(joint_public_key, r_val, P) * pow(G, vote_val, P)) % P
        ct = ElGamalCiphertext(a=a_val, b=b_val)

        proof = prove_disjunctive(
            manifest_digest=manifest_digest,
            election_id=election_id,
            candidate_id=cand_id,
            public_key=joint_public_key,
            randomness=r_val,
            plaintext_vote=vote_val,
        )

        ciphertexts_list.append({"candidate_id": cand_id, **ct.to_dict()})
        disjunctive_proofs_list.append({"candidate_id": cand_id, **proof.to_dict()})

        sum_a = (sum_a * a_val) % P
        sum_b = (sum_b * b_val) % P
        sum_r = (sum_r + r_val) % Q

    sum_ct = ElGamalCiphertext(a=sum_a, b=sum_b)
    sum_proof = prove_sum(
        manifest_digest=manifest_digest,
        election_id=election_id,
        public_key=joint_public_key,
        sum_randomness=sum_r,
        sum_ciphertext=sum_ct,
    )

    ballot_data = {
        "election_id": election_id,
        "manifest_digest": manifest_digest,
        "ballot_id": ballot_id,
        "ciphertexts": ciphertexts_list,
    }

    proofs_data = {
        "disjunctive_proofs": disjunctive_proofs_list,
        "sum_proof": sum_proof.to_dict(),
        "public_key": hex(joint_public_key),
    }

    tracking_code = sha256_digest(canonical_json(ballot_data)).hex()
    return ballot_data, proofs_data, tracking_code
