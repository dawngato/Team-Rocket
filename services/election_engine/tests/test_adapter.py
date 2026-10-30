"""Unit tests for VotingEngineAdapter interface methods."""

import pytest

from ..adapter import (
    BallotValidationError,
    CredentialValidationError,
    DuplicateNullifierError,
    InclusionVerificationError,
    TallyVerificationError,
    VotingEngineAdapter,
)
from ..booth import create_encrypted_ballot
from ..constants import G, P, PROTOCOL_VERSION
from ..credentials import IssuerKeyPair, VoterCredential
from ..crypto import (
    ElGamalCiphertext,
    TrusteeKeyPair,
    canonical_json,
    prove_dleq,
    sha256_digest,
)


def test_get_protocol_version() -> None:
    """Verify get_protocol_version returns correct protocol string."""
    adapter = VotingEngineAdapter()
    assert adapter.get_protocol_version() == PROTOCOL_VERSION


def test_multi_voter_election_tally() -> None:
    """Verify end to end multi voter election with threshold tallying."""
    election_id = "election_multi_voter"
    candidates = ["candidate_one", "candidate_two"]
    manifest_prelim = {"election_id": election_id, "candidates": candidates}
    manifest_digest = sha256_digest(canonical_json(manifest_prelim)).hex()

    # Two trustees
    t1 = TrusteeKeyPair.generate("trustee_1", manifest_digest, election_id)
    t2 = TrusteeKeyPair.generate("trustee_2", manifest_digest, election_id)
    joint_pk = (t1.public_key_share * t2.public_key_share) % P

    manifest = {
        "election_id": election_id,
        "manifest_digest": manifest_digest,
        "candidates": candidates,
        "joint_public_key": hex(joint_pk),
    }

    issuer = IssuerKeyPair.generate(key_id="issuer_multi", key_size=2048)
    issuer_pub = issuer.get_public_dict()

    adapter = VotingEngineAdapter()

    # Three voters: voter 1 votes candidate_one, voter 2 votes candidate_two, voter 3 votes candidate_two
    votes = ["candidate_one", "candidate_two", "candidate_two"]
    expected_results = {"candidate_one": 1, "candidate_two": 2}

    ballots_list = []
    cts_accum = {c: [] for c in candidates}

    for idx, chosen_cand in enumerate(votes):
        voter = VoterCredential.create(election_id)
        blinded = voter.generate_blinded_request(issuer.modulus_n, issuer.public_exponent_e)
        blind_sig = issuer.sign_blinded_request(blinded)
        voter.unblind_signature(blind_sig, issuer.modulus_n)
        cred_proof = voter.get_credential_proof(manifest_digest)

        b_data, p_data, _ = create_encrypted_ballot(
            election_id=election_id,
            manifest_digest=manifest_digest,
            candidates=candidates,
            selected_candidate_id=chosen_cand,
            joint_public_key=joint_pk,
        )

        receipt = adapter.cast_ballot(
            election_id=election_id,
            manifest_digest=manifest_digest,
            ballot_data=b_data,
            proofs_data=p_data,
            credential_proof_data=cred_proof,
            issuer_public_key=issuer_pub,
        )
        assert receipt["leaf_index"] == idx
        ballots_list.append((b_data, p_data))

        for c_entry in b_data["ciphertexts"]:
            cts_accum[c_entry["candidate_id"]].append(ElGamalCiphertext.from_dict(c_entry))

    # Export ballots
    export_payload = adapter.export_ballots(election_id, manifest_digest)
    assert export_payload["ballot_count"] == 3

    # Check Merkle inclusion for all 3 ballots
    root = export_payload["merkle_root"]
    for i in range(3):
        item = export_payload["ballots"][i]
        path = adapter.merkle_trees[election_id].get_audit_path(i)
        assert adapter.verify_inclusion(manifest, item["leaf_hash"], i, path, root) is True

    # Bad inclusion check with altered leaf hash
    bad_leaf_hash = "0" * 64
    with pytest.raises(InclusionVerificationError):
        adapter.verify_inclusion(manifest, bad_leaf_hash, 0, path, root)

    # Compute homomorphically aggregated ciphertexts
    agg_a = {}
    agg_b = {}
    for c_id in candidates:
        cur_a = 1
        cur_b = 1
        for ct in cts_accum[c_id]:
            cur_a = (cur_a * ct.a) % P
            cur_b = (cur_b * ct.b) % P
        agg_a[c_id] = cur_a
        agg_b[c_id] = cur_b

    # Trustees produce decryption shares and proofs
    trustee_proofs = {"trustees": []}
    for t_obj in [t1, t2]:
        t_shares = {}
        for c_id in candidates:
            share_val = pow(agg_a[c_id], t_obj.secret_key, P)
            dleq = prove_dleq(
                manifest_digest=manifest_digest,
                election_id=election_id,
                trustee_id=t_obj.trustee_id,
                candidate_id=c_id,
                public_key_share=t_obj.public_key_share,
                aggregated_a=agg_a[c_id],
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

    tally_result = {
        "election_id": election_id,
        "manifest_digest": manifest_digest,
        "total_ballots": 3,
        "results": expected_results,
    }

    assert adapter.verify_tally(manifest, export_payload, tally_result, trustee_proofs) is True

    # Wrong tally total should fail
    bad_tally_result = {
        "election_id": election_id,
        "manifest_digest": manifest_digest,
        "total_ballots": 3,
        "results": {"candidate_one": 2, "candidate_two": 1},
    }
    with pytest.raises(TallyVerificationError):
        adapter.verify_tally(manifest, export_payload, bad_tally_result, trustee_proofs)
