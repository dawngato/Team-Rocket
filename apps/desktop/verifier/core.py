"""Offline verification of the SecureVote evidence wrapper."""

from __future__ import annotations

import hashlib
import json
import os
import stat
import zipfile
from dataclasses import dataclass, field
from pathlib import Path, PurePosixPath
from typing import Any

from .canonical import CanonicalJSONError, canonical_bytes, canonical_digest, parse_json_bytes
from .crypto import CryptoFormatError, RSAPublicKey, parse_public_key, verify_rsa_pkcs1_sha256


STATUS_PASS = "PASS"
STATUS_FAIL = "FAIL"
STATUS_LIMITED = "LIMITED"
STATUS_NOT_CHECKED = "NOT_CHECKED"

EXIT_OK = 0
EXIT_VERIFICATION_FAILED = 2
EXIT_UNVERIFIABLE = 3
EXIT_MALFORMED_ARCHIVE = 4

MAX_FILE_BYTES = 5 * 1024 * 1024
MAX_TOTAL_BYTES = 20 * 1024 * 1024
MAX_FILES = 32

EXPECTED_FILES = {"manifest.json", "ballots.jsonl", "tally.json", "witness-final.json"}
FORBIDDEN_BALLOT_KEYS = {
    "student_id",
    "studentId",
    "voter_id",
    "voterId",
    "email",
    "username",
    "session_id",
    "sessionId",
    "candidate_id",
    "candidateId",
    "choice",
    "plaintext_choice",
    "plaintextChoice",
    "ip",
    "user_agent",
    "userAgent",
}


class ArchiveFormatError(ValueError):
    """The archive is unsafe, malformed, or outside the supported format."""


class EvidenceError(ValueError):
    """Evidence is parseable but violates an evidence invariant."""


@dataclass
class PropertyResult:
    status: str
    detail: str


@dataclass
class VerificationReport:
    properties: dict[str, PropertyResult] = field(default_factory=dict)
    errors: list[str] = field(default_factory=list)
    archive_source: str | None = None
    manifest_digest: str | None = None
    checkpoint_digest: str | None = None
    merkle_root: str | None = None
    tree_size: int | None = None
    unverifiable: bool = False

    def set(self, name: str, status: str, detail: str) -> None:
        self.properties[name] = PropertyResult(status, detail)
        if status == STATUS_FAIL:
            self.errors.append(f"{name}: {detail}")

    @property
    def failed(self) -> bool:
        return any(result.status == STATUS_FAIL for result in self.properties.values())

    @property
    def overall_status(self) -> str:
        if self.failed:
            return STATUS_FAIL
        if self.unverifiable:
            return "UNVERIFIABLE"
        return "PASS_WITH_LIMITATIONS" if any(
            result.status in {STATUS_LIMITED, STATUS_NOT_CHECKED} for result in self.properties.values()
        ) else STATUS_PASS

    @property
    def exit_code(self) -> int:
        if self.properties.get("ARCHIVE_INTEGRITY", PropertyResult(STATUS_PASS, "")).status == STATUS_FAIL:
            return EXIT_MALFORMED_ARCHIVE
        if self.unverifiable:
            return EXIT_UNVERIFIABLE
        return EXIT_VERIFICATION_FAILED if self.failed else EXIT_OK

    def as_dict(self) -> dict[str, Any]:
        return {
            "schema": "securevote.audit-report.v1",
            "overall": self.overall_status,
            "exit_code": self.exit_code,
            "archive_source": self.archive_source,
            "manifest_digest": self.manifest_digest,
            "checkpoint_digest": self.checkpoint_digest,
            "merkle_root": self.merkle_root,
            "tree_size": self.tree_size,
            "unverifiable": self.unverifiable,
            "properties": {
                name: {"status": result.status, "detail": result.detail}
                for name, result in self.properties.items()
            },
            "errors": self.errors,
            "limitations": [
                "This wrapper does not verify Helios or Belenios native ballot/tally proofs.",
                "A local synthetic witness key is not independent organizational trust.",
                "No claim is made about cast-as-intended, coercion resistance, endpoint compromise, or real-election safety.",
            ],
        }


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _is_hex_digest(value: object) -> bool:
    if not isinstance(value, str) or len(value) != 64:
        return False
    try:
        int(value, 16)
    except ValueError:
        return False
    return value == value.lower()


def leaf_hash(record: dict[str, Any]) -> bytes:
    return hashlib.sha256(b"\x00" + canonical_bytes(record)).digest()


def merkle_root(leaf_hashes: list[bytes]) -> bytes:
    """RFC 6962-style Merkle Tree Hash with domain-separated nodes."""

    if not leaf_hashes:
        return hashlib.sha256(b"").digest()
    if len(leaf_hashes) == 1:
        return leaf_hashes[0]
    split = 1 << (len(leaf_hashes).bit_length() - 1)
    if split == len(leaf_hashes):
        split //= 2
    left = merkle_root(leaf_hashes[:split])
    right = merkle_root(leaf_hashes[split:])
    return hashlib.sha256(b"\x01" + left + right).digest()


def _read_directory(source: Path) -> dict[str, bytes]:
    if not source.is_dir():
        raise ArchiveFormatError(f"archive path is not a directory or zip: {source}")
    files: dict[str, bytes] = {}
    total = 0
    for path in source.rglob("*"):
        if path.is_symlink():
            raise ArchiveFormatError(f"symlink is not allowed in evidence directory: {path}")
        if not path.is_file():
            continue
        relative = path.relative_to(source).as_posix()
        if relative not in EXPECTED_FILES:
            raise ArchiveFormatError(f"unexpected evidence file: {relative}")
        size = path.stat().st_size
        if size > MAX_FILE_BYTES:
            raise ArchiveFormatError(f"evidence file exceeds size limit: {relative}")
        total += size
        if total > MAX_TOTAL_BYTES:
            raise ArchiveFormatError("evidence archive exceeds total size limit")
        files[relative] = path.read_bytes()
    return files


def _safe_zip_name(name: str) -> str:
    if not name or "\\" in name or "\x00" in name:
        raise ArchiveFormatError("zip contains an invalid filename")
    path = PurePosixPath(name)
    if path.is_absolute() or any(part in {"", ".", ".."} for part in path.parts):
        raise ArchiveFormatError(f"zip path traversal or ambiguous path: {name!r}")
    normalized = path.as_posix()
    if normalized != name or normalized not in EXPECTED_FILES:
        raise ArchiveFormatError(f"unexpected zip member: {name!r}")
    return normalized


def _read_zip(source: Path) -> dict[str, bytes]:
    files: dict[str, bytes] = {}
    total = 0
    try:
        with zipfile.ZipFile(source) as archive:
            infos = archive.infolist()
            if len(infos) > MAX_FILES:
                raise ArchiveFormatError("zip contains too many files")
            for info in infos:
                name = _safe_zip_name(info.filename)
                if name in files:
                    raise ArchiveFormatError(f"duplicate zip member: {name}")
                mode = (info.external_attr >> 16) & 0o170000
                if mode == stat.S_IFLNK:
                    raise ArchiveFormatError(f"zip symlink is not allowed: {name}")
                if info.flag_bits & 0x1:
                    raise ArchiveFormatError("encrypted zip members are not supported")
                if info.file_size > MAX_FILE_BYTES:
                    raise ArchiveFormatError(f"zip member exceeds size limit: {name}")
                total += info.file_size
                if total > MAX_TOTAL_BYTES:
                    raise ArchiveFormatError("zip exceeds total uncompressed size limit")
                data = archive.read(info)
                if len(data) != info.file_size:
                    raise ArchiveFormatError(f"zip member size mismatch: {name}")
                files[name] = data
    except zipfile.BadZipFile as exc:
        raise ArchiveFormatError(f"invalid zip archive: {exc}") from exc
    return files


def read_archive(source: str | os.PathLike[str]) -> dict[str, bytes]:
    path = Path(source)
    if path.is_dir():
        files = _read_directory(path)
    elif path.is_file():
        files = _read_zip(path)
    else:
        raise ArchiveFormatError(f"archive does not exist: {path}")
    missing = EXPECTED_FILES - files.keys()
    if missing:
        raise ArchiveFormatError(f"archive is missing required files: {', '.join(sorted(missing))}")
    return files


def _load_json(files: dict[str, bytes], name: str) -> Any:
    try:
        return parse_json_bytes(files[name], source=name)
    except CanonicalJSONError as exc:
        raise ArchiveFormatError(str(exc)) from exc


def _load_trust(path: str | os.PathLike[str]) -> dict[str, Any]:
    try:
        raw = Path(path).read_bytes()
    except OSError:
        raise
    try:
        value = parse_json_bytes(raw, source="trust pins")
    except CanonicalJSONError as exc:
        raise EvidenceError(f"cannot load trust pins: {exc}") from exc
    if not isinstance(value, dict) or value.get("schema") != "securevote.trust-pins.v1":
        raise EvidenceError("trust pins have an unsupported schema")
    required = {
        "election_id",
        "manifest_digest",
        "manifest_key",
        "witness_key",
        "final_checkpoint_digest",
        "final_tree_size",
        "final_sequence",
    }
    missing = required - value.keys()
    if missing:
        raise EvidenceError(f"trust pins missing fields: {', '.join(sorted(missing))}")
    if not isinstance(value["election_id"], str) or not _is_hex_digest(value["manifest_digest"]):
        raise EvidenceError("trust pins have invalid election or manifest binding")
    if not _is_hex_digest(value["final_checkpoint_digest"]):
        raise EvidenceError("trust pins have invalid final checkpoint digest")
    for field_name in ("final_tree_size", "final_sequence"):
        if not isinstance(value[field_name], int) or value[field_name] < 0:
            raise EvidenceError(f"trust pins have invalid {field_name}")
    value["manifest_key_parsed"] = parse_public_key(value["manifest_key"])
    value["witness_key_parsed"] = parse_public_key(value["witness_key"])
    return value


def _verify_signed_wrapper(value: Any, key: RSAPublicKey, name: str) -> dict[str, Any]:
    if not isinstance(value, dict) or not isinstance(value.get("payload"), dict):
        raise EvidenceError(f"{name} must contain an object payload")
    signature = value.get("signature")
    if not isinstance(signature, dict):
        raise EvidenceError(f"{name} is missing a signature")
    if signature.get("key_id") != key.key_id or signature.get("algorithm") != key.algorithm:
        raise EvidenceError(f"{name} signature key or algorithm does not match trusted pins")
    signature_value = signature.get("value")
    if not isinstance(signature_value, str) or not verify_rsa_pkcs1_sha256(
        canonical_bytes(value["payload"]), signature_value, key
    ):
        raise EvidenceError(f"{name} signature verification failed")
    return value["payload"]


def _validate_manifest(payload: dict[str, Any], trust: dict[str, Any], report: VerificationReport) -> str:
    if payload.get("schema") != "securevote.manifest.v1":
        raise EvidenceError("manifest schema is unsupported")
    election_id = payload.get("election_id")
    candidates = payload.get("candidates")
    if not isinstance(election_id, str) or not election_id:
        raise EvidenceError("manifest election_id is invalid")
    if election_id != trust["election_id"]:
        raise EvidenceError("manifest election_id does not match out-of-band trust pins")
    if not isinstance(candidates, list) or not candidates:
        raise EvidenceError("manifest candidates must be a non-empty list")
    candidate_ids: list[str] = []
    for candidate in candidates:
        if not isinstance(candidate, dict) or not isinstance(candidate.get("id"), str):
            raise EvidenceError("manifest candidate is malformed")
        candidate_ids.append(candidate["id"])
    if len(candidate_ids) != len(set(candidate_ids)):
        raise EvidenceError("manifest contains duplicate candidate ids")
    digest = canonical_digest(payload)
    if digest != trust["manifest_digest"]:
        raise EvidenceError("manifest digest does not match out-of-band trust pins")
    report.manifest_digest = digest
    return digest


def _validate_ballots(
    data: bytes,
    *,
    election_id: str,
    manifest_digest: str,
    report: VerificationReport,
) -> tuple[list[dict[str, Any]], list[bytes]]:
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise ArchiveFormatError("ballots.jsonl is not valid UTF-8") from exc
    lines = text.splitlines()
    records: list[dict[str, Any]] = []
    leaf_hashes: list[bytes] = []
    seen_ballot_ids: set[str] = set()
    seen_nullifiers: set[str] = set()
    for expected_index, line in enumerate(lines):
        if not line.strip():
            raise ArchiveFormatError("ballots.jsonl contains a blank line")
        try:
            value = parse_json_bytes(line.encode("utf-8"), source=f"ballots.jsonl line {expected_index}")
        except CanonicalJSONError as exc:
            raise ArchiveFormatError(str(exc)) from exc
        if not isinstance(value, dict):
            raise EvidenceError(f"ballot line {expected_index} is not an object")
        forbidden = FORBIDDEN_BALLOT_KEYS.intersection(value.keys())
        if forbidden:
            raise EvidenceError(f"ballot line {expected_index} contains identity/choice field(s): {sorted(forbidden)}")
        required = {
            "schema",
            "election_id",
            "manifest_digest",
            "leaf_index",
            "ballot_id",
            "credential_nullifier",
            "credential_proof_digest",
            "encrypted_ballot_digest",
            "validity_proof_digest",
            "engine_record_version",
        }
        missing = required - value.keys()
        if missing:
            raise EvidenceError(f"ballot line {expected_index} missing fields: {', '.join(sorted(missing))}")
        if value["schema"] != "securevote.ballot-evidence.v1":
            raise EvidenceError(f"ballot line {expected_index} has unsupported schema")
        if value["election_id"] != election_id or value["manifest_digest"] != manifest_digest:
            raise EvidenceError(f"ballot line {expected_index} is bound to the wrong election or manifest")
        if value["leaf_index"] != expected_index:
            raise EvidenceError(f"ballot leaf index gap or reorder at line {expected_index}")
        if not isinstance(value["ballot_id"], str) or not value["ballot_id"]:
            raise EvidenceError(f"ballot line {expected_index} has invalid ballot_id")
        if value["ballot_id"] in seen_ballot_ids:
            raise EvidenceError(f"duplicate ballot_id: {value['ballot_id']}")
        seen_ballot_ids.add(value["ballot_id"])
        if not _is_hex_digest(value["credential_nullifier"]):
            raise EvidenceError(f"ballot line {expected_index} has invalid credential_nullifier")
        if value["credential_nullifier"] in seen_nullifiers:
            raise EvidenceError(f"duplicate credential nullifier at leaf {expected_index}")
        seen_nullifiers.add(value["credential_nullifier"])
        for digest_name in (
            "credential_proof_digest",
            "encrypted_ballot_digest",
            "validity_proof_digest",
        ):
            if not _is_hex_digest(value[digest_name]):
                raise EvidenceError(f"ballot line {expected_index} has invalid {digest_name}")
        if not isinstance(value["engine_record_version"], str) or not value["engine_record_version"]:
            raise EvidenceError(f"ballot line {expected_index} has invalid engine_record_version")
        records.append(value)
        leaf_hashes.append(leaf_hash(value))
    report.tree_size = len(records)
    return records, leaf_hashes


def verify_archive(archive: str | os.PathLike[str], trust_path: str | os.PathLike[str]) -> VerificationReport:
    report = VerificationReport(archive_source=str(archive))
    try:
        files = read_archive(archive)
        report.set("ARCHIVE_INTEGRITY", STATUS_PASS, "required files loaded with duplicate/path-traversal checks")
    except ArchiveFormatError as exc:
        report.set("ARCHIVE_INTEGRITY", STATUS_FAIL, str(exc))
        report.set("ENGINE_NATIVE_TALLY", STATUS_NOT_CHECKED, "archive could not be parsed")
        return report

    try:
        trust = _load_trust(trust_path)
        report.set("TRUST_PINS", STATUS_PASS, "out-of-band trust pins parsed and key formats validated")
    except OSError as exc:
        report.unverifiable = True
        report.set("TRUST_PINS", STATUS_NOT_CHECKED, f"trusted verification inputs unavailable: {exc}")
        report.set("ENGINE_NATIVE_TALLY", STATUS_NOT_CHECKED, "trusted verification inputs unavailable")
        return report
    except (EvidenceError, CryptoFormatError) as exc:
        report.set("TRUST_PINS", STATUS_FAIL, str(exc))
        report.set("ENGINE_NATIVE_TALLY", STATUS_NOT_CHECKED, "trusted verification inputs unavailable")
        return report

    try:
        manifest_wrapper = _load_json(files, "manifest.json")
        manifest_payload = _verify_signed_wrapper(manifest_wrapper, trust["manifest_key_parsed"], "manifest.json")
        manifest_digest = _validate_manifest(manifest_payload, trust, report)
        report.set("MANIFEST_SIGNATURE", STATUS_PASS, "manifest signature verified against the pinned manifest key")
        report.set("MANIFEST_BINDING", STATUS_PASS, "manifest election and digest match out-of-band pins")

        records, leaf_hashes = _validate_ballots(
            files["ballots.jsonl"],
            election_id=trust["election_id"],
            manifest_digest=manifest_digest,
            report=report,
        )
        report.set("BALLOT_SCHEMA", STATUS_PASS, f"validated {len(records)} encrypted-evidence records with no identity or choice fields")
        report.set("BALLOT_ORDER", STATUS_PASS, "leaf indices are contiguous and ordered")
        report.set("BALLOT_UNIQUENESS", STATUS_PASS, "ballot ids and credential nullifiers are unique")

        computed_root = merkle_root(leaf_hashes).hex()
        report.merkle_root = computed_root
        report.set("MERKLE_ROOT", STATUS_PASS, f"computed RFC 6962-style root {computed_root}")

        witness_wrapper = _load_json(files, "witness-final.json")
        witness_payload = _verify_signed_wrapper(witness_wrapper, trust["witness_key_parsed"], "witness-final.json")
        report.set("WITNESS_SIGNATURE", STATUS_PASS, "final checkpoint signature verified against the pinned witness key")
        if witness_payload.get("schema") != "securevote.checkpoint.v1":
            raise EvidenceError("witness final checkpoint schema is unsupported")
        if witness_payload.get("election_id") != trust["election_id"]:
            raise EvidenceError("witness final checkpoint election_id mismatch")
        if witness_payload.get("manifest_digest") != manifest_digest:
            raise EvidenceError("witness final checkpoint manifest mismatch")
        if witness_payload.get("final") is not True or witness_payload.get("checkpoint_kind") != "FINAL":
            raise EvidenceError("witness checkpoint is not an explicit FINAL")
        if witness_payload.get("tree_size") != len(records):
            raise EvidenceError("witness final tree_size does not match ordered ballot evidence")
        if witness_payload.get("merkle_root") != computed_root:
            raise EvidenceError("witness final Merkle root does not match ordered ballot evidence")
        if witness_payload.get("final_sequence") != trust["final_sequence"]:
            raise EvidenceError("witness final sequence is stale or differs from out-of-band pins")
        checkpoint_digest = canonical_digest(witness_payload)
        report.checkpoint_digest = checkpoint_digest
        if checkpoint_digest != trust["final_checkpoint_digest"]:
            raise EvidenceError("witness final checkpoint digest is stale or differs from out-of-band pins")
        if witness_payload.get("tree_size") != trust["final_tree_size"]:
            raise EvidenceError("witness final tree_size differs from out-of-band pins")
        report.set("WITNESS_FINALITY", STATUS_PASS, "unique final checkpoint matches independent size, sequence, and digest pins")
        report.set("CHECKPOINT_BINDING", STATUS_PASS, "final checkpoint binds election, manifest, root, size, and tally digest")

        tally_wrapper = _load_json(files, "tally.json")
        if not isinstance(tally_wrapper, dict) or not isinstance(tally_wrapper.get("payload"), dict):
            raise EvidenceError("tally.json must contain a payload object")
        tally_payload = tally_wrapper["payload"]
        if tally_payload.get("schema") != "securevote.announced-tally.v1":
            raise EvidenceError("announced tally schema is unsupported")
        if tally_payload.get("election_id") != trust["election_id"] or tally_payload.get("manifest_digest") != manifest_digest:
            raise EvidenceError("announced tally is bound to the wrong election or manifest")
        results = tally_payload.get("results")
        if not isinstance(results, list) or len(results) != len(manifest_payload["candidates"]):
            raise EvidenceError("announced tally result set does not match the manifest")
        candidate_ids = [candidate["id"] for candidate in manifest_payload["candidates"]]
        result_ids = [item.get("candidate_id") for item in results if isinstance(item, dict)]
        if result_ids != candidate_ids or any(
            not isinstance(item, dict) or not isinstance(item.get("votes"), int) or item["votes"] < 0
            for item in results
        ):
            raise EvidenceError("announced tally candidate order or counts are invalid")
        if tally_payload.get("accepted_ballots") != len(records) or sum(item["votes"] for item in results) != len(records):
            raise EvidenceError("announced tally shape does not match accepted evidence count")
        tally_digest = canonical_digest(tally_payload)
        if tally_digest != witness_payload.get("announced_tally_digest"):
            raise EvidenceError("announced tally digest differs from final witness checkpoint")
        report.set("ANNOUNCED_TALLY_DIGEST", STATUS_PASS, "announced tally bytes match the witness-bound tally digest")
        report.set("BALLOT_INCLUSION", STATUS_PASS, "all ordered evidence records are included in the pinned final tree")
        report.set("ENGINE_NATIVE_TALLY", STATUS_NOT_CHECKED, "native Helios/Belenios ballot and tally proofs were not executed by this wrapper")
    except (ArchiveFormatError, EvidenceError, CanonicalJSONError, CryptoFormatError) as exc:
        message = str(exc)
        if isinstance(exc, (ArchiveFormatError, CanonicalJSONError)):
            report.set("ARCHIVE_INTEGRITY", STATUS_FAIL, str(exc))
        elif "signature" in message.lower() and "manifest" in message.lower():
            report.set("MANIFEST_SIGNATURE", STATUS_FAIL, message)
        elif "signature" in message.lower() or "checkpoint" in message.lower() or "final" in message.lower():
            report.set("WITNESS_FINALITY", STATUS_FAIL, message)
        elif "nullifier" in message.lower() or "ballot_id" in message.lower():
            report.set("BALLOT_UNIQUENESS", STATUS_FAIL, message)
        elif "leaf index" in message.lower() or "ordered" in message.lower():
            report.set("BALLOT_ORDER", STATUS_FAIL, message)
        elif "tally" in message.lower():
            report.set("ANNOUNCED_TALLY_DIGEST", STATUS_FAIL, message)
        else:
            report.set("EVIDENCE_VERIFICATION", STATUS_FAIL, str(exc))
        if "ENGINE_NATIVE_TALLY" not in report.properties:
            report.set("ENGINE_NATIVE_TALLY", STATUS_NOT_CHECKED, "native election-engine proof verification is outside this wrapper")
    return report


def inclusion_status(
    archive: str | os.PathLike[str], trust_path: str | os.PathLike[str], ballot_id: str
) -> VerificationReport:
    """Verify the complete archive, then report whether one opaque ballot id is included."""

    report = verify_archive(archive, trust_path)
    if report.failed:
        report.set("BALLOT_INCLUSION_REQUEST", STATUS_FAIL, "cannot answer inclusion against invalid evidence")
        return report
    try:
        files = read_archive(archive)
        trust = _load_trust(trust_path)
        manifest_payload = _verify_signed_wrapper(
            _load_json(files, "manifest.json"), trust["manifest_key_parsed"], "manifest.json"
        )
        manifest_digest = canonical_digest(manifest_payload)
        records, _ = _validate_ballots(
            files["ballots.jsonl"],
            election_id=trust["election_id"],
            manifest_digest=manifest_digest,
            report=VerificationReport(),
        )
    except (ArchiveFormatError, EvidenceError, CanonicalJSONError, CryptoFormatError, OSError):
        report.set("BALLOT_INCLUSION_REQUEST", STATUS_FAIL, "could not inspect ballot evidence")
        return report
    found = any(record.get("ballot_id") == ballot_id for record in records)
    report.set(
        "BALLOT_INCLUSION_REQUEST",
        STATUS_PASS if found else STATUS_FAIL,
        "opaque ballot id is present in the pinned final evidence" if found else "opaque ballot id is absent",
    )
    return report
