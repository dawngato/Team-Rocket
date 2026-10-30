"""Unit tests for offline election archive loading, safety inspection, and integrity checks."""

from pathlib import Path
import json
import os
import shutil
import sys
import tarfile
import tempfile
import zipfile
import pytest

_REPO_ROOT = Path(__file__).resolve().parents[3]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from apps.linux.himvote_linux import (
    ArchiveError,
    ElectionArchive,
    canonicalize_json,
    format_digest,
)


@pytest.fixture
def sample_archive_dir(tmp_path: Path) -> Path:
    """Create a minimal valid election archive directory."""
    manifest = {
        "election_id": "elec_sample_01",
        "title": "Faculty Representative Election",
        "protocol_version": "himvote 2.0.0",
        "voting_engine": "electionguard 1.0.0",
        "public_eligible_count": 10,
        "candidates": [
            {"id": "cand_a", "name": "Professor Alpha"},
            {"id": "cand_b", "name": "Professor Beta"},
        ],
    }
    manifest_bytes = canonicalize_json(manifest)
    manifest["manifest_digest"] = format_digest(manifest_bytes)

    leaves = [
        {
            "leaf_index": 0,
            "ballot_id": "ballot_0",
            "election_id": "elec_sample_01",
            "manifest_digest": manifest["manifest_digest"],
            "credential_nullifier": "sha256:null_0",
            "selections": {"cand_a": 1},
        },
        {
            "leaf_index": 1,
            "ballot_id": "ballot_1",
            "election_id": "elec_sample_01",
            "manifest_digest": manifest["manifest_digest"],
            "credential_nullifier": "sha256:null_1",
            "selections": {"cand_b": 1},
        },
    ]

    results = {
        "contest_tallies": {"cand_a": 1, "cand_b": 1},
        "total_ballots": 2,
    }

    with open(tmp_path / "manifest.json", "w", encoding="utf_8") as mf:
        json.dump(manifest, mf)
    with open(tmp_path / "leaves.json", "w", encoding="utf_8") as lf:
        json.dump(leaves, lf)
    with open(tmp_path / "results.json", "w", encoding="utf_8") as rf:
        json.dump(results, rf)

    return tmp_path


def test_archive_load_from_directory(sample_archive_dir: Path) -> None:
    archive = ElectionArchive.load(sample_archive_dir)
    res = archive.inspect()
    assert res.election_id == "elec_sample_01"
    assert res.total_leaves == 2
    assert res.manifest_digest_valid is True
    assert res.leaf_sequence_valid is True
    assert res.nullifiers_unique is True
    assert res.tally_recomputed_matches_announced is True
    assert res.is_valid is True
    archive.close()


def test_archive_load_from_zip_file(sample_archive_dir: Path, tmp_path: Path) -> None:
    zip_path = tmp_path / "sample.zip"
    with zipfile.ZipFile(zip_path, "w") as zf:
        for f in sample_archive_dir.glob("*.json"):
            zf.write(f, arcname=f.name)

    archive = ElectionArchive.load(zip_path)
    res = archive.inspect()
    assert res.election_id == "elec_sample_01"
    assert res.total_leaves == 2
    assert res.is_valid is True
    archive.close()


def test_archive_load_from_tar_gz_file(sample_archive_dir: Path, tmp_path: Path) -> None:
    tar_path = tmp_path / "sample.tar.gz"
    with tarfile.open(tar_path, "w:gz") as tf:
        for f in sample_archive_dir.glob("*.json"):
            tf.add(f, arcname=f.name)

    archive = ElectionArchive.load(tar_path)
    res = archive.inspect()
    assert res.election_id == "elec_sample_01"
    assert res.total_leaves == 2
    assert res.is_valid is True
    archive.close()


def test_archive_rejects_nonexistent_path(tmp_path: Path) -> None:
    with pytest.raises(ArchiveError, match="does not exist"):
        ElectionArchive.load(tmp_path / "does_not_exist")


def test_archive_rejects_missing_manifest(tmp_path: Path) -> None:
    empty_dir = tmp_path / "empty"
    empty_dir.mkdir()
    with pytest.raises(ArchiveError, match="manifest.json was not found"):
        ElectionArchive.load(empty_dir)


def test_archive_rejects_symlink_in_directory(sample_archive_dir: Path, tmp_path: Path) -> None:
    target_link = sample_archive_dir / "evil_link.json"
    try:
        target_link.symlink_to(sample_archive_dir / "manifest.json")
    except OSError:
        pytest.skip("Symlink creation not permitted on this platform")

    with pytest.raises(ArchiveError, match="Symlinks are prohibited"):
        ElectionArchive.load(sample_archive_dir)


def test_archive_detects_leaf_sequence_gap(sample_archive_dir: Path) -> None:
    # Introduce gap: leaves 0 and 2 (missing 1)
    leaves = [
        {"leaf_index": 0, "credential_nullifier": "n0", "selections": {"cand_a": 1}},
        {"leaf_index": 2, "credential_nullifier": "n1", "selections": {"cand_b": 1}},
    ]
    with open(sample_archive_dir / "leaves.json", "w", encoding="utf_8") as lf:
        json.dump(leaves, lf)

    archive = ElectionArchive.load(sample_archive_dir)
    res = archive.inspect()
    assert res.leaf_sequence_valid is False
    assert res.is_valid is False
    archive.close()


def test_archive_detects_duplicate_nullifier(sample_archive_dir: Path) -> None:
    leaves = [
        {"leaf_index": 0, "credential_nullifier": "sha256:same_nullifier", "selections": {"cand_a": 1}},
        {"leaf_index": 1, "credential_nullifier": "sha256:same_nullifier", "selections": {"cand_b": 1}},
    ]
    with open(sample_archive_dir / "leaves.json", "w", encoding="utf_8") as lf:
        json.dump(leaves, lf)

    archive = ElectionArchive.load(sample_archive_dir)
    res = archive.inspect()
    assert res.nullifiers_unique is False
    assert res.is_valid is False
    archive.close()


def test_archive_detects_tampered_manifest(sample_archive_dir: Path) -> None:
    with open(sample_archive_dir / "manifest.json", "r", encoding="utf_8") as mf:
        manifest = json.load(mf)
    manifest["title"] = "Tampered Title"
    with open(sample_archive_dir / "manifest.json", "w", encoding="utf_8") as mf:
        json.dump(manifest, mf)

    archive = ElectionArchive.load(sample_archive_dir)
    res = archive.inspect()
    assert res.manifest_digest_valid is False
    assert res.is_valid is False
    archive.close()


def test_simulation_run_export_complete_audit() -> None:
    sim_dir = _REPO_ROOT / "fixtures" / "simulation_run" / "export"
    if not sim_dir.exists():
        pytest.skip("Simulation export fixtures not present on disk")

    archive = ElectionArchive.load(sim_dir)
    res = archive.inspect()
    assert res.is_valid is True
    assert res.total_leaves == 100
    assert res.manifest_digest_valid is True
    assert res.leaf_sequence_valid is True
    assert res.nullifiers_unique is True
    assert res.merkle_root_matches_witness is True
    assert res.last_leaf_matches_witness is True
    assert res.tally_recomputed_matches_announced is True
    archive.close()

def test_archive_loads_full_external_trust_package() -> None:
    sim_dir = _REPO_ROOT / "fixtures" / "simulation_run" / "export"
    if not sim_dir.exists():
        pytest.skip("Simulation export fixtures not present on disk")

    archive = ElectionArchive.load(sim_dir)
    res = archive.inspect()
    assert res.has_witness_final is True
    assert res.has_trust_pins is True
    assert res.has_roster_approval is True
    assert res.has_issuer_closure is True
    assert res.has_chain_pins is True
    assert res.has_attestation is True
    assert res.external_package_complete is True
    assert archive.witness_final is not None
    assert archive.trust_pins is not None
    assert archive.roster_approval is not None
    assert archive.issuer_closure is not None
    assert archive.chain_pins is not None
    assert archive.attestation is not None
    archive.close()


def test_archive_rejects_symlink_in_tar(tmp_path: Path) -> None:
    tar_path = tmp_path / "symlink_evil.tar"
    with tarfile.open(tar_path, "w") as tf:
        info = tarfile.TarInfo(name="manifest.json")
        info.type = tarfile.SYMTYPE
        info.linkname = "/etc/passwd"
        tf.addfile(info)

    with pytest.raises(ArchiveError, match="Symlinks are prohibited in tar"):
        ElectionArchive.load(tar_path)


def test_archive_rejects_path_traversal_in_zip(tmp_path: Path) -> None:
    zip_path = tmp_path / "traversal_evil.zip"
    with zipfile.ZipFile(zip_path, "w") as zf:
        zf.writestr("../manifest.json", "{}")

    with pytest.raises(ArchiveError, match="Path traversal detected"):
        ElectionArchive.load(zip_path)


def test_archive_rejects_path_traversal_in_tar(tmp_path: Path) -> None:
    import io
    tar_path = tmp_path / "traversal_evil.tar"
    with tarfile.open(tar_path, "w") as tf:
        data = b"{}"
        info = tarfile.TarInfo(name="../manifest.json")
        info.size = len(data)
        tf.addfile(info, io.BytesIO(data))

    with pytest.raises(ArchiveError, match="Path traversal detected"):
        ElectionArchive.load(tar_path)

