"""Tests for persistent ReceiptWallet, TrustPinStore, and async archive loading."""

import json
import os
from pathlib import Path
import sys
import threading
import time
import pytest

_REPO_ROOT = Path(__file__).resolve().parents[3]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from apps.linux.himvote_linux import (
    ElectionArchive,
    HimVoteLinuxApp,
    ReceiptWallet,
    SavedReceipt,
    TrustPin,
    TrustPinStore,
)


def test_saved_receipt_serialization() -> None:
    receipt = SavedReceipt(
        receipt_handle="RCPT_TEST_123",
        election_id="demo_union_2026",
        status="WITNESSED",
        leaf_index=5,
        witnessed_at="30 Oct 2026",
        server_commitment="sha256:abc",
        witness_checkpoint="sha256:def",
        ballot_hash="sha256:123",
    )
    data = receipt.to_dict()
    assert data["receipt_handle"] == "RCPT_TEST_123"
    assert data["leaf_index"] == 5

    restored = SavedReceipt.from_dict(data)
    assert restored.receipt_handle == "RCPT_TEST_123"
    assert restored.status == "WITNESSED"
    assert restored.leaf_index == 5


def test_receipt_wallet_persistence_and_deduplication(tmp_path: Path) -> None:
    wallet_file = tmp_path / "test_receipts.json"
    wallet = ReceiptWallet(wallet_file)

    assert len(wallet.list_receipts()) == 0

    rec1 = SavedReceipt(
        receipt_handle="RCPT_001",
        election_id="elec_a",
        status="PENDING_WITNESS",
    )
    wallet.save_receipt(rec1)
    assert len(wallet.list_receipts()) == 1

    # Update state of same receipt handle (deduplication)
    rec1_updated = SavedReceipt(
        receipt_handle="RCPT_001",
        election_id="elec_a",
        status="WITNESSED",
        leaf_index=42,
    )
    wallet.save_receipt(rec1_updated)
    recs = wallet.list_receipts()
    assert len(recs) == 1
    assert recs[0].status == "WITNESSED"
    assert recs[0].leaf_index == 42

    # Add second receipt
    rec2 = SavedReceipt(
        receipt_handle="RCPT_002",
        election_id="elec_b",
        status="ANCHOR_FINALIZED",
    )
    wallet.save_receipt(rec2)
    assert len(wallet.list_receipts()) == 2

    # Remove receipt
    wallet.remove_receipt("RCPT_001")
    recs_after_removal = wallet.list_receipts()
    assert len(recs_after_removal) == 1
    assert recs_after_removal[0].receipt_handle == "RCPT_002"


def test_trust_pin_store_defaults() -> None:
    store = TrustPinStore()
    assert len(store.pins) >= 3

    witness_pin = store.find_pin("witness_ed25519")
    assert witness_pin is not None
    assert "ed25519" in witness_pin.public_key_hex

    issuer_pin = store.find_pin("issuer_rsa")
    assert issuer_pin is not None
    assert "rsa" in issuer_pin.public_key_hex

    anchor_pin = store.find_pin("anchor_evm")
    assert anchor_pin is not None
    assert anchor_pin.public_key_hex.startswith("0x")


@pytest.mark.skipif(not os.environ.get("DISPLAY"), reason="A display server is required for Tk window testing")
def test_async_archive_loading_in_gui(monkeypatch: pytest.MonkeyPatch) -> None:
    sim_dir = _REPO_ROOT / "fixtures" / "simulation_run" / "export"
    if not sim_dir.exists():
        pytest.skip("Simulation export fixtures not present on disk")

    app = HimVoteLinuxApp(None, Path("verifier/verify.py").resolve())
    app.update_idletasks()
    app._show_audit()
    app.update_idletasks()

    # Intercept threading.Thread to run worker synchronously and deterministically
    class SyncWorkerThread:
        def __init__(self, target, daemon=False):
            self.target = target
            self.daemon = daemon

        def start(self):
            self.target()

        def join(self, timeout=None):
            pass

        def is_alive(self):
            return False

    monkeypatch.setattr(threading, "Thread", SyncWorkerThread)

    # Trigger async load
    app._load_archive_path(sim_dir, async_mode=True)
    assert hasattr(app, "archive_progress_bar")

    # Process pending queue events in main thread
    app._poll_async_queue()
    app.update()

    assert app.current_inspection is not None
    assert app.current_inspection.total_leaves == 100
    app.destroy()
