"""
Unit tests for WitnessClient.
"""

from unittest.mock import patch, MagicMock
import pytest
import httpx

from checkpoint_worker.witness_client import WitnessClient
from checkpoint_worker.crypto.signatures import (
    generate_ed25519_keypair,
    compute_witness_signed_message,
)
from checkpoint_worker.exceptions import (
    WitnessConnectionError,
    InvalidWitnessSignatureError,
    WitnessRejectionError,
)


def test_witness_client_post_success():
    """
    Client must successfully submit checkpoint and verify valid witness signature.
    """
    witness_priv, witness_pub = generate_ed25519_keypair()
    client = WitnessClient(
        witness_url="http://localhost:8085",
        pinned_witness_public_key=witness_pub.public_bytes_raw().hex(),
    )

    canonical_bytes = b'{"schema":"himvote.checkpoint.v1","tree_size":1}'
    checkpoint_digest = "e" * 64
    election_id = "test_elec"
    prev_witness_seq = 0

    message = compute_witness_signed_message(
        canonical_checkpoint_bytes=canonical_bytes,
        previous_witness_sequence=prev_witness_seq,
        election_id=election_id,
    )
    sig_hex = witness_priv.sign(message).hex()

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "status": "ACCEPTED",
        "election_id": election_id,
        "checkpoint_digest": checkpoint_digest,
        "tree_size": 1,
        "witness_sequence": 1,
        "witness_key_id": "witness_primary",
        "witness_signature": sig_hex,
    }

    with patch("httpx.Client.post", return_value=mock_resp):
        res = client.post_checkpoint(
            checkpoint_dict={"election_id": election_id},
            canonical_bytes=canonical_bytes,
            checkpoint_digest=checkpoint_digest,
            writer_signature_hex="sig",
            writer_key_id="writer_1",
            consistency_proof_hex=[],
            previous_witness_sequence=prev_witness_seq,
        )
        assert res["status"] == "ACCEPTED"
        assert res["witness_sequence"] == 1


def test_witness_client_signature_mismatch():
    """
    Invalid witness signature must trigger InvalidWitnessSignatureError.
    """
    _, witness_pub = generate_ed25519_keypair()
    client = WitnessClient(
        witness_url="http://localhost:8085",
        pinned_witness_public_key=witness_pub.public_bytes_raw().hex(),
    )

    canonical_bytes = b'{"schema":"himvote.checkpoint.v1"}'
    checkpoint_digest = "e" * 64

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "status": "ACCEPTED",
        "election_id": "elec_bad",
        "checkpoint_digest": checkpoint_digest,
        "witness_sequence": 1,
        "witness_key_id": "witness_primary",
        "witness_signature": "00" * 64,
    }

    with patch("httpx.Client.post", return_value=mock_resp):
        with pytest.raises(InvalidWitnessSignatureError):
            client.post_checkpoint(
                checkpoint_dict={"election_id": "elec_bad"},
                canonical_bytes=canonical_bytes,
                checkpoint_digest=checkpoint_digest,
                writer_signature_hex="sig",
                writer_key_id="writer_1",
                consistency_proof_hex=[],
            )


def test_witness_client_retry_and_connection_failure():
    """
    Network timeouts must trigger configured retries and eventually raise WitnessConnectionError.
    """
    client = WitnessClient(
        witness_url="http://localhost:8085",
        max_retries=2,
        retry_backoff_base=0.01,
    )

    with patch("httpx.Client.post", side_effect=httpx.ConnectTimeout("Connection timed out")):
        with pytest.raises(WitnessConnectionError):
            client.post_checkpoint(
                checkpoint_dict={"election_id": "elec"},
                canonical_bytes=b"bytes",
                checkpoint_digest="d",
                writer_signature_hex="sig",
                writer_key_id="w1",
                consistency_proof_hex=[],
            )
