from __future__ import annotations

import json
import zipfile
from pathlib import Path

import pytest

from verifier.core import EXIT_MALFORMED_ARCHIVE, EXIT_OK, EXIT_UNVERIFIABLE, EXIT_VERIFICATION_FAILED, inclusion_status, verify_archive
from verifier.fixture import build_fixture


def test_valid_fixture_passes_with_explicit_native_engine_limitation(tmp_path: Path) -> None:
    archive, trust = build_fixture(tmp_path, "valid")

    report = verify_archive(archive, trust)

    assert report.exit_code == EXIT_OK
    assert report.overall_status == "PASS_WITH_LIMITATIONS"
    assert report.properties["MANIFEST_SIGNATURE"].status == "PASS"
    assert report.properties["MERKLE_ROOT"].status == "PASS"
    assert report.properties["WITNESS_FINALITY"].status == "PASS"
    assert report.properties["ANNOUNCED_TALLY_DIGEST"].status == "PASS"
    assert report.properties["ENGINE_NATIVE_TALLY"].status == "NOT_CHECKED"


@pytest.mark.parametrize(
    ("scenario", "label"),
    [
        ("duplicate", "duplicate credential nullifier"),
        ("insertion", "forged insertion"),
        ("deletion", "ballot deletion"),
        ("modification", "ballot modification"),
        ("tally", "announced tally manipulation"),
    ],
)
def test_mutated_evidence_is_rejected(tmp_path: Path, scenario: str, label: str) -> None:
    archive, trust = build_fixture(tmp_path, scenario)

    report = verify_archive(archive, trust)

    assert report.exit_code == EXIT_VERIFICATION_FAILED, label
    assert report.overall_status == "FAIL"
    assert report.errors


def test_trust_key_replacement_is_rejected(tmp_path: Path) -> None:
    archive, trust = build_fixture(tmp_path, "trust-key")

    report = verify_archive(archive, trust)

    assert report.exit_code == EXIT_VERIFICATION_FAILED
    assert any("signature" in error.lower() or "key" in error.lower() for error in report.errors)


def test_stale_final_checkpoint_is_rejected(tmp_path: Path) -> None:
    archive, trust = build_fixture(tmp_path, "stale-final")

    report = verify_archive(archive, trust)

    assert report.exit_code == EXIT_VERIFICATION_FAILED
    assert any("final" in error.lower() or "checkpoint" in error.lower() for error in report.errors)


def test_duplicate_json_keys_are_rejected(tmp_path: Path) -> None:
    archive, trust = build_fixture(tmp_path, "valid")
    mutated = tmp_path / "duplicate-json.zip"
    with zipfile.ZipFile(archive) as source, zipfile.ZipFile(mutated, "w", compression=zipfile.ZIP_STORED) as target:
        for info in source.infolist():
            data = source.read(info)
            if info.filename == "tally.json":
                data = b'{"payload":{"schema":"securevote.announced-tally.v1","schema":"duplicate"}}'
            target.writestr(info.filename, data)

    report = verify_archive(mutated, trust)

    assert report.exit_code == EXIT_MALFORMED_ARCHIVE
    assert report.properties["ARCHIVE_INTEGRITY"].status == "FAIL"


def test_zip_path_traversal_is_rejected(tmp_path: Path) -> None:
    _, trust = build_fixture(tmp_path, "valid")
    malicious = tmp_path / "path-traversal.zip"
    with zipfile.ZipFile(malicious, "w", compression=zipfile.ZIP_STORED) as archive:
        archive.writestr("../manifest.json", b"{}")

    report = verify_archive(malicious, trust)

    assert report.exit_code == EXIT_MALFORMED_ARCHIVE
    assert report.properties["ARCHIVE_INTEGRITY"].status == "FAIL"


def test_trust_pins_are_not_learned_from_archive(tmp_path: Path) -> None:
    archive, trust = build_fixture(tmp_path, "valid")
    trust_data = json.loads(trust.read_text(encoding="utf-8"))
    trust_data["manifest_digest"] = "f" * 64
    trust.write_text(json.dumps(trust_data), encoding="utf-8")

    report = verify_archive(archive, trust)

    assert report.exit_code == EXIT_VERIFICATION_FAILED
    assert report.properties["EVIDENCE_VERIFICATION"].status == "FAIL"


def test_opaque_inclusion_check_uses_the_pinned_final_evidence(tmp_path: Path) -> None:
    archive, trust = build_fixture(tmp_path, "valid")

    included = inclusion_status(archive, trust, "opaque-ballot-1")
    absent = inclusion_status(archive, trust, "opaque-ballot-not-present")

    assert included.exit_code == EXIT_OK
    assert included.properties["BALLOT_INCLUSION_REQUEST"].status == "PASS"
    assert absent.exit_code == EXIT_VERIFICATION_FAILED
    assert absent.properties["BALLOT_INCLUSION_REQUEST"].status == "FAIL"


def test_missing_trust_material_is_unverifiable_not_verified(tmp_path: Path) -> None:
    archive, _ = build_fixture(tmp_path, "valid")

    report = verify_archive(archive, tmp_path / "missing-trust.json")

    assert report.exit_code == EXIT_UNVERIFIABLE
    assert report.overall_status == "UNVERIFIABLE"
    assert report.properties["TRUST_PINS"].status == "NOT_CHECKED"
