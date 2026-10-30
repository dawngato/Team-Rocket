"""
Comprehensive integration and unit tests for CheckpointWorker.
Tests strict sequential outbox polling, RFC 9162 Merkle tree state,
idempotency, network fault handling, and DISPUTED transitions on conflicting hashes.
"""

from unittest.mock import patch
import pytest
from sqlalchemy import select

from checkpoint_worker.worker import CheckpointWorker
from checkpoint_worker.witness_client import WitnessClient
from checkpoint_worker.crypto.signatures import (
    generate_ed25519_keypair,
    compute_witness_signed_message,
)
from checkpoint_worker.crypto.merkle_tree import compute_leaf_hash
from checkpoint_worker.models.database import (
    ElectionState,
    CheckpointOutbox,
    WitnessAcknowledgement,
    ElectionEvent,
    utcnow,
)
from checkpoint_worker.exceptions import DisputedTreeError, WitnessConnectionError


def make_leaf(election_id: str, index: int, text_payload: str) -> CheckpointOutbox:
    """Helper to construct outbox entry with valid RFC 9162 leaf hash."""
    leaf_bytes = text_payload.encode("utf-8")
    h = compute_leaf_hash(leaf_bytes).hex()
    return CheckpointOutbox(
        election_id=election_id,
        leaf_index=index,
        leaf_hash=h,
        leaf_data=text_payload,
        status="PENDING",
        created_at=utcnow(),
    )


def mock_witness_response(witness_priv, election_id: str):
    """Factory creating a mock witness client callback."""
    witness_seq_counter = [0]

    def _post(
        checkpoint_dict,
        canonical_bytes,
        checkpoint_digest,
        writer_signature_hex,
        writer_key_id,
        consistency_proof_hex,
        previous_witness_sequence=0,
    ):
        witness_seq_counter[0] += 1
        msg = compute_witness_signed_message(
            canonical_checkpoint_bytes=canonical_bytes,
            previous_witness_sequence=previous_witness_sequence,
            election_id=election_id,
        )
        sig_hex = witness_priv.sign(msg).hex()
        return {
            "status": "ACCEPTED",
            "election_id": election_id,
            "checkpoint_digest": checkpoint_digest,
            "tree_size": checkpoint_dict["tree_size"],
            "checkpoint_sequence": checkpoint_dict["checkpoint_sequence"],
            "witness_sequence": witness_seq_counter[0],
            "witness_key_id": "witness_primary",
            "witness_signature": sig_hex,
            "witnessed_at": utcnow().isoformat(),
        }

    return _post


def test_worker_polls_in_strict_sequential_order(db_session_factory, crypto_keys, sample_election):
    """
    Worker must process pending outbox rows in strict leaf index sequence 0, 1, 2.
    """
    election_id = sample_election
    witness_priv = crypto_keys["witness_priv"]
    witness_pub = crypto_keys["witness_pub"]

    witness_client = WitnessClient(
        witness_url="http://localhost:8085",
        pinned_witness_public_key=witness_pub.public_bytes_raw().hex(),
    )

    worker = CheckpointWorker(
        session_factory=db_session_factory,
        witness_client=witness_client,
        log_writer_private_key_raw=crypto_keys["writer_priv"].private_bytes_raw().hex(),
        batch_size=10,
    )

    with db_session_factory() as session:
        session.add(make_leaf(election_id, 0, "ballot_zero"))
        session.add(make_leaf(election_id, 1, "ballot_one"))
        session.add(make_leaf(election_id, 2, "ballot_two"))
        session.commit()

    with patch.object(witness_client, "post_checkpoint", side_effect=mock_witness_response(witness_priv, election_id)):
        result = worker.process_election(election_id)

    assert result is not None
    assert result["tree_size"] == 3
    assert result["checkpoint_sequence"] == 1
    assert result["checkpoint_kind"] == "INCREMENTAL"

    with db_session_factory() as session:
        state = session.get(ElectionState, election_id)
        assert state.last_witnessed_tree_size == 3

        outbox_items = (
            session.execute(
                select(CheckpointOutbox).where(CheckpointOutbox.election_id == election_id)
            )
            .scalars()
            .all()
        )
        assert len(outbox_items) == 3
        for item in outbox_items:
            assert item.status == "PROCESSED"
            assert item.processed_at is not None

        ack = (
            session.execute(
                select(WitnessAcknowledgement).where(WitnessAcknowledgement.election_id == election_id)
            )
            .scalars()
            .first()
        )
        assert ack is not None
        assert ack.tree_size == 3
        assert ack.checkpoint_sequence == 1


def test_worker_never_skips_gaps(db_session_factory, crypto_keys, sample_election):
    """
    If leaf index 1 is missing, worker processes leaf 0 and halts before leaf 2.
    """
    election_id = sample_election
    witness_priv = crypto_keys["witness_priv"]
    witness_pub = crypto_keys["witness_pub"]

    witness_client = WitnessClient(
        witness_url="http://localhost:8085",
        pinned_witness_public_key=witness_pub.public_bytes_raw().hex(),
    )

    worker = CheckpointWorker(
        session_factory=db_session_factory,
        witness_client=witness_client,
        log_writer_private_key_raw=crypto_keys["writer_priv"].private_bytes_raw().hex(),
        batch_size=10,
    )

    with db_session_factory() as session:
        session.add(make_leaf(election_id, 0, "ballot_zero"))
        session.add(make_leaf(election_id, 2, "ballot_two_with_gap"))
        session.commit()

    with patch.object(witness_client, "post_checkpoint", side_effect=mock_witness_response(witness_priv, election_id)):
        res = worker.process_election(election_id)

    assert res is not None
    assert res["tree_size"] == 1

    with db_session_factory() as session:
        state = session.get(ElectionState, election_id)
        assert state.last_witnessed_tree_size == 1

        leaf2 = (
            session.execute(
                select(CheckpointOutbox).where(
                    CheckpointOutbox.election_id == election_id,
                    CheckpointOutbox.leaf_index == 2,
                )
            )
            .scalars()
            .first()
        )
        assert leaf2.status == "PENDING"

    with patch.object(witness_client, "post_checkpoint", side_effect=mock_witness_response(witness_priv, election_id)):
        res2 = worker.process_election(election_id)
    assert res2 is None


def test_worker_halts_and_marks_disputed_on_conflicting_hash(db_session_factory, crypto_keys, sample_election):
    """
    Duplicate leaf index with conflicting hash must trigger hard fault,
    mark election DISPUTED, record audit event, and raise DisputedTreeError.
    """
    election_id = sample_election
    witness_priv = crypto_keys["witness_priv"]
    witness_pub = crypto_keys["witness_pub"]

    witness_client = WitnessClient(
        witness_url="http://localhost:8085",
        pinned_witness_public_key=witness_pub.public_bytes_raw().hex(),
    )

    worker = CheckpointWorker(
        session_factory=db_session_factory,
        witness_client=witness_client,
        log_writer_private_key_raw=crypto_keys["writer_priv"].private_bytes_raw().hex(),
    )

    with db_session_factory() as session:
        session.add(make_leaf(election_id, 0, "legitimate_leaf_0"))
        session.commit()

    with patch.object(witness_client, "post_checkpoint", side_effect=mock_witness_response(witness_priv, election_id)):
        worker.process_election(election_id)

    with db_session_factory() as session:
        conflicting_leaf = CheckpointOutbox(
            election_id=election_id,
            leaf_index=0,
            leaf_hash="f" * 64,
            leaf_data="forged_leaf_0",
            status="PENDING",
            created_at=utcnow(),
        )
        session.add(conflicting_leaf)
        session.commit()

    with pytest.raises(DisputedTreeError):
        worker.process_election(election_id)

    with db_session_factory() as session:
        state = session.get(ElectionState, election_id)
        assert state.state == "DISPUTED"

        events = (
            session.execute(
                select(ElectionEvent).where(
                    ElectionEvent.election_id == election_id,
                    ElectionEvent.event_type == "ELECTION_DISPUTED",
                )
            )
            .scalars()
            .all()
        )
        assert len(events) == 1
        assert "Conflicting leaf hash" in events[0].payload


def test_worker_idempotency_on_identical_duplicate(db_session_factory, crypto_keys, sample_election):
    """
    Duplicate outbox entry with same leaf index and IDENTICAL leaf hash
    must be safely handled without tree corruption or state failure.
    """
    election_id = sample_election
    witness_priv = crypto_keys["witness_priv"]
    witness_pub = crypto_keys["witness_pub"]

    witness_client = WitnessClient(
        witness_url="http://localhost:8085",
        pinned_witness_public_key=witness_pub.public_bytes_raw().hex(),
    )

    worker = CheckpointWorker(
        session_factory=db_session_factory,
        witness_client=witness_client,
        log_writer_private_key_raw=crypto_keys["writer_priv"].private_bytes_raw().hex(),
    )

    with db_session_factory() as session:
        session.add(make_leaf(election_id, 0, "first_leaf"))
        session.commit()

    with patch.object(witness_client, "post_checkpoint", side_effect=mock_witness_response(witness_priv, election_id)):
        worker.process_election(election_id)

    with db_session_factory() as session:
        session.add(make_leaf(election_id, 0, "first_leaf"))
        session.add(make_leaf(election_id, 1, "second_leaf"))
        session.commit()

    with patch.object(witness_client, "post_checkpoint", side_effect=mock_witness_response(witness_priv, election_id)):
        res = worker.process_election(election_id)

    assert res is not None
    assert res["tree_size"] == 2

    with db_session_factory() as session:
        state = session.get(ElectionState, election_id)
        assert state.state == "OPEN"
        assert state.last_witnessed_tree_size == 2


def test_worker_final_checkpoint_generation(db_session_factory, crypto_keys, sample_election):
    """
    When election reaches final tree size in CLOSING state,
    checkpoint kind must be FINAL and election transitions to FINAL_WITNESSED.
    """
    election_id = sample_election
    witness_priv = crypto_keys["witness_priv"]
    witness_pub = crypto_keys["witness_pub"]

    witness_client = WitnessClient(
        witness_url="http://localhost:8085",
        pinned_witness_public_key=witness_pub.public_bytes_raw().hex(),
    )

    worker = CheckpointWorker(
        session_factory=db_session_factory,
        witness_client=witness_client,
        log_writer_private_key_raw=crypto_keys["writer_priv"].private_bytes_raw().hex(),
    )

    with db_session_factory() as session:
        state = session.get(ElectionState, election_id)
        state.state = "CLOSING"
        state.final_tree_size = 2
        session.add(make_leaf(election_id, 0, "final_test_0"))
        session.add(make_leaf(election_id, 1, "final_test_1"))
        session.commit()

    with patch.object(witness_client, "post_checkpoint", side_effect=mock_witness_response(witness_priv, election_id)):
        res = worker.process_election(election_id)

    assert res is not None
    assert res["checkpoint_kind"] == "FINAL"
    assert res["tree_size"] == 2

    with db_session_factory() as session:
        state = session.get(ElectionState, election_id)
        assert state.state == "FINAL_WITNESSED"
        assert state.last_witnessed_tree_size == 2


def test_worker_network_interruption_resilience(db_session_factory, crypto_keys, sample_election):
    """
    Network failures during witness submission must not commit unacknowledged state.
    Worker must rollback in memory tree mutations and cleanly retry upon recovery.
    """
    election_id = sample_election
    witness_priv = crypto_keys["witness_priv"]
    witness_pub = crypto_keys["witness_pub"]

    witness_client = WitnessClient(
        witness_url="http://localhost:8085",
        pinned_witness_public_key=witness_pub.public_bytes_raw().hex(),
        max_retries=1,
    )

    worker = CheckpointWorker(
        session_factory=db_session_factory,
        witness_client=witness_client,
        log_writer_private_key_raw=crypto_keys["writer_priv"].private_bytes_raw().hex(),
    )

    with db_session_factory() as session:
        session.add(make_leaf(election_id, 0, "resilient_leaf_0"))
        session.commit()

    with patch.object(witness_client, "post_checkpoint", side_effect=WitnessConnectionError("Timeout")):
        with pytest.raises(WitnessConnectionError):
            worker.process_election(election_id)

    with db_session_factory() as session:
        state = session.get(ElectionState, election_id)
        assert state.last_witnessed_tree_size == 0

        leaf0 = session.execute(select(CheckpointOutbox)).scalars().first()
        assert leaf0.status == "PENDING"

    with patch.object(witness_client, "post_checkpoint", side_effect=mock_witness_response(witness_priv, election_id)):
        res = worker.process_election(election_id)

    assert res is not None
    assert res["tree_size"] == 1

    with db_session_factory() as session:
        state = session.get(ElectionState, election_id)
        assert state.last_witnessed_tree_size == 1
        leaf0 = session.execute(select(CheckpointOutbox)).scalars().first()
        assert leaf0.status == "PROCESSED"


def test_worker_halts_on_leaf_data_hash_mismatch(db_session_factory, crypto_keys, sample_election):
    """
    If leaf data does not hash to leaf_hash, worker halts and marks DISPUTED.
    """
    election_id = sample_election
    witness_priv = crypto_keys["witness_priv"]
    witness_pub = crypto_keys["witness_pub"]

    witness_client = WitnessClient(
        witness_url="http://localhost:8085",
        pinned_witness_public_key=witness_pub.public_bytes_raw().hex(),
    )

    worker = CheckpointWorker(
        session_factory=db_session_factory,
        witness_client=witness_client,
        log_writer_private_key_raw=crypto_keys["writer_priv"].private_bytes_raw().hex(),
    )

    with db_session_factory() as session:
        corrupted_leaf = CheckpointOutbox(
            election_id=election_id,
            leaf_index=0,
            leaf_hash="a" * 64,
            leaf_data="actual_content_does_not_match",
            status="PENDING",
            created_at=utcnow(),
        )
        session.add(corrupted_leaf)
        session.commit()

    with pytest.raises(DisputedTreeError):
        worker.process_election(election_id)

    with db_session_factory() as session:
        state = session.get(ElectionState, election_id)
        assert state.state == "DISPUTED"


def test_worker_halts_on_conflicting_pending_duplicates(db_session_factory, crypto_keys, sample_election):
    """
    If pending outbox has two rows for same leaf index with different hashes,
    worker marks election DISPUTED and halts.
    """
    election_id = sample_election
    witness_pub = crypto_keys["witness_pub"]

    witness_client = WitnessClient(
        witness_url="http://localhost:8085",
        pinned_witness_public_key=witness_pub.public_bytes_raw().hex(),
    )

    worker = CheckpointWorker(
        session_factory=db_session_factory,
        witness_client=witness_client,
        log_writer_private_key_raw=crypto_keys["writer_priv"].private_bytes_raw().hex(),
    )

    with db_session_factory() as session:
        leaf_a = CheckpointOutbox(
            election_id=election_id,
            leaf_index=0,
            leaf_hash="1" * 64,
            leaf_data="data1",
            status="PENDING",
            created_at=utcnow(),
        )
        leaf_b = CheckpointOutbox(
            election_id=election_id,
            leaf_index=0,
            leaf_hash="2" * 64,
            leaf_data="data2",
            status="PENDING",
            created_at=utcnow(),
        )
        session.add(leaf_a)
        session.add(leaf_b)
        session.commit()

    with pytest.raises(DisputedTreeError):
        worker.process_election(election_id)

    with db_session_factory() as session:
        state = session.get(ElectionState, election_id)
        assert state.state == "DISPUTED"


def test_worker_tree_reload_on_restart(db_session_factory, crypto_keys, sample_election):
    """
    Worker restart must restore Merkle tree from database up to last witnessed tree size.
    """
    election_id = sample_election
    witness_priv = crypto_keys["witness_priv"]
    witness_pub = crypto_keys["witness_pub"]

    witness_client = WitnessClient(
        witness_url="http://localhost:8085",
        pinned_witness_public_key=witness_pub.public_bytes_raw().hex(),
    )

    worker_1 = CheckpointWorker(
        session_factory=db_session_factory,
        witness_client=witness_client,
        log_writer_private_key_raw=crypto_keys["writer_priv"].private_bytes_raw().hex(),
    )

    with db_session_factory() as session:
        session.add(make_leaf(election_id, 0, "first_vote"))
        session.add(make_leaf(election_id, 1, "second_vote"))
        session.commit()

    with patch.object(witness_client, "post_checkpoint", side_effect=mock_witness_response(witness_priv, election_id)):
        res1 = worker_1.process_election(election_id)
    assert res1["tree_size"] == 2

    # Instantiate fresh worker instance (simulating worker process restart)
    worker_2 = CheckpointWorker(
        session_factory=db_session_factory,
        witness_client=witness_client,
        log_writer_private_key_raw=crypto_keys["writer_priv"].private_bytes_raw().hex(),
    )

    with db_session_factory() as session:
        session.add(make_leaf(election_id, 2, "third_vote"))
        session.commit()

    with patch.object(witness_client, "post_checkpoint", side_effect=mock_witness_response(witness_priv, election_id)):
        res2 = worker_2.process_election(election_id)

    assert res2["tree_size"] == 3
    assert res2["checkpoint_sequence"] == 2

