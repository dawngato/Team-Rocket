"""Single cast enforcement unit tests."""

import pytest

from ..adapter import DuplicateNullifierError, VotingEngineAdapter
from ..booth import create_encrypted_ballot
from ..constants import G, P
from ..credentials import IssuerKeyPair, VoterCredential
from ..crypto import TrusteeKeyPair, canonical_json, sha256_digest


def test_single_cast_enforcement_and_duplicate_rejection() -> None:
    """Verify single cast enforcement prevents duplicate voting with same nullifier."""
    election_id = "election_single_cast_test"
    candidates = ["cand_1", "cand_2"]
    manifest_prelim = {"election_id": election_id, "candidates": candidates}
    manifest_digest = sha256_digest(canonical_json(manifest_prelim)).hex()

    t1 = TrusteeKeyPair.generate("trustee_sc", manifest_digest, election_id)
    joint_pk = t1.public_key_share

    issuer = IssuerKeyPair.generate(key_id="issuer_sc", key_size=2048)
    issuer_pub = issuer.get_public_dict()

    voter1 = VoterCredential.create(election_id)
    blinded = voter1.generate_blinded_request(issuer.modulus_n, issuer.public_exponent_e)
    blind_sig = issuer.sign_blinded_request(blinded)
    voter1.unblind_signature(blind_sig, issuer.modulus_n)
    cred_proof1 = voter1.get_credential_proof(manifest_digest)

    adapter = VotingEngineAdapter()

    # First vote: candidate 1
    ballot_data_1, proofs_data_1, _ = create_encrypted_ballot(
        election_id=election_id,
        manifest_digest=manifest_digest,
        candidates=candidates,
        selected_candidate_id="cand_1",
        joint_public_key=joint_pk,
    )

    receipt = adapter.cast_ballot(
        election_id=election_id,
        manifest_digest=manifest_digest,
        ballot_data=ballot_data_1,
        proofs_data=proofs_data_1,
        credential_proof_data=cred_proof1,
        issuer_public_key=issuer_pub,
    )
    assert receipt["leaf_index"] == 0

    # Second vote attempt: candidate 2 using same credential
    ballot_data_2, proofs_data_2, _ = create_encrypted_ballot(
        election_id=election_id,
        manifest_digest=manifest_digest,
        candidates=candidates,
        selected_candidate_id="cand_2",
        joint_public_key=joint_pk,
    )

    with pytest.raises(DuplicateNullifierError):
        adapter.cast_ballot(
            election_id=election_id,
            manifest_digest=manifest_digest,
            ballot_data=ballot_data_2,
            proofs_data=proofs_data_2,
            credential_proof_data=cred_proof1,
            issuer_public_key=issuer_pub,
        )

    # Fifty repeated attempts must all fail
    for _ in range(50):
        with pytest.raises(DuplicateNullifierError):
            adapter.cast_ballot(
                election_id=election_id,
                manifest_digest=manifest_digest,
                ballot_data=ballot_data_2,
                proofs_data=proofs_data_2,
                credential_proof_data=cred_proof1,
                issuer_public_key=issuer_pub,
            )

    # Different voter credential should succeed
    voter2 = VoterCredential.create(election_id)
    blinded2 = voter2.generate_blinded_request(issuer.modulus_n, issuer.public_exponent_e)
    blind_sig2 = issuer.sign_blinded_request(blinded2)
    voter2.unblind_signature(blind_sig2, issuer.modulus_n)
    cred_proof2 = voter2.get_credential_proof(manifest_digest)

    receipt2 = adapter.cast_ballot(
        election_id=election_id,
        manifest_digest=manifest_digest,
        ballot_data=ballot_data_2,
        proofs_data=proofs_data_2,
        credential_proof_data=cred_proof2,
        issuer_public_key=issuer_pub,
    )
    assert receipt2["leaf_index"] == 1
