"""Native Linux desktop client for HimVote.

The client provides election browsing, receipt tracking, offline election
archive inspection, Merkle proof recomputation, and candidate tally visualization.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tarfile
import tempfile
import tkinter as tk
import zipfile
from dataclasses import dataclass, field
from pathlib import Path
from tkinter import filedialog, messagebox, ttk
from typing import Any, Callable
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


NAVY = "#10233F"
NAVY_SOFT = "#294463"
TEAL = "#157E92"
GREEN = "#15805D"
AMBER = "#AA6C0B"
RED = "#C23C45"
SURFACE = "#F3F6FA"
WHITE = "#FFFFFF"
TEXT = "#17233B"
MUTED = "#60708A"
LINE = "#D9E2EC"
LIGHT_BG = "#E8F3F5"
PROGRESS_BG = "#E2E8F0"

MAX_ARCHIVE_SIZE_BYTES = 100 * 1024 * 1024
MAX_UNCOMPRESSED_SIZE_BYTES = 500 * 1024 * 1024
MAX_FILE_COUNT = 10000


class ApiError(RuntimeError):
    """Raised when the API cannot provide a usable response."""


class ArchiveError(RuntimeError):
    """Raised when an election evidence archive is invalid or unsafe."""


class MerkleProofError(RuntimeError):
    """Raised when Merkle tree proof generation or verification fails."""


@dataclass(frozen=True)
class Election:
    election_id: str
    title: str
    state: str
    closes_at: str
    candidate_count: int

    @classmethod
    def from_payload(cls, payload: dict[str, Any]) -> "Election":
        candidates = payload.get("candidates") or []
        return cls(
            election_id=str(payload.get("id") or payload.get("election_id") or ""),
            title=str(payload.get("title") or "Untitled election"),
            state=str(payload.get("state") or "DRAFT"),
            closes_at=str(payload.get("closes_at_utc") or "Not scheduled"),
            candidate_count=len(candidates),
        )


@dataclass(frozen=True)
class Receipt:
    status: str
    leaf_index: int | None = None
    witnessed_at: str | None = None


@dataclass(frozen=True)
class Candidate:
    candidate_id: str
    name: str


@dataclass(frozen=True)
class CandidateTally:
    candidate_id: str
    name: str
    vote_count: int
    percentage: float
    rank: int
    is_winner: bool


@dataclass(frozen=True)
class MerkleProofResult:
    leaf_index: int
    leaf_hash: str
    leaf_id: str
    nullifier: str
    path_length: int
    siblings: list[tuple[str, str]]
    verified: bool
    root_hex: str


@dataclass
class ArchiveInspectionResult:
    archive_path: str
    election_id: str
    title: str
    protocol_version: str
    voting_engine: str
    eligible_count: int | None
    total_leaves: int
    candidate_count: int
    manifest_digest: str
    manifest_digest_valid: bool
    leaf_sequence_valid: bool
    nullifiers_unique: bool
    merkle_root_hex: str
    witness_root_hex: str | None
    merkle_root_matches_witness: bool | None
    last_leaf_digest: str
    last_leaf_matches_witness: bool | None
    tally_recomputed_matches_announced: bool | None
    candidate_tallies: list[CandidateTally]
    recomputed_tallies: dict[str, int]
    announced_tallies: dict[str, int]
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    @property
    def is_valid(self) -> bool:
        integrity_ok = self.manifest_digest_valid and self.leaf_sequence_valid and self.nullifiers_unique
        if self.witness_root_hex and not self.merkle_root_matches_witness:
            return False
        if self.tally_recomputed_matches_announced is False:
            return False
        return integrity_ok and len(self.errors) == 0


def canonicalize_json(obj: Any) -> bytes:
    """RFC 8785 JSON Canonicalization Scheme JCS.

    Encodes JSON data into canonical UTF8 bytes.
    Object keys are sorted lexicographically by UTF16 code units.
    Floats are strictly rejected.
    """
    if obj is None:
        return b"null"
    if isinstance(obj, bool):
        return b"true" if obj else b"false"
    if isinstance(obj, int):
        return str(obj).encode("utf_8")
    if isinstance(obj, float):
        raise ArchiveError("Floats are not permitted in canonical records")
    if isinstance(obj, str):
        escaped = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
        return escaped.encode("utf_8")
    if isinstance(obj, list):
        items = [canonicalize_json(item) for item in obj]
        return b"[" + b",".join(items) + b"]"
    if isinstance(obj, dict):
        sorted_keys = sorted(obj.keys(), key=lambda k: k.encode("utf_16_be"))
        pairs: list[bytes] = []
        for key in sorted_keys:
            key_bytes = json.dumps(key, ensure_ascii=False, separators=(",", ":")).encode("utf_8")
            val_bytes = canonicalize_json(obj[key])
            pairs.append(key_bytes + b":" + val_bytes)
        return b"{" + b",".join(pairs) + b"}"
    raise ArchiveError(f"Unsupported data type for canonical JSON: {type(obj)}")


def safe_json_loads(data: str | bytes) -> Any:
    """Safely decode JSON without duplicate keys or float values."""
    if isinstance(data, bytes):
        try:
            text = data.decode("utf_8")
        except UnicodeDecodeError as err:
            raise ArchiveError("Invalid UTF 8 encoding in JSON data") from err
    else:
        text = data

    def duplicate_key_hook(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
        seen: set[str] = set()
        result: dict[str, Any] = {}
        for key, value in pairs:
            if key in seen:
                raise ArchiveError(f"Duplicate JSON key detected: {key}")
            seen.add(key)
            result[key] = value
        return result

    def reject_float_hook(val: str) -> None:
        raise ArchiveError(f"Floats not permitted in canonical records: {val}")

    try:
        return json.loads(
            text,
            object_pairs_hook=duplicate_key_hook,
            parse_float=reject_float_hook,
        )
    except json.JSONDecodeError as err:
        raise ArchiveError(f"Malformed JSON data: {err}") from err


def sha256_digest(data: bytes) -> bytes:
    """Return raw 32 byte SHA256 digest."""
    return hashlib.sha256(data).digest()


def sha256_hex(data: bytes) -> str:
    """Return lowercase hex string SHA256 digest."""
    return hashlib.sha256(data).hexdigest()


def format_digest(data: bytes) -> str:
    """Format digest with sha256 prefix."""
    return f"sha256:{hashlib.sha256(data).hexdigest()}"


def normalize_digest(digest_str: str | None) -> str:
    """Normalize digest string by removing sha256 prefix and lowercasing."""
    if not digest_str:
        return ""
    stripped = digest_str.strip().lower()
    if stripped.startswith("sha256:"):
        return stripped[7:]
    return stripped


def compute_rfc9162_merkle_root(leaf_bytes_list: list[bytes]) -> bytes:
    """Compute RFC 9162 Merkle tree hash across canonical leaf bytes.

    Prefix 0x00 is applied to each leaf record.
    Prefix 0x01 is applied to internal node concatenations.
    Split point k is the largest power of two strictly less than n.
    """
    n = len(leaf_bytes_list)
    if n == 0:
        return hashlib.sha256(b"").digest()
    if n == 1:
        return hashlib.sha256(b"\x00" + leaf_bytes_list[0]).digest()
    k = 1 << ((n - 1).bit_length() - 1)
    left_root = compute_rfc9162_merkle_root(leaf_bytes_list[:k])
    right_root = compute_rfc9162_merkle_root(leaf_bytes_list[k:])
    return hashlib.sha256(b"\x01" + left_root + right_root).digest()


def generate_rfc9162_inclusion_proof(leaf_bytes_list: list[bytes], leaf_index: int) -> list[tuple[str, bytes]]:
    """Generate RFC 9162 audit path for leaf at leaf_index.

    Each item in the returned list is a tuple of (side, sibling_hash_bytes),
    where side indicates whether the sibling is on the 'left' or 'right'.
    """
    n = len(leaf_bytes_list)
    if not (0 <= leaf_index < n):
        raise MerkleProofError(f"Leaf index {leaf_index} out of bounds for tree size {n}")
    if n <= 1:
        return []
    k = 1 << ((n - 1).bit_length() - 1)
    if leaf_index < k:
        right_root = compute_rfc9162_merkle_root(leaf_bytes_list[k:])
        subpath = generate_rfc9162_inclusion_proof(leaf_bytes_list[:k], leaf_index)
        return subpath + [("right", right_root)]
    left_root = compute_rfc9162_merkle_root(leaf_bytes_list[:k])
    subpath = generate_rfc9162_inclusion_proof(leaf_bytes_list[k:], leaf_index - k)
    return subpath + [("left", left_root)]


def verify_rfc9162_inclusion_proof(
    leaf_bytes: bytes,
    proof: list[tuple[str, bytes]],
    expected_root: bytes,
) -> bool:
    """Verify an RFC 9162 inclusion proof starting from raw leaf canonical bytes."""
    curr = hashlib.sha256(b"\x00" + leaf_bytes).digest()
    for side, sibling in proof:
        if side == "right":
            curr = hashlib.sha256(b"\x01" + curr + sibling).digest()
        elif side == "left":
            curr = hashlib.sha256(b"\x01" + sibling + curr).digest()
        else:
            return False
    return curr == expected_root


def safe_inspect_directory(dir_path: str) -> None:
    """Inspect directory to forbid symlinks and enforce size and count boundaries."""
    file_count = 0
    total_size = 0
    for root, dirs, files in os.walk(dir_path, followlinks=False):
        for dir_name in dirs:
            full_d = os.path.join(root, dir_name)
            if os.path.islink(full_d):
                raise ArchiveError(f"Symlinks are prohibited: {full_d}")
        for file_name in files:
            full_f = os.path.join(root, file_name)
            if os.path.islink(full_f):
                raise ArchiveError(f"Symlinks are prohibited: {full_f}")
            file_count += 1
            if file_count > MAX_FILE_COUNT:
                raise ArchiveError("File count exceeds maximum permitted limit")
            size = os.path.getsize(full_f)
            total_size += size
            if total_size > MAX_UNCOMPRESSED_SIZE_BYTES:
                raise ArchiveError("Total content size exceeds maximum permitted limit")


def safe_extract_archive(archive_path: str, extract_dir: str) -> None:
    """Safely extract zip or tar archive preventing path traversal and symlinks."""
    if not os.path.exists(archive_path):
        raise ArchiveError(f"Archive file not found: {archive_path}")

    archive_size = os.path.getsize(archive_path)
    if archive_size > MAX_ARCHIVE_SIZE_BYTES:
        raise ArchiveError("Archive file size exceeds maximum limit")

    extract_real = os.path.realpath(extract_dir)
    file_count = 0
    total_uncompressed = 0

    if zipfile.is_zipfile(archive_path):
        with zipfile.ZipFile(archive_path, "r") as zf:
            for info in zf.infolist():
                name = info.filename
                if name.startswith("/") or name.startswith("\\") or ".." in name.split("/") or ".." in name.split("\\"):
                    raise ArchiveError(f"Path traversal detected in archive entry: {name}")
                target = os.path.realpath(os.path.join(extract_dir, name))
                if not (target == extract_real or target.startswith(extract_real + os.sep)):
                    raise ArchiveError(f"Path traversal target outside boundary: {name}")
                is_symlink = ((info.external_attr >> 16) & 0o120000) == 0o120000
                if is_symlink:
                    raise ArchiveError(f"Symlinks are prohibited in archive: {name}")
                file_count += 1
                if file_count > MAX_FILE_COUNT:
                    raise ArchiveError("Archive contains too many files")
                total_uncompressed += info.file_size
                if total_uncompressed > MAX_UNCOMPRESSED_SIZE_BYTES:
                    raise ArchiveError("Archive uncompressed size exceeds limit")
            zf.extractall(extract_dir)
        return

    if tarfile.is_tarfile(archive_path):
        with tarfile.open(archive_path, "r:*") as tf:
            for member in tf.getmembers():
                name = member.name
                if name.startswith("/") or name.startswith("\\") or ".." in name.split("/") or ".." in name.split("\\"):
                    raise ArchiveError(f"Path traversal detected in tar entry: {name}")
                target = os.path.realpath(os.path.join(extract_dir, name))
                if not (target == extract_real or target.startswith(extract_real + os.sep)):
                    raise ArchiveError(f"Path traversal target outside boundary: {name}")
                if member.issym() or member.islnk():
                    raise ArchiveError(f"Symlinks are prohibited in tar: {name}")
                file_count += 1
                if file_count > MAX_FILE_COUNT:
                    raise ArchiveError("Tar archive contains too many files")
                total_uncompressed += member.size
                if total_uncompressed > MAX_UNCOMPRESSED_SIZE_BYTES:
                    raise ArchiveError("Tar uncompressed size exceeds limit")
            tf.extractall(extract_dir)
        return

    raise ArchiveError(f"Unsupported archive format: {archive_path}")


class ElectionArchive:
    """Represents an offline election archive for verification and visualization."""

    def __init__(
        self,
        manifest: dict[str, Any],
        leaves: list[dict[str, Any]],
        results: dict[str, Any],
        source_path: Path,
        witness_final: dict[str, Any] | None = None,
        trust_pins: dict[str, Any] | None = None,
        temp_dir: tempfile.TemporaryDirectory | None = None,
    ) -> None:
        self.manifest = manifest
        self.leaves = leaves
        self.results = results
        self.source_path = source_path
        self.witness_final = witness_final
        self.trust_pins = trust_pins
        self._temp_dir = temp_dir
        self._canonical_bytes_cache: list[bytes] | None = None

    def close(self) -> None:
        """Clean up extracted temporary files if present."""
        if self._temp_dir is not None:
            try:
                self._temp_dir.cleanup()
            except Exception:
                pass
            self._temp_dir = None

    def __enter__(self) -> "ElectionArchive":
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        self.close()

    @classmethod
    def load(cls, path_input: str | Path) -> "ElectionArchive":
        """Load an election archive from a directory or compressed archive file."""
        target_path = Path(path_input).resolve()
        if not target_path.exists():
            raise ArchiveError(f"Archive target does not exist: {target_path}")

        temp_holder: tempfile.TemporaryDirectory | None = None
        working_dir: Path

        if target_path.is_file():
            temp_holder = tempfile.TemporaryDirectory(prefix="himvote_archive_")
            safe_extract_archive(str(target_path), temp_holder.name)
            working_dir = Path(temp_holder.name)
        else:
            safe_inspect_directory(str(target_path))
            working_dir = target_path

        # Locate manifest
        manifest_path = working_dir / "manifest.json"
        if not manifest_path.exists():
            for nested in working_dir.glob("*/manifest.json"):
                manifest_path = nested
                working_dir = nested.parent
                break

        if not manifest_path.exists():
            if temp_holder:
                temp_holder.cleanup()
            raise ArchiveError(f"manifest.json was not found in archive: {target_path}")

        with open(manifest_path, "rb") as mf:
            manifest = safe_json_loads(mf.read())
        if not isinstance(manifest, dict):
            if temp_holder:
                temp_holder.cleanup()
            raise ArchiveError("manifest.json must be a JSON object")

        # Locate leaves or ballots
        leaves: list[dict[str, Any]] = []
        leaves_file = working_dir / "leaves.json"
        ballots_file = working_dir / "ballots.json"
        leaves_dir = working_dir / "leaves"

        if leaves_file.exists():
            with open(leaves_file, "rb") as lf:
                loaded = safe_json_loads(lf.read())
                if not isinstance(loaded, list):
                    raise ArchiveError("leaves.json must contain a JSON array")
                leaves = loaded
        elif ballots_file.exists():
            with open(ballots_file, "rb") as bf:
                loaded = safe_json_loads(bf.read())
                if not isinstance(loaded, list):
                    raise ArchiveError("ballots.json must contain a JSON array")
                leaves = loaded
        elif leaves_dir.is_dir():
            for item in sorted(leaves_dir.glob("*.json")):
                with open(item, "rb") as item_f:
                    data = safe_json_loads(item_f.read())
                    if isinstance(data, dict):
                        leaves.append(data)
                    elif isinstance(data, list):
                        leaves.extend(data)

        # Locate results or tally
        results: dict[str, Any] = {}
        results_file = working_dir / "results.json"
        tally_file = working_dir / "tally.json"

        if results_file.exists():
            with open(results_file, "rb") as rf:
                results = safe_json_loads(rf.read())
        elif tally_file.exists():
            with open(tally_file, "rb") as tf:
                results = safe_json_loads(tf.read())

        # Locate optional witness checkpoint
        witness_final: dict[str, Any] | None = None
        witness_candidates = [
            working_dir / "witness_final.json",
            working_dir / "external" / "witness_final.json",
            working_dir.parent / "external" / "witness_final.json",
            working_dir / "witness.json",
        ]
        for wc in witness_candidates:
            if wc.exists():
                try:
                    with open(wc, "rb") as wf:
                        witness_final = safe_json_loads(wf.read())
                    break
                except Exception:
                    pass

        # Locate optional trust pins
        trust_pins: dict[str, Any] | None = None
        trust_candidates = [
            working_dir / "trust_pins.json",
            working_dir / "external" / "trust_pins.json",
            working_dir.parent / "external" / "trust_pins.json",
        ]
        for tc in trust_candidates:
            if tc.exists():
                try:
                    with open(tc, "rb") as tf_pin:
                        trust_pins = safe_json_loads(tf_pin.read())
                    break
                except Exception:
                    pass

        # Sort leaves by leaf_index if present
        def get_index(record: dict[str, Any]) -> int:
            val = record.get("leaf_index")
            return val if isinstance(val, int) else 0

        leaves.sort(key=get_index)

        return cls(
            manifest=manifest,
            leaves=leaves,
            results=results,
            source_path=target_path,
            witness_final=witness_final,
            trust_pins=trust_pins,
            temp_dir=temp_holder,
        )

    def get_canonical_leaf_bytes(self) -> list[bytes]:
        """Compute and cache canonical UTF8 bytes for all leaves."""
        if self._canonical_bytes_cache is None:
            self._canonical_bytes_cache = [canonicalize_json(leaf) for leaf in self.leaves]
        return self._canonical_bytes_cache

    def recompute_merkle_root(self) -> tuple[str, bool | None]:
        """Recompute RFC 9162 Merkle tree root and compare with witness checkpoint."""
        leaf_bytes = self.get_canonical_leaf_bytes()
        root_bytes = compute_rfc9162_merkle_root(leaf_bytes)
        recomputed_root = f"sha256:{root_bytes.hex()}"

        matches_witness: bool | None = None
        if self.witness_final and "merkle_root" in self.witness_final:
            witness_root = str(self.witness_final["merkle_root"])
            matches_witness = normalize_digest(recomputed_root) == normalize_digest(witness_root)

        return recomputed_root, matches_witness

    def get_last_leaf_digest(self) -> str:
        """Compute the leaf digest for the last leaf in the sequence."""
        leaf_bytes = self.get_canonical_leaf_bytes()
        if not leaf_bytes:
            return ""
        return f"sha256:{hashlib.sha256(b'\x00' + leaf_bytes[-1]).hexdigest()}"

    def get_leaf_proof(self, leaf_index: int) -> MerkleProofResult:
        """Generate and verify inclusion proof for the leaf at leaf_index."""
        leaf_bytes_list = self.get_canonical_leaf_bytes()
        n = len(leaf_bytes_list)
        if not (0 <= leaf_index < n):
            raise MerkleProofError(f"Leaf index {leaf_index} out of range 0 to {n - 1}")

        target_leaf = self.leaves[leaf_index]
        target_bytes = leaf_bytes_list[leaf_index]
        leaf_hash = f"sha256:{hashlib.sha256(b'\x00' + target_bytes).hexdigest()}"
        leaf_id = str(target_leaf.get("ballot_id") or f"leaf_{leaf_index}")
        nullifier = str(target_leaf.get("credential_nullifier") or "")

        raw_proof = generate_rfc9162_inclusion_proof(leaf_bytes_list, leaf_index)
        expected_root_bytes = compute_rfc9162_merkle_root(leaf_bytes_list)
        verified = verify_rfc9162_inclusion_proof(target_bytes, raw_proof, expected_root_bytes)

        formatted_siblings = [(side, f"sha256:{sibling_bytes.hex()}") for side, sibling_bytes in raw_proof]

        return MerkleProofResult(
            leaf_index=leaf_index,
            leaf_hash=leaf_hash,
            leaf_id=leaf_id,
            nullifier=nullifier,
            path_length=len(raw_proof),
            siblings=formatted_siblings,
            verified=verified,
            root_hex=f"sha256:{expected_root_bytes.hex()}",
        )

    def recompute_tally(self) -> tuple[dict[str, int], bool | None, list[CandidateTally]]:
        """Extract candidate selections from leaves, recompute totals, and compare with results."""
        recomputed: dict[str, int] = {}
        for leaf in self.leaves:
            ballot_obj: dict[str, Any] = {}
            engine_b64 = leaf.get("engine_ballot_b64url")
            if engine_b64:
                try:
                    padded = str(engine_b64) + "=" * ((4 - len(str(engine_b64)) % 4) % 4)
                    raw_bytes = base64.urlsafe_b64decode(padded)
                    parsed = safe_json_loads(raw_bytes)
                    if isinstance(parsed, dict):
                        ballot_obj = parsed
                except Exception:
                    pass
            elif "selections" in leaf:
                ballot_obj = leaf

            selections = ballot_obj.get("selections")
            if isinstance(selections, dict):
                for cand_id, count in selections.items():
                    if isinstance(count, int):
                        recomputed[cand_id] = recomputed.get(cand_id, 0) + count
            elif isinstance(selections, list):
                for cand_id in selections:
                    if isinstance(cand_id, str):
                        recomputed[cand_id] = recomputed.get(cand_id, 0) + 1

        announced_raw = (
            self.results.get("contest_tallies")
            or self.results.get("results")
            or self.results.get("tallies")
            or {}
        )
        announced: dict[str, int] = {}
        if isinstance(announced_raw, dict):
            for k, v in announced_raw.items():
                if isinstance(v, int):
                    announced[k] = v
                elif isinstance(v, dict):
                    for sub_k, sub_v in v.items():
                        if isinstance(sub_v, int):
                            announced[sub_k] = sub_v

        matches_announced: bool | None = None
        if announced:
            matches_announced = (recomputed == announced) if recomputed else None

        # Build candidate lookup
        candidates_meta = self.manifest.get("candidates") or []
        candidate_names: dict[str, str] = {}
        if isinstance(candidates_meta, list):
            for item in candidates_meta:
                if isinstance(item, dict) and "id" in item:
                    candidate_names[str(item["id"])] = str(item.get("name") or item["id"])

        all_candidate_ids = list(candidate_names.keys())
        for cid in list(recomputed.keys()) + list(announced.keys()):
            if cid not in all_candidate_ids:
                all_candidate_ids.append(cid)

        # Decide which vote counts to visualize (prefer recomputed if present, else announced)
        active_counts = recomputed if recomputed else announced
        total_votes = sum(active_counts.values())

        scored_candidates: list[tuple[str, int]] = []
        for cid in all_candidate_ids:
            votes = active_counts.get(cid, 0)
            scored_candidates.append((cid, votes))

        scored_candidates.sort(key=lambda item: item[1], reverse=True)
        max_votes = scored_candidates[0][1] if scored_candidates else 0

        tallies_list: list[CandidateTally] = []
        for rank, (cid, votes) in enumerate(scored_candidates, start=1):
            pct = (votes / total_votes * 100.0) if total_votes > 0 else 0.0
            display_name = candidate_names.get(cid, cid)
            is_winner = votes > 0 and votes == max_votes
            tallies_list.append(
                CandidateTally(
                    candidate_id=cid,
                    name=display_name,
                    vote_count=votes,
                    percentage=round(pct, 2),
                    rank=rank,
                    is_winner=is_winner,
                )
            )

        return recomputed, matches_announced, tallies_list

    def inspect(self) -> ArchiveInspectionResult:
        """Execute complete offline election archive inspection and verification."""
        warnings: list[str] = []
        errors: list[str] = []

        election_id = str(self.manifest.get("election_id") or "")
        title = str(self.manifest.get("title") or "Untitled election")
        protocol_version = str(self.manifest.get("protocol_version") or "unknown")
        voting_engine = str(self.manifest.get("voting_engine") or "unknown")
        eligible_count = self.manifest.get("public_eligible_count") or self.manifest.get("eligible_count")
        if eligible_count is not None and not isinstance(eligible_count, int):
            eligible_count = None

        manifest_digest = str(self.manifest.get("manifest_digest") or "")
        manifest_copy = dict(self.manifest)
        manifest_copy.pop("manifest_digest", None)
        manifest_copy.pop("signature", None)

        recomputed_manifest_digest = format_digest(canonicalize_json(manifest_copy))
        manifest_digest_valid = normalize_digest(manifest_digest) == normalize_digest(recomputed_manifest_digest)
        if not manifest_digest_valid:
            manifest_copy_full = dict(self.manifest)
            manifest_copy_full.pop("signature", None)
            alt_digest = format_digest(canonicalize_json(manifest_copy_full))
            if normalize_digest(manifest_digest) == normalize_digest(alt_digest):
                manifest_digest_valid = True
            else:
                errors.append("Manifest canonical digest does not match declared manifest_digest")

        # Verify leaf sequence continuity (0 to N - 1)
        total_leaves = len(self.leaves)
        leaf_sequence_valid = True
        seen_indices: set[int] = set()

        for leaf in self.leaves:
            idx = leaf.get("leaf_index")
            if idx is None or not isinstance(idx, int):
                leaf_sequence_valid = False
                errors.append("Leaf record is missing an integer leaf_index")
                break
            if idx in seen_indices:
                leaf_sequence_valid = False
                errors.append(f"Duplicate leaf index detected: {idx}")
                break
            seen_indices.add(idx)

        if leaf_sequence_valid:
            for expected_idx in range(total_leaves):
                if expected_idx not in seen_indices:
                    leaf_sequence_valid = False
                    errors.append(f"Missing leaf index in continuous sequence: {expected_idx}")
                    break

        # Check credential nullifier uniqueness
        seen_nullifiers: set[str] = set()
        nullifiers_unique = True
        for leaf in self.leaves:
            nullifier = leaf.get("credential_nullifier")
            if not nullifier:
                nullifiers_unique = False
                errors.append("Leaf record is missing credential_nullifier")
                continue
            normalized_n = normalize_digest(str(nullifier))
            if normalized_n in seen_nullifiers:
                nullifiers_unique = False
                errors.append(f"Duplicate credential nullifier detected: {nullifier}")
            seen_nullifiers.add(normalized_n)

        # Recompute Merkle root and last leaf digest
        recomputed_root, merkle_matches_witness = self.recompute_merkle_root()
        last_leaf_digest = self.get_last_leaf_digest()
        witness_root_hex: str | None = None
        last_leaf_matches_witness: bool | None = None

        if self.witness_final:
            witness_root_hex = str(self.witness_final.get("merkle_root") or "")
            expected_last = self.witness_final.get("last_leaf_digest")
            if expected_last:
                last_leaf_matches_witness = normalize_digest(last_leaf_digest) == normalize_digest(str(expected_last))

        recomputed_tallies, tally_matches_announced, candidate_tallies = self.recompute_tally()

        candidates_meta = self.manifest.get("candidates") or []
        candidate_count = len(candidates_meta) if isinstance(candidates_meta, list) else len(candidate_tallies)

        return ArchiveInspectionResult(
            archive_path=str(self.source_path),
            election_id=election_id,
            title=title,
            protocol_version=protocol_version,
            voting_engine=voting_engine,
            eligible_count=eligible_count,
            total_leaves=total_leaves,
            candidate_count=candidate_count,
            manifest_digest=manifest_digest,
            manifest_digest_valid=manifest_digest_valid,
            leaf_sequence_valid=leaf_sequence_valid,
            nullifiers_unique=nullifiers_unique,
            merkle_root_hex=recomputed_root,
            witness_root_hex=witness_root_hex,
            merkle_root_matches_witness=merkle_matches_witness,
            last_leaf_digest=last_leaf_digest,
            last_leaf_matches_witness=last_leaf_matches_witness,
            tally_recomputed_matches_announced=tally_matches_announced,
            candidate_tallies=candidate_tallies,
            recomputed_tallies=recomputed_tallies,
            announced_tallies=(
                self.results.get("contest_tallies")
                or self.results.get("results")
                or self.results.get("tallies")
                or {}
            ),
            warnings=warnings,
            errors=errors,
        )


class LinuxApiClient:
    """Small standard library API client with no identity data in logs."""

    def __init__(self, base_url: str, timeout: float = 8.0) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    def _get_json(self, path: str) -> Any:
        request = Request(f"{self.base_url}{path}", headers={"Accept": "application/json"})
        try:
            with urlopen(request, timeout=self.timeout) as response:
                return json.load(response)
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
            raise ApiError(f"API request failed for {path}: {exc}") from exc

    def get_elections(self) -> list[Election]:
        payload = self._get_json("/v1/elections")
        records = payload.get("items", payload) if isinstance(payload, dict) else payload
        if not isinstance(records, list):
            raise ApiError("Election response must be a list")
        return [Election.from_payload(record) for record in records]

    def get_receipt(self, election_id: str, handle: str) -> Receipt:
        payload = self._get_json(f"/v1/cast/{election_id}/receipts/{handle}")
        return Receipt(
            status=str(payload.get("status") or "UNVERIFIABLE"),
            leaf_index=payload.get("leaf_index"),
            witnessed_at=payload.get("witnessed_at"),
        )


def demo_elections() -> list[Election]:
    """Return clearly labelled local demo records for disconnected development."""
    return [
        Election("demo_union_2026", "Student Union Council 2026", "OPEN", "14 Nov 2026", 6),
        Election("demo_design_2026", "School of Design Representatives", "UPCOMING", "20 Nov 2026", 3),
    ]


def status_colour(status: str) -> str:
    """Map a server state to a semantic colour without claiming verification."""
    if status in {"WITNESSED", "ANCHOR_FINALIZED", "AUDIT_PASSED", "AUDITOR_ATTESTED", "PASS", "MATCH"}:
        return GREEN
    if status in {"PENDING_WITNESS", "ANCHOR_PENDING", "UPCOMING", "STANDALONE"}:
        return AMBER
    if status in {"FAILED", "DISPUTED", "FAIL", "MISMATCH"}:
        return RED
    return TEAL


class HimVoteLinuxApp(tk.Tk):
    """Accessible desktop shell for Linux election and audit workflows."""

    def __init__(
        self,
        api_client: LinuxApiClient | None,
        verifier_path: Path,
        initial_archive: Path | None = None,
    ) -> None:
        super().__init__()
        self.api_client = api_client
        self.verifier_path = verifier_path
        self.elections: list[Election] = []
        self.current_archive: ElectionArchive | None = None
        self.current_inspection: ArchiveInspectionResult | None = None

        self.title("HimVote Linux")
        self.geometry("1160x760")
        self.minsize(920, 640)
        self.configure(bg=SURFACE)

        self._configure_styles()
        self._build_shell()

        if initial_archive and initial_archive.exists():
            self._load_archive_path(initial_archive)
        else:
            self._show_elections()

    def destroy(self) -> None:
        if self.current_archive:
            self.current_archive.close()
            self.current_archive = None
        super().destroy()

    def _configure_styles(self) -> None:
        style = ttk.Style(self)
        try:
            style.theme_use("clam")
        except Exception:
            pass

        style.configure("App.TFrame", background=SURFACE)
        style.configure("Nav.TFrame", background=NAVY)
        style.configure("Card.TFrame", background=WHITE, relief="solid", borderwidth=1)
        style.configure("Title.TLabel", background=SURFACE, foreground=NAVY, font=("DejaVu Sans", 22, "bold"))
        style.configure("SubTitle.TLabel", background=WHITE, foreground=NAVY, font=("DejaVu Sans", 13, "bold"))
        style.configure("Body.TLabel", background=SURFACE, foreground=TEXT, font=("DejaVu Sans", 10))
        style.configure("Muted.TLabel", background=SURFACE, foreground=MUTED, font=("DejaVu Sans", 10))
        style.configure("CardBody.TLabel", background=WHITE, foreground=TEXT, font=("DejaVu Sans", 10))
        style.configure("CardMuted.TLabel", background=WHITE, foreground=MUTED, font=("DejaVu Sans", 9))
        style.configure("NavTitle.TLabel", background=NAVY, foreground=WHITE, font=("DejaVu Sans", 18, "bold"))
        style.configure("NavBody.TLabel", background=NAVY, foreground="#B7C8DC", font=("DejaVu Sans", 10))
        style.configure("Action.TButton", background=TEAL, foreground=WHITE, padding=(12, 7), font=("DejaVu Sans", 10, "bold"))
        style.map("Action.TButton", background=[("active", NAVY_SOFT)])
        style.configure("Secondary.TButton", background="#E2E8F0", foreground=TEXT, padding=(10, 6), font=("DejaVu Sans", 9, "bold"))
        style.map("Secondary.TButton", background=[("active", "#CBD5E1")])
        style.configure("Nav.TButton", background=NAVY, foreground=WHITE, padding=(12, 10), anchor="w", font=("DejaVu Sans", 10, "bold"))
        style.map("Nav.TButton", background=[("active", NAVY_SOFT)])
        style.configure("Status.TLabel", background=WHITE, foreground=TEAL, font=("DejaVu Sans", 9, "bold"))
        style.configure("Mode.TLabel", background=LIGHT_BG, foreground=TEAL, padding=(10, 5), font=("DejaVu Sans", 9, "bold"))
        style.configure("DemoMode.TLabel", background="#FFF2D8", foreground=AMBER, padding=(10, 5), font=("DejaVu Sans", 9, "bold"))
        style.configure("BadgeGreen.TLabel", background="#DCFCE7", foreground=GREEN, padding=(8, 4), font=("DejaVu Sans", 9, "bold"))
        style.configure("BadgeRed.TLabel", background="#FEE2E2", foreground=RED, padding=(8, 4), font=("DejaVu Sans", 9, "bold"))
        style.configure("BadgeAmber.TLabel", background="#FEF3C7", foreground=AMBER, padding=(8, 4), font=("DejaVu Sans", 9, "bold"))

    def _build_shell(self) -> None:
        root = ttk.Frame(self, style="App.TFrame")
        root.pack(fill="both", expand=True)

        navigation = ttk.Frame(root, style="Nav.TFrame", width=230)
        navigation.pack(side="left", fill="y")
        navigation.pack_propagate(False)

        ttk.Label(navigation, text="HimVote", style="NavTitle.TLabel").pack(anchor="w", padx=22, pady=(28, 4))
        ttk.Label(navigation, text="Linux desktop client", style="NavBody.TLabel").pack(anchor="w", padx=22, pady=(0, 24))

        self._nav_button(navigation, "Elections", self._show_elections)
        self._nav_button(navigation, "Receipt status", self._show_receipt)
        self._nav_button(navigation, "Offline audit", self._show_audit)

        ttk.Frame(navigation, style="Nav.TFrame").pack(fill="both", expand=True)
        self.mode_label = ttk.Label(navigation, text="", style="NavBody.TLabel", wraplength=185)
        self.mode_label.pack(anchor="w", padx=22, pady=(0, 24))

        self.content = ttk.Frame(root, style="App.TFrame")
        self.content.pack(side="left", fill="both", expand=True)

    def _nav_button(self, parent: ttk.Frame, label: str, command: Callable[[], None]) -> None:
        ttk.Button(parent, text=label, command=command, style="Nav.TButton").pack(fill="x", padx=12, pady=2)

    def _clear_content(self) -> None:
        for child in self.content.winfo_children():
            child.destroy()

    def _header(self, eyebrow: str, title: str, detail: str) -> None:
        header = ttk.Frame(self.content, style="App.TFrame")
        header.pack(fill="x", padx=36, pady=(24, 16))
        ttk.Label(header, text=eyebrow.upper(), style="Muted.TLabel").pack(anchor="w")
        ttk.Label(header, text=title, style="Title.TLabel").pack(anchor="w", pady=(4, 4))
        ttk.Label(header, text=detail, style="Body.TLabel", wraplength=800).pack(anchor="w")

    def _show_elections(self) -> None:
        self._clear_content()
        self._header(
            "Student view",
            "Elections you can follow",
            "The server decides eligibility and timing. This client displays confirmed states and hands voting to the supported booth.",
        )
        toolbar = ttk.Frame(self.content, style="App.TFrame")
        toolbar.pack(fill="x", padx=36, pady=(0, 14))
        ttk.Button(toolbar, text="Refresh elections", command=self._load_elections, style="Action.TButton").pack(side="left")
        self.election_status = ttk.Label(toolbar, text="", style="Muted.TLabel")
        self.election_status.pack(side="left", padx=14)
        self.mode_badge = ttk.Label(toolbar, text="LOCAL DEMO MODE", style="DemoMode.TLabel")
        self.mode_badge.pack(side="right")

        self.election_list = ttk.Frame(self.content, style="App.TFrame")
        self.election_list.pack(fill="both", expand=True, padx=36, pady=(0, 24))
        self.election_list.columnconfigure(0, weight=1)
        self.election_list.columnconfigure(1, weight=1)
        self._load_elections()

    def _load_elections(self) -> None:
        try:
            self.elections = self.api_client.get_elections() if self.api_client else demo_elections()
            mode = "Connected to institutional API" if self.api_client else "Local demo mode. No ballots can be cast."
            self.mode_label.configure(text=mode)
            self.mode_badge.configure(
                text="CONNECTED API" if self.api_client else "LOCAL DEMO MODE",
                style="Mode.TLabel" if self.api_client else "DemoMode.TLabel",
            )
            self.election_status.configure(text=f"{len(self.elections)} elections loaded")
        except ApiError as exc:
            self.elections = demo_elections()
            self.mode_label.configure(text="API unavailable. Showing local demo data only.")
            self.mode_badge.configure(text="API UNAVAILABLE", style="DemoMode.TLabel")
            self.election_status.configure(text=str(exc))

        for child in self.election_list.winfo_children():
            child.destroy()
        for index, election in enumerate(self.elections):
            self._election_card(election, index)

    def _election_card(self, election: Election, index: int) -> None:
        card = ttk.Frame(self.election_list, style="Card.TFrame", padding=18)
        card.grid(row=index // 2, column=index % 2, sticky="nsew", padx=6, pady=6)
        card.columnconfigure(0, weight=1)
        top = ttk.Frame(card, style="Card.TFrame")
        top.pack(fill="x")
        status = ttk.Label(top, text=f"  {election.state}  ", style="Status.TLabel", foreground=status_colour(election.state))
        status.pack(side="left")
        ttk.Label(top, text=f"Closes {election.closes_at}", background=WHITE, foreground=MUTED, font=("DejaVu Sans", 9)).pack(side="right")
        ttk.Label(card, text=election.title, background=WHITE, foreground=NAVY, font=("DejaVu Sans", 14, "bold"), wraplength=380).pack(anchor="w", pady=(12, 4))
        ttk.Label(card, text=f"{election.candidate_count} candidates", background=WHITE, foreground=MUTED, font=("DejaVu Sans", 10)).pack(anchor="w")
        ttk.Label(card, text=f"Election ID  {election.election_id}", background=WHITE, foreground=MUTED, font=("DejaVu Sans", 9)).pack(anchor="w", pady=(3, 0))

    def _show_receipt(self) -> None:
        self._clear_content()
        self._header(
            "Receipt verification",
            "Follow evidence as it arrives",
            "A receipt is not a choice receipt. It shows server commitment and later independent evidence.",
        )
        form = ttk.Frame(self.content, style="Card.TFrame", padding=24)
        form.pack(fill="x", padx=36, pady=10)
        ttk.Label(form, text="Election ID", background=WHITE, foreground=TEXT).grid(row=0, column=0, sticky="w", padx=(0, 14), pady=8)
        election_entry = ttk.Entry(form, width=32)
        election_entry.grid(row=0, column=1, sticky="ew", pady=8)
        ttk.Label(form, text="Receipt handle", background=WHITE, foreground=TEXT).grid(row=1, column=0, sticky="w", padx=(0, 14), pady=8)
        handle_entry = ttk.Entry(form, width=32)
        handle_entry.grid(row=1, column=1, sticky="ew", pady=8)
        form.columnconfigure(1, weight=1)
        result = ttk.Label(form, text="", background=WHITE, foreground=TEXT, wraplength=620)
        result.grid(row=3, column=0, columnspan=2, sticky="w", pady=(18, 0))

        def lookup() -> None:
            if not self.api_client:
                result.configure(text="Local demo mode has no authoritative receipt service.", foreground=AMBER)
                return
            try:
                receipt = self.api_client.get_receipt(election_entry.get().strip(), handle_entry.get().strip())
                result.configure(
                    text=f"State: {receipt.status}\nLeaf index: {receipt.leaf_index}\nWitnessed at: {receipt.witnessed_at or 'Not yet witnessed'}",
                    foreground=status_colour(receipt.status),
                )
            except ApiError as exc:
                result.configure(text=str(exc), foreground=RED)

        ttk.Button(form, text="Check receipt", command=lookup, style="Action.TButton").grid(row=2, column=1, sticky="w", pady=(12, 0))

    def _show_audit(self) -> None:
        """Render the comprehensive offline election audit view."""
        self._clear_content()
        self._header(
            "Offline election audit",
            "Inspect archive, verify Merkle tree, and visualize tallies",
            "Perform standalone cryptographic inspection without network access. Recompute Merkle roots, verify leaf inclusion proofs, and visualize candidate tallies.",
        )

        toolbar = ttk.Frame(self.content, style="App.TFrame")
        toolbar.pack(fill="x", padx=36, pady=(0, 12))

        ttk.Button(toolbar, text="Open Archive File", command=self._open_archive_file, style="Action.TButton").pack(side="left", padx=(0, 8))
        ttk.Button(toolbar, text="Open Evidence Directory", command=self._open_archive_directory, style="Secondary.TButton").pack(side="left", padx=(0, 8))
        ttk.Button(toolbar, text="Load Demo Archive", command=self._load_demo_archive, style="Secondary.TButton").pack(side="left", padx=(0, 8))

        self.archive_path_label = ttk.Label(toolbar, text="No archive loaded", style="Muted.TLabel")
        self.archive_path_label.pack(side="left", padx=10)

        self.audit_notebook = ttk.Notebook(self.content)
        self.audit_notebook.pack(fill="both", expand=True, padx=36, pady=(0, 20))

        self.tab_overview = ttk.Frame(self.audit_notebook, style="App.TFrame")
        self.tab_merkle = ttk.Frame(self.audit_notebook, style="App.TFrame")
        self.tab_tally = ttk.Frame(self.audit_notebook, style="App.TFrame")
        self.tab_verifier = ttk.Frame(self.audit_notebook, style="App.TFrame")

        self.audit_notebook.add(self.tab_overview, text="Archive Overview")
        self.audit_notebook.add(self.tab_merkle, text="Merkle Proofs")
        self.audit_notebook.add(self.tab_tally, text="Candidate Tallies")
        self.audit_notebook.add(self.tab_verifier, text="Standalone Verifier")

        if self.current_inspection:
            self._render_inspection_views()
        else:
            self._render_placeholder_views()

    def _render_placeholder_views(self) -> None:
        for tab in (self.tab_overview, self.tab_merkle, self.tab_tally):
            for child in tab.winfo_children():
                child.destroy()
            placeholder = ttk.Frame(tab, style="Card.TFrame", padding=30)
            placeholder.pack(fill="both", expand=True, pady=10)
            ttk.Label(
                placeholder,
                text="Select an archive file or directory to inspect election evidence.",
                style="CardBody.TLabel",
            ).pack(anchor="w")

        self._render_verifier_tab()

    def _open_archive_file(self) -> None:
        chosen = filedialog.askopenfilename(
            title="Choose HimVote election archive",
            filetypes=[
                ("Supported archives", "*.zip *.tar *.tar.gz *.tgz *.tar.bz2"),
                ("All files", "*.*"),
            ],
        )
        if chosen:
            self._load_archive_path(Path(chosen))

    def _open_archive_directory(self) -> None:
        chosen = filedialog.askdirectory(title="Choose HimVote evidence directory")
        if chosen:
            self._load_archive_path(Path(chosen))

    def _load_demo_archive(self) -> None:
        repo_fixtures = [
            Path("/home/Kali/Desktop/HPTU/Team-Rocket/fixtures/simulation_run/export"),
            Path(__file__).resolve().parents[2] / "fixtures" / "simulation_run" / "export",
        ]
        for candidate in repo_fixtures:
            if candidate.exists() and (candidate / "manifest.json").exists():
                self._load_archive_path(candidate)
                return
        messagebox.showinfo("Demo Archive", "Demo simulation directory not found on disk.")

    def _load_archive_path(self, target_path: Path) -> None:
        try:
            if self.current_archive:
                self.current_archive.close()
            self.current_archive = ElectionArchive.load(target_path)
            self.current_inspection = self.current_archive.inspect()
            if hasattr(self, "archive_path_label"):
                self.archive_path_label.configure(text=f"Loaded: {target_path.name}")
            self._render_inspection_views()
        except Exception as exc:
            messagebox.showerror("Archive Inspection Failed", f"Could not inspect archive: {exc}")

    def _render_inspection_views(self) -> None:
        if not self.current_inspection:
            return
        self._render_overview_tab()
        self._render_merkle_tab()
        self._render_tally_tab()
        self._render_verifier_tab()

    def _render_overview_tab(self) -> None:
        for child in self.tab_overview.winfo_children():
            child.destroy()
        insp = self.current_inspection
        if not insp:
            return

        panel = ttk.Frame(self.tab_overview, style="App.TFrame")
        panel.pack(fill="both", expand=True, pady=10)

        # Summary cards row
        cards_row = ttk.Frame(panel, style="App.TFrame")
        cards_row.pack(fill="x", pady=(0, 10))

        # Metadata Card
        meta_card = ttk.Frame(cards_row, style="Card.TFrame", padding=16)
        meta_card.pack(side="left", fill="both", expand=True, padx=(0, 6))
        ttk.Label(meta_card, text="Election Details", style="SubTitle.TLabel").pack(anchor="w", pady=(0, 8))
        ttk.Label(meta_card, text=f"Title: {insp.title}", style="CardBody.TLabel").pack(anchor="w")
        ttk.Label(meta_card, text=f"ID: {insp.election_id}", style="CardMuted.TLabel").pack(anchor="w", pady=(2, 0))
        ttk.Label(meta_card, text=f"Protocol: {insp.protocol_version}", style="CardMuted.TLabel").pack(anchor="w")
        ttk.Label(meta_card, text=f"Voting Engine: {insp.voting_engine}", style="CardMuted.TLabel").pack(anchor="w")

        # Counts Card
        counts_card = ttk.Frame(cards_row, style="Card.TFrame", padding=16)
        counts_card.pack(side="left", fill="both", expand=True, padx=6)
        ttk.Label(counts_card, text="Participation Summary", style="SubTitle.TLabel").pack(anchor="w", pady=(0, 8))
        ttk.Label(counts_card, text=f"Total Leaves: {insp.total_leaves}", style="CardBody.TLabel").pack(anchor="w")
        eligible_text = f"Eligible Voters: {insp.eligible_count}" if insp.eligible_count is not None else "Eligible: Unknown"
        ttk.Label(counts_card, text=eligible_text, style="CardBody.TLabel").pack(anchor="w", pady=(2, 0))
        ttk.Label(counts_card, text=f"Candidates: {insp.candidate_count}", style="CardMuted.TLabel").pack(anchor="w")

        # Integrity Status Card
        status_card = ttk.Frame(cards_row, style="Card.TFrame", padding=16)
        status_card.pack(side="left", fill="both", expand=True, padx=(6, 0))
        ttk.Label(status_card, text="Integrity Verdict", style="SubTitle.TLabel").pack(anchor="w", pady=(0, 8))
        verdict_text = "PASS ALL AUDITS" if insp.is_valid else "AUDIT ISSUES DETECTED"
        verdict_style = "BadgeGreen.TLabel" if insp.is_valid else "BadgeRed.TLabel"
        ttk.Label(status_card, text=f"  {verdict_text}  ", style=verdict_style).pack(anchor="w", pady=(0, 6))
        manifest_status = "Manifest digest verified" if insp.manifest_digest_valid else "Manifest digest mismatch"
        ttk.Label(status_card, text=f"* {manifest_status}", style="CardMuted.TLabel").pack(anchor="w")
        seq_status = "Leaf sequence continuous" if insp.leaf_sequence_valid else "Leaf sequence gap or duplicate"
        ttk.Label(status_card, text=f"* {seq_status}", style="CardMuted.TLabel").pack(anchor="w")
        null_status = "Nullifiers distinct" if insp.nullifiers_unique else "Duplicate nullifier detected"
        ttk.Label(status_card, text=f"* {null_status}", style="CardMuted.TLabel").pack(anchor="w")

        # Details Table Card
        details_card = ttk.Frame(panel, style="Card.TFrame", padding=16)
        details_card.pack(fill="x", pady=6)
        ttk.Label(details_card, text="Canonical Manifest Digest", style="SubTitle.TLabel").pack(anchor="w", pady=(0, 4))
        digest_entry = ttk.Entry(details_card, font=("DejaVu Sans Mono", 9))
        digest_entry.insert(0, insp.manifest_digest)
        digest_entry.configure(state="readonly")
        digest_entry.pack(fill="x", pady=(0, 10))

        ttk.Label(details_card, text="Recomputed Merkle Tree Root", style="SubTitle.TLabel").pack(anchor="w", pady=(0, 4))
        root_entry = ttk.Entry(details_card, font=("DejaVu Sans Mono", 9))
        root_entry.insert(0, insp.merkle_root_hex)
        root_entry.configure(state="readonly")
        root_entry.pack(fill="x")

    def _render_merkle_tab(self) -> None:
        for child in self.tab_merkle.winfo_children():
            child.destroy()
        insp = self.current_inspection
        if not insp:
            return

        panel = ttk.Frame(self.tab_merkle, style="App.TFrame")
        panel.pack(fill="both", expand=True, pady=10)

        # Root Comparison Card
        root_card = ttk.Frame(panel, style="Card.TFrame", padding=16)
        root_card.pack(fill="x", pady=(0, 10))
        ttk.Label(root_card, text="RFC 9162 Merkle Tree Root Verification", style="SubTitle.TLabel").pack(anchor="w", pady=(0, 8))

        grid = ttk.Frame(root_card, style="Card.TFrame")
        grid.pack(fill="x")

        ttk.Label(grid, text="Recomputed Root:", style="CardBody.TLabel").grid(row=0, column=0, sticky="w", pady=3)
        recomp_entry = ttk.Entry(grid, width=72, font=("DejaVu Sans Mono", 9))
        recomp_entry.insert(0, insp.merkle_root_hex)
        recomp_entry.configure(state="readonly")
        recomp_entry.grid(row=0, column=1, sticky="ew", padx=8, pady=3)

        ttk.Label(grid, text="Witness Checkpoint:", style="CardBody.TLabel").grid(row=1, column=0, sticky="w", pady=3)
        wit_text = insp.witness_root_hex or "No witness checkpoint file provided"
        wit_entry = ttk.Entry(grid, width=72, font=("DejaVu Sans Mono", 9))
        wit_entry.insert(0, wit_text)
        wit_entry.configure(state="readonly")
        wit_entry.grid(row=1, column=1, sticky="ew", padx=8, pady=3)
        grid.columnconfigure(1, weight=1)

        match_badge_frame = ttk.Frame(root_card, style="Card.TFrame")
        match_badge_frame.pack(anchor="w", pady=(8, 0))
        if insp.merkle_root_matches_witness is True:
            ttk.Label(match_badge_frame, text="  ROOT MATCHES WITNESS FINAL CHECKPOINT  ", style="BadgeGreen.TLabel").pack(side="left")
        elif insp.merkle_root_matches_witness is False:
            ttk.Label(match_badge_frame, text="  ROOT MISMATCH AGAINST WITNESS  ", style="BadgeRed.TLabel").pack(side="left")
        else:
            ttk.Label(match_badge_frame, text="  STANDALONE RECOMPUTED (NO WITNESS FILE)  ", style="BadgeAmber.TLabel").pack(side="left")

        # Interactive Leaf Inclusion Proof Inspector
        proof_card = ttk.Frame(panel, style="Card.TFrame", padding=16)
        proof_card.pack(fill="both", expand=True)
        ttk.Label(proof_card, text="Leaf Inclusion Proof Recomputation", style="SubTitle.TLabel").pack(anchor="w", pady=(0, 6))
        ttk.Label(
            proof_card,
            text="Generate and verify an RFC 9162 audit path connecting any individual leaf to the witnessed Merkle root.",
            style="CardMuted.TLabel",
        ).pack(anchor="w", pady=(0, 10))

        leaf_controls = ttk.Frame(proof_card, style="Card.TFrame")
        leaf_controls.pack(fill="x", pady=(0, 10))

        ttk.Label(leaf_controls, text="Leaf Index (0 to N minus 1):", style="CardBody.TLabel").pack(side="left", padx=(0, 8))
        self.leaf_index_spin = ttk.Spinbox(leaf_controls, from_=0, to=max(0, insp.total_leaves - 1), width=8)
        self.leaf_index_spin.set(0)
        self.leaf_index_spin.pack(side="left", padx=(0, 10))

        ttk.Button(leaf_controls, text="Recompute Proof", command=self._inspect_leaf_proof, style="Action.TButton").pack(side="left")

        self.proof_output = ttk.Label(proof_card, text="", style="CardBody.TLabel", justify="left")
        self.proof_output.pack(anchor="w", pady=(8, 4))

        self.proof_treeview = ttk.Treeview(proof_card, columns=("step", "side", "hash"), show="headings", height=6)
        self.proof_treeview.heading("step", text="Step")
        self.proof_treeview.heading("side", text="Position")
        self.proof_treeview.heading("hash", text="Sibling Hash")
        self.proof_treeview.column("step", width=50, anchor="center")
        self.proof_treeview.column("side", width=90, anchor="center")
        self.proof_treeview.column("hash", width=520, anchor="w")
        self.proof_treeview.pack(fill="both", expand=True)

        if insp.total_leaves > 0:
            self._inspect_leaf_proof()

    def _inspect_leaf_proof(self) -> None:
        if not self.current_archive:
            return
        try:
            val = int(self.leaf_index_spin.get())
            proof = self.current_archive.get_leaf_proof(val)
        except Exception as exc:
            self.proof_output.configure(text=f"Proof error: {exc}", foreground=RED)
            return

        status_text = "VERIFIED INCLUSION PROOF" if proof.verified else "VERIFICATION FAILED"
        color = GREEN if proof.verified else RED
        self.proof_output.configure(
            text=f"Leaf: {proof.leaf_id}   Nullifier: {proof.nullifier[:24]}...   Status: {status_text}   Depth: {proof.path_length}",
            foreground=color,
        )

        for item in self.proof_treeview.get_children():
            self.proof_treeview.delete(item)

        for step, (side, sibling_hash) in enumerate(proof.siblings, start=1):
            self.proof_treeview.insert("", "end", values=(step, side.upper(), sibling_hash))

    def _render_tally_tab(self) -> None:
        for child in self.tab_tally.winfo_children():
            child.destroy()
        insp = self.current_inspection
        if not insp:
            return

        panel = ttk.Frame(self.tab_tally, style="App.TFrame")
        panel.pack(fill="both", expand=True, pady=10)

        # Header summary card
        summary_card = ttk.Frame(panel, style="Card.TFrame", padding=16)
        summary_card.pack(fill="x", pady=(0, 10))
        ttk.Label(summary_card, text="Candidate Tally Visualization", style="SubTitle.TLabel").pack(anchor="w", pady=(0, 6))

        info_row = ttk.Frame(summary_card, style="Card.TFrame")
        info_row.pack(fill="x")

        total_votes = sum(c.vote_count for c in insp.candidate_tallies)
        ttk.Label(info_row, text=f"Total Ballots Counted: {total_votes}", style="CardBody.TLabel").pack(side="left", padx=(0, 18))

        if insp.eligible_count:
            turnout = (total_votes / insp.eligible_count * 100.0) if insp.eligible_count > 0 else 0.0
            ttk.Label(info_row, text=f"Turnout: {turnout:.1f}% of {insp.eligible_count} eligible voters", style="CardBody.TLabel").pack(side="left", padx=(0, 18))

        if insp.tally_recomputed_matches_announced is True:
            ttk.Label(info_row, text="  RECOMPUTED TALLY MATCHES ANNOUNCED RESULTS  ", style="BadgeGreen.TLabel").pack(side="left")
        elif insp.tally_recomputed_matches_announced is False:
            ttk.Label(info_row, text="  TALLY MISMATCH AGAINST ANNOUNCED  ", style="BadgeRed.TLabel").pack(side="left")

        # Scrollable container for candidate bars
        scroll_container = ttk.Frame(panel, style="Card.TFrame", padding=16)
        scroll_container.pack(fill="both", expand=True)

        for tally in insp.candidate_tallies:
            self._render_candidate_bar(scroll_container, tally)

    def _render_candidate_bar(self, parent: ttk.Frame, tally: CandidateTally) -> None:
        row = ttk.Frame(parent, style="Card.TFrame", padding=(8, 6))
        row.pack(fill="x", pady=4)

        header = ttk.Frame(row, style="Card.TFrame")
        header.pack(fill="x", pady=(0, 4))

        # Rank and Name
        rank_label = f"#{tally.rank}"
        ttk.Label(header, text=rank_label, font=("DejaVu Sans", 11, "bold"), foreground=NAVY, background=WHITE).pack(side="left", padx=(0, 8))
        ttk.Label(header, text=tally.name, font=("DejaVu Sans", 11, "bold"), foreground=TEXT, background=WHITE).pack(side="left")
        ttk.Label(header, text=f"({tally.candidate_id})", font=("DejaVu Sans", 9), foreground=MUTED, background=WHITE).pack(side="left", padx=8)

        if tally.is_winner:
            ttk.Label(header, text="  LEADING  ", style="BadgeGreen.TLabel").pack(side="left", padx=6)

        # Votes and percentage
        count_str = f"{tally.vote_count} votes ({tally.percentage:.1f}%)"
        ttk.Label(header, text=count_str, font=("DejaVu Sans", 11, "bold"), foreground=NAVY, background=WHITE).pack(side="right")

        # Proportional bar canvas
        canvas = tk.Canvas(row, height=18, bg=PROGRESS_BG, highlightthickness=0)
        canvas.pack(fill="x", pady=(2, 0))

        def draw_bar(event: tk.Event[tk.Canvas] | None = None) -> None:
            width = canvas.winfo_width()
            fill_width = max(2, int(width * (tally.percentage / 100.0))) if tally.vote_count > 0 else 0
            canvas.delete("all")
            fill_color = GREEN if tally.is_winner else TEAL
            if fill_width > 0:
                canvas.create_rectangle(0, 0, fill_width, 18, fill=fill_color, outline="")

        canvas.bind("<Configure>", draw_bar)

    def _render_verifier_tab(self) -> None:
        for child in self.tab_verifier.winfo_children():
            child.destroy()

        panel = ttk.Frame(self.tab_verifier, style="Card.TFrame", padding=20)
        panel.pack(fill="both", expand=True, pady=10)

        ttk.Label(panel, text="External Standalone Verifier Process", style="SubTitle.TLabel").pack(anchor="w", pady=(0, 6))
        ttk.Label(
            panel,
            text=f"Configured Verifier Path: {self.verifier_path}",
            style="CardBody.TLabel",
        ).pack(anchor="w", pady=(0, 10))

        ttk.Button(panel, text="Run Standalone Verifier CLI", command=self._run_external_verifier, style="Action.TButton").pack(anchor="w", pady=(0, 12))

        self.verifier_log = tk.Text(panel, wrap="word", height=14, font=("DejaVu Sans Mono", 9), bg=WHITE, fg=TEXT)
        self.verifier_log.pack(fill="both", expand=True)

    def _run_external_verifier(self) -> None:
        if not self.verifier_path.exists():
            messagebox.showerror("Verifier Error", f"Verifier script not found at {self.verifier_path}")
            return
        if not self.current_inspection:
            messagebox.showinfo("Verifier Notice", "Please load an election archive first.")
            return

        archive_p = Path(self.current_inspection.archive_path)
        export_p = archive_p
        external_dir = archive_p.parent / "external" if archive_p.is_dir() else archive_p.parent

        trust_p = external_dir / "trust_pins.json"
        final_p = external_dir / "witness_final.json"
        roster_p = external_dir / "roster_approval.json"
        issuance_p = external_dir / "issuer_closure.json"
        chain_p = external_dir / "chain_pins.json"

        missing = [p.name for p in [trust_p, final_p, roster_p, issuance_p, chain_p] if not p.exists()]
        if missing:
            self.verifier_log.delete("1.0", "end")
            self.verifier_log.insert(
                "end",
                f"Missing external authority files required for Section 6.8 full audit:\n"
                + "\n".join(f"* {m}" for m in missing)
                + "\n\nNote: Standalone offline Merkle tree and tally recomputation completed successfully above.",
            )
            return

        cmd = [
            sys.executable,
            str(self.verifier_path),
            "audit_evidence",
            "--export",
            str(export_p),
            "--trust",
            str(trust_p),
            "--final",
            str(final_p),
            "--roster",
            str(roster_p),
            "--issuance",
            str(issuance_p),
            "--chain",
            str(chain_p),
            "--report",
            "/tmp/himvote_audit_report.json",
        ]

        try:
            res = subprocess.run(cmd, capture_output=True, text=True, check=False)
            self.verifier_log.delete("1.0", "end")
            self.verifier_log.insert("end", f"Verifier Exit Code: {res.returncode}\n\nSTDOUT:\n{res.stdout}\n\nSTDERR:\n{res.stderr}")
        except Exception as exc:
            self.verifier_log.delete("1.0", "end")
            self.verifier_log.insert("end", f"Execution failed: {exc}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the HimVote Linux desktop client")
    parser.add_argument("--api-base", default="", help="Institutional API base URL")
    parser.add_argument("--verifier", default="verifier/verify.py", help="Path to the standalone verifier")
    parser.add_argument("--archive", default="", help="Path to offline election archive file or directory")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    api_client = LinuxApiClient(args.api_base) if args.api_base else None
    verifier_path = Path(args.verifier).resolve()
    initial_archive = Path(args.archive).resolve() if args.archive else None
    app = HimVoteLinuxApp(api_client, verifier_path, initial_archive)
    app.mainloop()
    return 0


if __name__ == "__main__":
    sys.exit(main())
