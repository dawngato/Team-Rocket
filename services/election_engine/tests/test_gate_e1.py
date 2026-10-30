"""Test suite verifying Gate E1 execution and requirements."""

from ..gate_e1 import run_gate_e1_suite


def test_gate_e1_complete_suite() -> None:
    """Verify that Gate E1 verification script completes all steps successfully."""
    result = run_gate_e1_suite()
    assert result["success"] is True
    assert result["steps"]["1_create_and_cast_ballot"] == "PASS"
    assert result["steps"]["2_export_proof_artifacts"] == "PASS"
    assert result["steps"]["3_run_independent_verifier"] == "PASS"
    assert result["steps"]["4_tamper_detection"] == "PASS"
    assert result["steps"]["5_single_cast_enforcement"] == "PASS"
