"""Focused negative tests for verifier trust and archive boundaries."""

import base64
import io
import json
import os
import tarfile
import zipfile

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ed25519

from verifier.verify import (
    BadArchiveError,
    CryptoAuthError,
    UnverifiableError,
    canonicalize_json,
    compute_rfc9162_merkle_root,
    format_digest,
    safe_extract_archive,
    safe_json_loads,
    verify_attestation,
    verify_inclusion,
)


def _public_key_pem(key: ed25519.Ed25519PrivateKey) -> str:
    return key.public_key().public_bytes(
        serialization.Encoding.PEM,
        serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode("utf-8")


def test_json_rejects_non_finite_numbers() -> None:
    with pytest.raises(BadArchiveError, match="Non finite"):
        safe_json_loads('{"value": NaN}')


def test_zip_special_entry_is_rejected(tmp_path) -> None:
    archive_path = tmp_path / "special.zip"
    info = zipfile.ZipInfo("device")
    info.external_attr = (0o120777 << 16) | 0xA000
    with zipfile.ZipFile(archive_path, "w") as archive:
        archive.writestr(info, "not a device")

    with pytest.raises(BadArchiveError, match="Symlinks are prohibited"):
        safe_extract_archive(str(archive_path), str(tmp_path / "extract"))


def test_tar_special_entry_is_rejected(tmp_path) -> None:
    archive_path = tmp_path / "special.tar"
    special = tarfile.TarInfo("pipe")
    special.type = tarfile.FIFOTYPE
    with tarfile.open(archive_path, "w") as archive:
        archive.addfile(special)

    with pytest.raises(BadArchiveError, match="Only regular files"):
        safe_extract_archive(str(archive_path), str(tmp_path / "extract"))


def test_inclusion_requires_key_id_when_trust_root_is_rotated(tmp_path) -> None:
    election_id = "election_one"
    manifest_digest = "sha256:" + "1" * 64
    leaf = {
        "election_id": election_id,
        "manifest_digest": manifest_digest,
        "leaf_index": 0,
        "payload": "opaque",
    }
    leaf_bytes = canonicalize_json(leaf)
    root = format_digest(compute_rfc9162_merkle_root([leaf_bytes]))
    export_dir = tmp_path / "export"
    export_dir.mkdir()
    (export_dir / "leaves.json").write_bytes(canonicalize_json([leaf]))

    witness_one = ed25519.Ed25519PrivateKey.generate()
    witness_two = ed25519.Ed25519PrivateKey.generate()
    checkpoint = {
        "checkpoint_kind": "FINAL",
        "election_id": election_id,
        "manifest_digest": manifest_digest,
        "tree_size": 1,
        "merkle_root": root,
    }
    checkpoint["signature"] = base64.b64encode(
        witness_one.sign(canonicalize_json(checkpoint))
    ).decode("ascii")
    final_path = tmp_path / "final.json"
    final_path.write_bytes(canonicalize_json(checkpoint))
    tracker_path = tmp_path / "tracker.json"
    tracker_path.write_bytes(
        canonicalize_json(
            {
                "schema": "himvote.inclusion_tracker.v1",
                "election_id": election_id,
                "manifest_digest": manifest_digest,
                "leaf_index": 0,
                "leaf_digest": format_digest(b"\x00" + leaf_bytes),
                "audit_path": [],
                "root": root,
            }
        )
    )
    trust_path = tmp_path / "trust.json"
    trust_path.write_bytes(
        canonicalize_json(
            {
                "witness_keys": [
                    {"key_id": "old", "public_key_pem": _public_key_pem(witness_one)},
                    {"key_id": "new", "public_key_pem": _public_key_pem(witness_two)},
                ]
            }
        )
    )

    with pytest.raises(UnverifiableError, match="key id is required"):
        verify_inclusion(
            export_path=str(export_dir),
            trust_path=str(trust_path),
            final_path=str(final_path),
            tracker_path=str(tracker_path),
        )


def test_attestation_requires_bound_digest_and_election(tmp_path) -> None:
    auditor = ed25519.Ed25519PrivateKey.generate()
    report = {
        "schema": "himvote.audit_report.v1",
        "election_id": "election_one",
        "overall_status": "PASS_WITH_LIMITATIONS",
    }
    report_path = tmp_path / "report.json"
    report_path.write_bytes(canonicalize_json(report))
    trust_path = tmp_path / "trust.json"
    trust_path.write_bytes(
        canonicalize_json(
            {
                "auditor_key": {
                    "key_id": "auditor_one",
                    "public_key_pem": _public_key_pem(auditor),
                }
            }
        )
    )
    attestation_core = {
        "schema": "himvote.auditor_attestation.v1",
        "election_id": "election_one",
        "auditor_key_id": "auditor_one",
    }
    attestation_core["signature"] = base64.b64encode(
        auditor.sign(canonicalize_json(attestation_core))
    ).decode("ascii")
    attestation_path = tmp_path / "attestation.json"
    attestation_path.write_bytes(canonicalize_json(attestation_core))

    with pytest.raises(CryptoAuthError, match="report digest"):
        verify_attestation(
            report_path=str(report_path),
            attestation_path=str(attestation_path),
            trust_path=str(trust_path),
        )
