"""
Unit tests for witness client and contract client operations.
Verifies parsing, encoding, and state lookups.
"""

from unittest.mock import MagicMock, patch
import requests
import pytest
from hexbytes import HexBytes
from web3 import Web3
from anchor_relayer.contract_client import HimVoteAnchorClient
from anchor_relayer.models import WitnessedCheckpoint
from anchor_relayer.witness_client import WitnessClient, WitnessServiceError


def test_witness_client_fetch_unanchored():
    """
    Verifies WitnessClient fetches and parses pending unanchored checkpoints.
    """
    client = WitnessClient(base_url="http://127.0.0.1:8086")

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "checkpoints": [
            {
                "election_commitment": "0x" + "a" * 64,
                "sequence": 1,
                "digest": "0x" + "b" * 64,
                "previous_digest": "0x" + "0" * 64,
                "is_final": False,
                "witness_signature": "0xsig1",
            },
            {
                "election_commitment": "0x" + "a" * 64,
                "sequence": 2,
                "digest": "0x" + "c" * 64,
                "previous_digest": "0x" + "b" * 64,
                "is_final": True,
                "witness_signature": "0xsig2",
            },
        ]
    }

    with patch("requests.get", return_value=mock_response):
        cps = client.get_unanchored_checkpoints(election_id="election_1")
        assert len(cps) == 2
        assert cps[0].sequence == 1
        assert cps[0].is_final is False
        assert cps[1].sequence == 2
        assert cps[1].is_final is True


def test_witness_client_does_not_hide_missing_pending_endpoint():
    client = WitnessClient(base_url="http://127.0.0.1:8086")
    mock_response = MagicMock()
    mock_response.raise_for_status.side_effect = requests.HTTPError("404 Not Found")

    with patch("requests.get", return_value=mock_response):
        with pytest.raises(WitnessServiceError, match="pending checkpoints"):
            client.get_unanchored_checkpoints()


def test_witness_client_get_final_checkpoint():
    """
    Verifies WitnessClient fetches the final signed checkpoint.
    """
    client = WitnessClient(base_url="http://127.0.0.1:8086")

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "election_commitment": "0x" + "e" * 64,
        "sequence": 10,
        "digest": "0x" + "f" * 64,
        "previous_digest": "0x" + "d" * 64,
        "is_final": True,
    }

    with patch("requests.get", return_value=mock_response):
        final_cp = client.get_final_checkpoint("election_1")
        assert final_cp is not None
        assert final_cp.sequence == 10
        assert final_cp.is_final is True


def test_contract_client_lookups():
    """
    Verifies HimVoteAnchorClient queries sequence, finality, and checkpoints.
    """
    mock_w3 = MagicMock()
    mock_contract = MagicMock()
    mock_w3.eth.contract.return_value = mock_contract

    client = HimVoteAnchorClient(
        w3=mock_w3,
        contract_address="0x5FbDB2315678afecb367f032d93F642f64180aa3",
    )

    commitment_hex = "0x" + "1" * 64
    digest_hex = "0x" + "2" * 64

    mock_contract.functions.latestSequence.return_value.call.return_value = 5
    assert client.get_latest_sequence(commitment_hex) == 5

    mock_contract.functions.isFinalized.return_value.call.return_value = True
    assert client.is_finalized(commitment_hex) is True

    digest_bytes = bytes.fromhex("2" * 64)
    mock_contract.functions.getCheckpoint.return_value.call.return_value = (
        5,
        digest_bytes,
        bytes.fromhex("0" * 64),
        True,
        150,
        1700000000,
    )

    assert client.is_already_anchored(commitment_hex, 5, digest_hex) is True
    assert client.is_already_anchored(commitment_hex, 6, digest_hex) is False
