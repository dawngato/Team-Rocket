"""
Unit tests for service runner and multi election polling.
"""

from unittest.mock import patch, MagicMock
from checkpoint_worker.service import ServiceRunner
from checkpoint_worker.worker import CheckpointWorker
from checkpoint_worker.witness_client import WitnessClient
from checkpoint_worker.models.database import ElectionState, utcnow
from tests.test_worker import make_leaf, mock_witness_response


def test_service_runner_graceful_shutdown():
    """
    ServiceRunner must stop running flag on signal.
    """
    runner = ServiceRunner()
    assert runner.running is True
    runner._handle_signal(15, None)
    assert runner.running is False


def test_worker_poll_once_multiple_elections(db_session_factory, crypto_keys):
    """
    poll_once must iterate through all active elections.
    """
    e1 = "election_alpha"
    e2 = "election_beta"

    with db_session_factory() as session:
        s1 = ElectionState(
            election_id=e1,
            state="OPEN",
            manifest_digest="1" * 64,
            next_leaf_index=0,
            last_witnessed_tree_size=0,
            issued_count=10,
            issuance_ledger_digest="a" * 64,
            roster_commitment="b" * 64,
            updated_at=utcnow(),
        )
        s2 = ElectionState(
            election_id=e2,
            state="OPEN",
            manifest_digest="2" * 64,
            next_leaf_index=0,
            last_witnessed_tree_size=0,
            issued_count=10,
            issuance_ledger_digest="c" * 64,
            roster_commitment="d" * 64,
            updated_at=utcnow(),
        )
        session.add(s1)
        session.add(s2)
        session.add(make_leaf(e1, 0, "vote_alpha_0"))
        session.add(make_leaf(e2, 0, "vote_beta_0"))
        session.commit()

    witness_priv = crypto_keys["witness_priv"]
    witness_pub = crypto_keys["witness_pub"]
    client = WitnessClient(
        witness_url="http://localhost:8085",
        pinned_witness_public_key=witness_pub.public_bytes_raw().hex(),
    )
    worker = CheckpointWorker(
        session_factory=db_session_factory,
        witness_client=client,
        log_writer_private_key_raw=crypto_keys["writer_priv"].private_bytes_raw().hex(),
    )

    def dynamic_mock(checkpoint_dict, *args, **kwargs):
        eid = checkpoint_dict["election_id"]
        return mock_witness_response(witness_priv, eid)(checkpoint_dict, *args, **kwargs)

    with patch.object(client, "post_checkpoint", side_effect=dynamic_mock):
        results = worker.poll_once()

    assert len(results) == 2
    eids = {r["election_id"] for r in results}
    assert eids == {e1, e2}
