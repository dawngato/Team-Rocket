"""Gate E1 verification script and test suite runner.
Implements the full verification block required by Section 9.1:
1. Create real encrypted ballot and cast it.
2. Export native proof artifacts.
3. Run independent tally verifier.
4. Tamper with one byte of ballot and assert verifier fails.
5. Confirm single cast enforcement.
"""

import copy
import json
import secrets
import sys
from typing import Any, Dict, List, Tuple

if __package__ in (None, ""):
    import os
    import sys
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
    try:
        from services.election_engine.adapter import (
            BallotValidationError,
            DuplicateNullifierError,
            TallyVerificationError,
            VotingEngineAdapter,
        )
        from services.election_engine.booth import create_encrypted_ballot
        from services.election_engine.constants import G, P, PROTOCOL_VERSION
        from services.election_engine.credentials import IssuerKeyPair, VoterCredential
        from services.election_engine.crypto import (
            ElGamalCiphertext,
            TrusteeKeyPair,
            canonical_json,
            prove_dleq,
            sha256_digest,
        )
    except ModuleNotFoundError:
        from HimVote.services.election_engine.adapter import (
            BallotValidationError,
            DuplicateNullifierError,
            TallyVerificationError,
            VotingEngineAdapter,
        )
        from HimVote.services.election_engine.booth import create_encrypted_ballot
        from HimVote.services.election_engine.constants import G, P, PROTOCOL_VERSION
        from HimVote.services.election_engine.credentials import IssuerKeyPair, VoterCredential
        from HimVote.services.election_engine.crypto import (
            ElGamalCiphertext,
            TrusteeKeyPair,
            canonical_json,
            prove_dleq,
            sha256_digest,
        )
else:
    from .adapter import (
        BallotValidationError,
        DuplicateNullifierError,
        TallyVerificationError,
        VotingEngineAdapter,
    )
    from .booth import create_encrypted_ballot
    from .constants import G, P, PROTOCOL_VERSION
    from .credentials import IssuerKeyPair, VoterCredential
    from .crypto import (
        ElGamalCiphertext,
        TrusteeKeyPair,
        canonical_json,
        prove_dleq,
        sha256_digest,
    )


def run_gate_e1_suite() -> Dict[str, Any]:
    """Execute complete Gate E1 test block and return structured results."""
    results: Dict[str, Any] = {
        "gate": "Gate E1",
        "protocol_version": PROTOCOL_VERSION,
        "steps": {},
        "success": False,
    }

    # Step 0: Election and trustee setup
    election_id = "himvote_gate_e1_election"
    candidates = ["candidate_alpha", "candidate_beta", "candidate_gamma"]
    preliminary_manifest = {
        "election_id": election_id,
        "candidates": candidates,
        "title": "Gate E1 Demonstration Election",
    }
    manifest_digest = sha256_digest(canonical_json(preliminary_manifest)).hex()

    trustee_1 = TrusteeKeyPair.generate("trustee_north", manifest_digest, election_id)
    trustee_2 = TrusteeKeyPair.generate("trustee_south", manifest_digest, election_id)

    assert trustee_1.verify_proof_of_knowledge(manifest_digest, election_id)
    assert trustee_2.verify_proof_of_knowledge(manifest_digest, election_id)

    joint_public_key = (trustee_1.public_key_share * trustee_2.public_key_share) % P

    manifest = {
        "election_id": election_id,
        "manifest_digest": manifest_digest,
        "candidates": candidates,
        "joint_public_key": hex(joint_public_key),
    }

    issuer = IssuerKeyPair.generate(key_id="issuer_test_key", key_size=2048)
    issuer_pub = issuer.get_public_dict()

    adapter = VotingEngineAdapter()

    # Step 1: Create real encrypted ballot and cast it
    voter_cred = VoterCredential.create(election_id)
    blinded_int = voter_cred.generate_blinded_request(issuer.modulus_n, issuer.public_exponent_e)
    blind_sig = issuer.sign_blinded_request(blinded_int)
    voter_cred.unblind_signature(blind_sig, issuer.modulus_n)
    cred_proof = voter_cred.get_credential_proof(manifest_digest)

    chosen_candidate = "candidate_beta"
    ballot_data, proofs_data, tracking_code = create_encrypted_ballot(
        election_id=election_id,
        manifest_digest=manifest_digest,
        candidates=candidates,
        selected_candidate_id=chosen_candidate,
        joint_public_key=joint_public_key,
    )

    receipt = adapter.cast_ballot(
        election_id=election_id,
        manifest_digest=manifest_digest,
        ballot_data=ballot_data,
        proofs_data=proofs_data,
        credential_proof_data=cred_proof,
        issuer_public_key=issuer_pub,
    )
    assert receipt["leaf_index"] == 0
    assert receipt["credential_nullifier"] == voter_cred.get_nullifier()
    results["steps"]["1_create_and_cast_ballot"] = "PASS"

    # Step 2: Export native proof artifacts
    exported = adapter.export_ballots(election_id, manifest_digest)
    assert exported["ballot_count"] == 1
    assert exported["merkle_root"] == receipt["merkle_root"]
    results["steps"]["2_export_proof_artifacts"] = "PASS"

    # Step 3: Run independent tally verifier
    # Trustees compute decryption shares and DLEQ proofs
    reported_results = {
        "candidate_alpha": 0,
        "candidate_beta": 1,
        "candidate_gamma": 0,
    }
    tally_result = {
        "election_id": election_id,
        "manifest_digest": manifest_digest,
        "total_ballots": 1,
        "results": reported_results,
    }

    # Extract ciphertexts from ballot
    cts = {c["candidate_id"]: ElGamalCiphertext.from_dict(c) for c in ballot_data["ciphertexts"]}

    trustee_proofs: Dict[str, Any] = {"trustees": []}
    for t_obj in [trustee_1, trustee_2]:
        t_shares: Dict[str, Any] = {}
        for c_id in candidates:
            ct = cts[c_id]
            share_val = pow(ct.a, t_obj.secret_key, P)
            dleq = prove_dleq(
                manifest_digest=manifest_digest,
                election_id=election_id,
                trustee_id=t_obj.trustee_id,
                candidate_id=c_id,
                public_key_share=t_obj.public_key_share,
                aggregated_a=ct.a,
                decryption_share=share_val,
                secret_key_share=t_obj.secret_key,
            )
            t_shares[c_id] = {
                "share": hex(share_val),
                "dleq_proof": dleq.to_dict(),
            }
        trustee_proofs["trustees"].append({
            "trustee_id": t_obj.trustee_id,
            "public_key_share": hex(t_obj.public_key_share),
            "decryption_shares": t_shares,
        })

    independent_adapter = VotingEngineAdapter()
    tally_ok = independent_adapter.verify_tally(
        manifest=manifest,
        exported_ballots=exported,
        tally_result=tally_result,
        trustee_proofs=trustee_proofs,
    )
    assert tally_ok is True
    results["steps"]["3_run_independent_verifier"] = "PASS"

    # Step 4: Alter one byte of the ballot and confirm verifier fails
    tampered_ballot_data = copy.deepcopy(ballot_data)
    original_hex = tampered_ballot_data["ciphertexts"][0]["a"]
    # Flip the last hex nibble
    flipped_char = "0" if original_hex[-1] != "0" else "1"
    tampered_ballot_data["ciphertexts"][0]["a"] = original_hex[:-1] + flipped_char

    tamper_detected = False
    try:
        independent_adapter.validate_ballot(
            election_id=election_id,
            manifest_digest=manifest_digest,
            ballot_data=tampered_ballot_data,
            proofs_data=proofs_data,
        )
    except BallotValidationError:
        tamper_detected = True

    assert tamper_detected is True
    results["steps"]["4_tamper_detection"] = "PASS"

    # Step 5: Confirm single cast enforcement (no revoting)
    second_ballot_data, second_proofs, _ = create_encrypted_ballot(
        election_id=election_id,
        manifest_digest=manifest_digest,
        candidates=candidates,
        selected_candidate_id="candidate_alpha",
        joint_public_key=joint_public_key,
    )

    duplicate_blocked = False
    try:
        adapter.cast_ballot(
            election_id=election_id,
            manifest_digest=manifest_digest,
            ballot_data=second_ballot_data,
            proofs_data=second_proofs,
            credential_proof_data=cred_proof,
            issuer_public_key=issuer_pub,
        )
    except DuplicateNullifierError:
        duplicate_blocked = True

    assert duplicate_blocked is True
    results["steps"]["5_single_cast_enforcement"] = "PASS"

    results["success"] = True
    return results


def main() -> None:
    """Run Gate E1 suite from CLI."""
    print("Executing HimVote Gate E1 Verification Block...")
    suite_result = run_gate_e1_suite()
    print("Gate E1 Results:")
    for step_name, status in suite_result["steps"].items():
        print(f"* {step_name}: {status}")

    if suite_result["success"]:
        print("GATE_E1_PASSED: Profile VEEM verified")
        sys.exit(0)
    else:
        print("GATE_E1_FAILED")
        sys.exit(1)


if __name__ == "__main__":
    main()
