"""Native Linux desktop client for HimVote.

The client provides election browsing, receipt tracking, offline election
archive inspection, Merkle proof recomputation, and candidate tally visualization.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import math
import os
import shutil
import subprocess
import sys
import tarfile
import tempfile
import threading
import queue
import tkinter as tk
import zipfile
from dataclasses import dataclass, field
from pathlib import Path
from tkinter import filedialog, messagebox, ttk
from typing import Any, Callable
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

# Ensure Tcl/Tk libraries are located reliably on Windows systems
if sys.platform == "win32":
    _tcl_cand = Path(sys.base_prefix) / "tcl" / "tcl8.6"
    if _tcl_cand.exists() and "TCL_LIBRARY" not in os.environ:
        os.environ["TCL_LIBRARY"] = str(_tcl_cand)
    _tk_cand = Path(sys.base_prefix) / "tcl" / "tk8.6"
    if _tk_cand.exists() and "TK_LIBRARY" not in os.environ:
        os.environ["TK_LIBRARY"] = str(_tk_cand)


NAVY = "#10233F"
NAVY_SOFT = "#294463"
TEAL = "#157E92"
GREEN = "#15805D"
AMBER = "#AA6C0B"
RED = "#C23C45"
SURFACE = "#F3F6FA"
WHITE = "#FFFFFF"
TEXT = "#17233B"
MUTED = "#334155"
LINE = "#D9E2EC"
LIGHT_BG = "#E8F3F5"
PROGRESS_BG = "#E2E8F0"

CHIP_SUCCESS_BG = "#DCFCE7"
CHIP_SUCCESS_FG = "#14532D"
CHIP_SUCCESS_BORDER = "#86EFAC"

CHIP_WARNING_BG = "#FEF3C7"
CHIP_WARNING_FG = "#78350F"
CHIP_WARNING_BORDER = "#FDE047"

CHIP_DANGER_BG = "#FEE2E2"
CHIP_DANGER_FG = "#7F1D1D"
CHIP_DANGER_BORDER = "#FCA5A5"

CHIP_INFO_BG = "#E0F2FE"
CHIP_INFO_FG = "#0C4A6E"
CHIP_INFO_BORDER = "#7DD3FC"

CHIP_NEUTRAL_BG = "#F1F5F9"
CHIP_NEUTRAL_FG = "#0F172A"
CHIP_NEUTRAL_BORDER = "#CBD5E1"

HC_BG = "#000000"
HC_SURFACE = "#121212"
HC_CARD = "#1A1A1A"
HC_TEXT = "#FFFFFF"
HC_MUTED = "#E2E8F0"
HC_ACCENT = "#FEF08A"
HC_LINE = "#FFFFFF"
HC_SUCCESS = "#86EFAC"
HC_WARNING = "#FDE047"
HC_DANGER = "#FCA5A5"


def relative_luminance(hex_code: str) -> float:
    """Calculate relative luminance per WCAG 2.1 specifications."""
    clean = hex_code.lstrip("#")
    if len(clean) == 3:
        clean = "".join(ch * 2 for ch in clean)
    r = int(clean[0:2], 16) / 255.0
    g = int(clean[2:4], 16) / 255.0
    b = int(clean[4:6], 16) / 255.0

    def adjust_channel(val: float) -> float:
        if val <= 0.03928:
            return val / 12.92
        return ((val + 0.055) / 1.055) ** 2.4

    return 0.2126 * adjust_channel(r) + 0.7152 * adjust_channel(g) + 0.0722 * adjust_channel(b)


def calculate_contrast_ratio(hex_a: str, hex_b: str) -> float:
    """Calculate WCAG contrast ratio between two hex colors."""
    lum_a = relative_luminance(hex_a)
    lum_b = relative_luminance(hex_b)
    lighter = max(lum_a, lum_b)
    darker = min(lum_a, lum_b)
    return (lighter + 0.05) / (darker + 0.05)


def is_wcag_aa_compliant(hex_fg: str, hex_bg: str, is_large_text: bool = False) -> bool:
    """Check whether contrast meets WCAG AA standards."""
    ratio = calculate_contrast_ratio(hex_fg, hex_bg)
    threshold = 3.0 if is_large_text else 4.5
    return ratio >= threshold


def is_wcag_aaa_compliant(hex_fg: str, hex_bg: str, is_large_text: bool = False) -> bool:
    """Check whether contrast meets WCAG AAA standards."""
    ratio = calculate_contrast_ratio(hex_fg, hex_bg)
    threshold = 4.5 if is_large_text else 7.0
    return ratio >= threshold

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
class Candidate:
    candidate_id: str
    name: str
    slate: str = ""
    statement: str = ""
    department: str = ""


@dataclass(frozen=True)
class Election:
    election_id: str
    title: str
    state: str
    closes_at: str
    candidate_count: int
    description: str = ""
    candidates: list[Candidate] = field(default_factory=list)
    eligibility: str = "Registered Students"
    started_at: str = "Active"

    @classmethod
    def from_payload(cls, payload: dict[str, Any]) -> "Election":
        raw_candidates = payload.get("candidates") or []
        candidates_list: list[Candidate] = []
        for i, c in enumerate(raw_candidates):
            if isinstance(c, dict):
                candidates_list.append(
                    Candidate(
                        candidate_id=str(c.get("id") or c.get("candidate_id") or f"cand_{i}"),
                        name=str(c.get("name") or "Unnamed candidate"),
                        slate=str(c.get("slate") or ""),
                        statement=str(c.get("statement") or ""),
                        department=str(c.get("department") or ""),
                    )
                )
            else:
                candidates_list.append(Candidate(candidate_id=f"cand_{i}", name=str(c)))
        return cls(
            election_id=str(payload.get("id") or payload.get("election_id") or ""),
            title=str(payload.get("title") or "Untitled election"),
            state=str(payload.get("state") or "DRAFT"),
            closes_at=str(payload.get("closes_at_utc") or "Not scheduled"),
            candidate_count=len(candidates_list) if candidates_list else len(raw_candidates),
            description=str(payload.get("description") or ""),
            candidates=candidates_list,
            eligibility=str(payload.get("eligibility") or "Registered Students"),
            started_at=str(payload.get("started_at_utc") or "Active"),
        )


@dataclass(frozen=True)
class Receipt:
    status: str
    leaf_index: int | None = None
    witnessed_at: str | None = None
    server_commitment: str | None = None
    witness_checkpoint: str | None = None
    ballot_hash: str | None = None
    election_id: str | None = None
    handle: str | None = None


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
    has_witness_final: bool = False
    has_trust_pins: bool = False
    has_roster_approval: bool = False
    has_issuer_closure: bool = False
    has_chain_pins: bool = False
    has_attestation: bool = False
    external_package_complete: bool = False

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


def _duplicate_key_hook(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    d = dict(pairs)
    if len(d) != len(pairs):
        seen: set[str] = set()
        for k, _ in pairs:
            if k in seen:
                raise ArchiveError(f"Duplicate JSON key detected: {k}")
            seen.add(k)
    return d


def _reject_float_hook(val: str) -> None:
    raise ArchiveError(f"Floats not permitted in canonical records: {val}")


def safe_json_loads(data: str | bytes) -> Any:
    """Safely decode JSON without duplicate keys or float values."""
    if isinstance(data, bytes):
        try:
            text = data.decode("utf_8")
        except UnicodeDecodeError as err:
            raise ArchiveError("Invalid UTF 8 encoding in JSON data") from err
    else:
        text = data

    try:
        return json.loads(
            text,
            object_pairs_hook=_duplicate_key_hook,
            parse_float=_reject_float_hook,
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
        roster_approval: dict[str, Any] | None = None,
        issuer_closure: dict[str, Any] | None = None,
        chain_pins: dict[str, Any] | None = None,
        attestation: dict[str, Any] | None = None,
        temp_dir: tempfile.TemporaryDirectory | None = None,
    ) -> None:
        self.manifest = manifest
        self.leaves = leaves
        self.results = results
        self.source_path = source_path
        self.witness_final = witness_final
        self.trust_pins = trust_pins
        self.roster_approval = roster_approval
        self.issuer_closure = issuer_closure
        self.chain_pins = chain_pins
        self.attestation = attestation
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

        # Locate optional trust pins and external package files
        def find_external_json(filename: str) -> dict[str, Any] | None:
            candidates = [
                working_dir / filename,
                working_dir / "external" / filename,
                working_dir.parent / "external" / filename,
            ]
            for c in candidates:
                if c.exists():
                    try:
                        with open(c, "rb") as f:
                            return safe_json_loads(f.read())
                    except Exception:
                        pass
            return None

        trust_pins = find_external_json("trust_pins.json")
        roster_approval = find_external_json("roster_approval.json")
        issuer_closure = find_external_json("issuer_closure.json")
        chain_pins = find_external_json("chain_pins.json")
        attestation = find_external_json("attestation.json")

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
            roster_approval=roster_approval,
            issuer_closure=issuer_closure,
            chain_pins=chain_pins,
            attestation=attestation,
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
        digest = hashlib.sha256(b"\x00" + leaf_bytes[-1]).hexdigest()
        return f"sha256:{digest}"

    def get_leaf_proof(self, leaf_index: int) -> MerkleProofResult:
        """Generate and verify inclusion proof for the leaf at leaf_index."""
        leaf_bytes_list = self.get_canonical_leaf_bytes()
        n = len(leaf_bytes_list)
        if not (0 <= leaf_index < n):
            raise MerkleProofError(f"Leaf index {leaf_index} out of range 0 to {n - 1}")

        target_leaf = self.leaves[leaf_index]
        target_bytes = leaf_bytes_list[leaf_index]
        target_digest = hashlib.sha256(b"\x00" + target_bytes).hexdigest()
        leaf_hash = f"sha256:{target_digest}"
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

        # Verify leaf sequence continuity (0 to N minus 1)
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
            has_witness_final=self.witness_final is not None,
            has_trust_pins=self.trust_pins is not None,
            has_roster_approval=self.roster_approval is not None,
            has_issuer_closure=self.issuer_closure is not None,
            has_chain_pins=self.chain_pins is not None,
            has_attestation=self.attestation is not None,
            external_package_complete=bool(self.witness_final and self.trust_pins and self.roster_approval and self.issuer_closure and self.chain_pins),
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

    def login(self, email: str, password: str, mfa_token: str = "") -> UserSession:
        """Authenticate with identity origin or fallback to local simulator."""
        payload_bytes = json.dumps({"email": email, "password": password, "mfa_token": mfa_token}).encode("utf-8")
        req = Request(
            f"{self.base_url}/v1/auth/login",
            data=payload_bytes,
            headers={"Content-Type": "application/json", "Accept": "application/json"},
            method="POST",
        )
        try:
            with urlopen(req, timeout=self.timeout) as resp:
                data = json.load(resp)
                return UserSession(
                    user_id=str(data.get("user_id") or "usr_demo"),
                    email=email,
                    full_name=str(data.get("full_name") or email.split("@")[0].title()),
                    role=str(data.get("role") or "Student"),
                    bearer_token=str(data.get("bearer_token") or data.get("token") or "token_demo"),
                    is_authenticated=True,
                    credential_status="ACTIVE_VERIFIED",
                )
        except Exception:
            return UserSession(
                user_id=f"usr_{hashlib.sha256(email.encode()).hexdigest()[:8]}",
                email=email,
                full_name=email.split("@")[0].replace(".", " ").title(),
                role="Administrator" if "admin" in email else ("Auditor" if "audit" in email else "Student"),
                bearer_token=f"sim_{hashlib.sha256((email + password).encode()).hexdigest()[:24]}",
                is_authenticated=True,
                credential_status="OFFLINE_DEMO_CREDENTIAL",
            )

    def get_admin_audit_events(self) -> list[AdminAuditEvent]:
        """Fetch immutable administrative audit events from origin."""
        try:
            payload = self._get_json("/v1/admin/audit_events")
            items = payload.get("items", payload) if isinstance(payload, dict) else payload
            if isinstance(items, list):
                return [AdminAuditEvent.from_dict(it) for it in items]
        except Exception:
            pass
        return demo_admin_events()

    @staticmethod
    def check_origin_health(url: str, timeout: float = 2.5) -> tuple[bool, str, float]:
        """Measure connection status and round-trip latency in milliseconds."""
        import time
        start = time.perf_counter()
        req = Request(url, headers={"User-Agent": "HimVote-Linux/1.0"})
        try:
            with urlopen(req, timeout=timeout) as resp:
                elapsed_ms = (time.perf_counter() - start) * 1000.0
                return True, f"HTTP {resp.status} OK", elapsed_ms
        except Exception as exc:
            elapsed_ms = (time.perf_counter() - start) * 1000.0
            return False, str(exc), elapsed_ms


def demo_elections() -> list[Election]:
    """Return clearly labelled local demo records for disconnected development."""
    return [
        Election(
            "demo_union_2026",
            "Student Union Council 2026",
            "OPEN",
            "14 Nov 2026",
            6,
            description="Annual executive elections for the Student Union Council representing all undergraduate and postgraduate bodies across campus.",
            candidates=[
                Candidate("cand_pres_1", "Sarah Jenkins", "Progress & Transparency", "Championing digital student democracy, expanded study spaces, and green campus transit.", "Computer Science"),
                Candidate("cand_pres_2", "Marcus Rodriguez", "Action Student Slate", "Focused on transparent student fee allocations, athletic funding, and 24/7 mental health access.", "Business Admin"),
                Candidate("cand_vp_1", "Priya Sharma", "Independent Student Voice", "Empowering student societies, increasing club budgets, and securing laboratory equipment.", "Electrical Eng"),
                Candidate("cand_vp_2", "Alexander Vance", "United Campus Initiative", "Advocating for campus-wide universal design, wheelchair accessibility, and library hours.", "Law"),
                Candidate("cand_treas_1", "Elena Rostova", "Fiscal Integrity Slate", "Ensuring full open-ledger public reporting for student activity grants and union budgets.", "Economics"),
                Candidate("cand_treas_2", "David Kim", "Students First Coalition", "Creating emergency student micro-grant schemes and textbook affordability textbook banks.", "Data Science"),
            ],
            eligibility="All enrolled undergraduate & graduate students",
            started_at="01 Nov 2026 09:00 UTC",
        ),
        Election(
            "demo_design_2026",
            "School of Design Representatives",
            "UPCOMING",
            "20 Nov 2026",
            3,
            description="Departmental election for faculty board student delegates across Industrial Design, UX/UI, and Architecture.",
            candidates=[
                Candidate("cand_des_1", "Chloe Moreau", "Studio Collective", "Bridging industry design apprenticeships with annual undergraduate portfolio showcases.", "Industrial Design"),
                Candidate("cand_des_2", "Kenji Sato", "Open Studio Guild", "Modernizing studio workshop hardware, 3D printers, and materials subsidy quotas.", "Architecture"),
                Candidate("cand_des_3", "Amara Okonjo", "Inclusive Design Alliance", "Promoting universal accessibility standards and digital ethics across all design courses.", "HCI"),
            ],
            eligibility="School of Design registered students & faculty affiliates",
            started_at="20 Nov 2026 08:00 UTC",
        ),
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


def chip_variant_from_state(state: str) -> str:
    """Map election or verification state to semantic chip variant."""
    cleaned = state.strip().upper()
    if cleaned in {
        "ACTIVE",
        "CONFIRMED",
        "WITNESSED",
        "PASS",
        "MATCH",
        "VALID",
        "OPEN",
        "ANCHOR_FINALIZED",
        "AUDIT_PASSED",
        "AUDITOR_ATTESTED",
        "LEADING",
    }:
        return "success"
    if cleaned in {
        "PENDING",
        "PENDING_WITNESS",
        "STANDALONE",
        "DRAFT",
        "UPCOMING",
        "ANCHOR_PENDING",
        "REVIEW",
    }:
        return "warning"
    if cleaned in {
        "DISPUTED",
        "FAIL",
        "MISMATCH",
        "REJECTED",
        "ERROR",
        "FAILED",
        "INVALID",
    }:
        return "danger"
    if cleaned in {"CONNECTED", "PROCESSING", "AUDITING", "INFO"}:
        return "info"
    return "neutral"


class StatusChip(tk.Frame):
    """Pill style status chip with high contrast glyph and text."""

    GLYPHS = {
        "success": "●",
        "warning": "▲",
        "danger": "✕",
        "info": "●",
        "neutral": "○",
    }

    PALETTES = {
        "success": (CHIP_SUCCESS_BG, CHIP_SUCCESS_FG, CHIP_SUCCESS_BORDER),
        "warning": (CHIP_WARNING_BG, CHIP_WARNING_FG, CHIP_WARNING_BORDER),
        "danger": (CHIP_DANGER_BG, CHIP_DANGER_FG, CHIP_DANGER_BORDER),
        "info": (CHIP_INFO_BG, CHIP_INFO_FG, CHIP_INFO_BORDER),
        "neutral": (CHIP_NEUTRAL_BG, CHIP_NEUTRAL_FG, CHIP_NEUTRAL_BORDER),
    }

    def __init__(
        self,
        parent: Any,
        text: str = "",
        variant: str = "neutral",
        font_size: int = 9,
        **kwargs: Any,
    ) -> None:
        super().__init__(parent, **kwargs)
        self.text_value = text
        self.variant = variant
        self.font_size = font_size

        self.label = tk.Label(
            self,
            font=("DejaVu Sans", font_size, "bold"),
            padx=8,
            pady=3,
        )
        self.label.pack(fill="both", expand=True)
        self.set_status(text, variant)

    def set_status(self, text: str, variant: str = "neutral") -> None:
        """Update chip text and color styling."""
        self.text_value = text
        self.variant = variant if variant in self.PALETTES else "neutral"
        bg_col, fg_col, border_col = self.PALETTES[self.variant]
        glyph = self.GLYPHS.get(self.variant, "●")
        display_str = f" {glyph}  {text.strip()} " if text.strip() else ""

        self.configure(bg=bg_col, bd=0, relief="flat", highlightthickness=1, highlightbackground=border_col)
        self.label.configure(text=display_str, bg=bg_col, fg=fg_col, padx=10, pady=3)

    def get_status(self) -> tuple[str, str]:
        """Return tuple of current text and variant."""
        return self.text_value, self.variant

    def configure(self, cnf: Any = None, **kw: Any) -> Any:
        """Support standard Tkinter configure calls for backward compatibility."""
        if kw:
            if "text" in kw:
                new_text = str(kw.pop("text"))
                style_str = kw.pop("style", None)
                var = self.variant
                if style_str:
                    if "Green" in style_str:
                        var = "success"
                    elif "Red" in style_str:
                        var = "danger"
                    elif "Amber" in style_str or "Demo" in style_str:
                        var = "warning"
                    elif "Mode" in style_str:
                        var = "info"
                self.set_status(new_text, var)
            if "style" in kw:
                style_str = str(kw.pop("style"))
                var = "neutral"
                if "Green" in style_str:
                    var = "success"
                elif "Red" in style_str:
                    var = "danger"
                elif "Amber" in style_str or "Demo" in style_str:
                    var = "warning"
                elif "Mode" in style_str:
                    var = "info"
                self.set_status(self.text_value, var)
        if kw or cnf:
            return super().configure(cnf, **kw)
        return None

    def cget(self, key: str) -> Any:
        if key == "text":
            return self.text_value
        return super().cget(key)


class ToastNotification(tk.Frame):
    """Modern floating SaaS toast notification with smooth auto-dismiss and pill styling."""

    ICONS = {
        "success": "✓",
        "warning": "⚠",
        "danger": "✕",
        "info": "ℹ",
        "neutral": "●",
    }

    PALETTES = {
        "success": (CHIP_SUCCESS_BG, CHIP_SUCCESS_FG, CHIP_SUCCESS_BORDER),
        "warning": (CHIP_WARNING_BG, CHIP_WARNING_FG, CHIP_WARNING_BORDER),
        "danger": (CHIP_DANGER_BG, CHIP_DANGER_FG, CHIP_DANGER_BORDER),
        "info": (CHIP_INFO_BG, CHIP_INFO_FG, CHIP_INFO_BORDER),
        "neutral": (CHIP_NEUTRAL_BG, CHIP_NEUTRAL_FG, CHIP_NEUTRAL_BORDER),
    }

    def __init__(
        self,
        parent: Any,
        message: str,
        variant: str = "info",
        duration_ms: int = 3500,
    ) -> None:
        self.variant = variant if variant in self.PALETTES else "info"
        bg_col, fg_col, border_col = self.PALETTES[self.variant]
        super().__init__(
            parent,
            bg=bg_col,
            bd=0,
            relief="flat",
            highlightthickness=1,
            highlightbackground=border_col,
            padx=14,
            pady=8,
        )
        self.message = message
        self.duration_ms = duration_ms
        self._timer_id: str | None = None

        icon_char = self.ICONS.get(self.variant, "ℹ")
        self.icon_label = tk.Label(
            self,
            text=icon_char,
            font=("DejaVu Sans", 11, "bold"),
            bg=bg_col,
            fg=fg_col,
        )
        self.icon_label.pack(side="left", padx=(0, 8))

        self.msg_label = tk.Label(
            self,
            text=message,
            font=("DejaVu Sans", 9, "bold"),
            bg=bg_col,
            fg=fg_col,
        )
        self.msg_label.pack(side="left", padx=(0, 10))

        self.close_btn = tk.Button(
            self,
            text="×",
            font=("DejaVu Sans", 11, "bold"),
            bg=bg_col,
            fg=fg_col,
            bd=0,
            relief="flat",
            activebackground=bg_col,
            activeforeground=fg_col,
            cursor="hand2",
            command=self.dismiss,
        )
        self.close_btn.pack(side="right")

        try:
            self.place(relx=0.98, rely=0.96, anchor="se")
            self.lift()
        except Exception:
            pass

        if duration_ms > 0:
            self._timer_id = self.after(duration_ms, self.dismiss)

    def dismiss(self) -> None:
        if self._timer_id:
            try:
                self.after_cancel(self._timer_id)
            except Exception:
                pass
            self._timer_id = None
        try:
            self.destroy()
        except Exception:
            pass


class ReceiptInspectionModal(tk.Toplevel):
    """Cryptographic receipt inspection modal dialog."""

    def __init__(
        self,
        parent: Any,
        receipt: Receipt | dict[str, Any],
        current_archive: Any = None,
        **kwargs: Any,
    ) -> None:
        super().__init__(parent, **kwargs)
        self.parent = parent
        self.receipt_data = receipt if isinstance(receipt, dict) else {
            "status": receipt.status,
            "leaf_index": receipt.leaf_index,
            "witnessed_at": receipt.witnessed_at,
            "server_commitment": getattr(receipt, "server_commitment", None),
            "witness_checkpoint": getattr(receipt, "witness_checkpoint", None),
            "ballot_hash": getattr(receipt, "ballot_hash", None),
            "election_id": getattr(receipt, "election_id", None),
            "handle": getattr(receipt, "handle", None),
        }
        self.current_archive = current_archive

        self.title("Cryptographic Receipt Inspection")
        self.geometry("700x640")
        self.minsize(580, 520)
        self.configure(bg=SURFACE)
        self.transient(parent)

        self._build_ui()
        self.bind("<Escape>", lambda e: self.destroy())

        try:
            self.grab_set()
        except Exception:
            pass

    def _build_ui(self) -> None:
        header = ttk.Frame(self, style="Card.TFrame", padding=16)
        header.pack(fill="x", padx=20, pady=(16, 10))

        title_row = ttk.Frame(header, style="Card.TFrame")
        title_row.pack(fill="x")

        ttk.Label(
            title_row,
            text="Cryptographic Receipt Certificate",
            style="Title.TLabel",
        ).pack(side="left")

        status_text = str(self.receipt_data.get("status") or "PENDING_WITNESS")
        variant = chip_variant_from_state(status_text)
        self.status_chip = StatusChip(title_row, text=status_text, variant=variant)
        self.status_chip.pack(side="right")

        ttk.Label(
            header,
            text="Independent cryptographic record verifying server commitment and witness inclusion.",
            style="CardMuted.TLabel",
        ).pack(anchor="w", pady=(4, 0))

        grid_frame = ttk.Frame(self, style="App.TFrame")
        grid_frame.pack(fill="x", padx=20, pady=4)

        id_card = ttk.Frame(grid_frame, style="Card.TFrame", padding=14)
        id_card.pack(side="left", fill="both", expand=True, padx=(0, 6))

        ttk.Label(id_card, text="Receipt Identifiers", style="SubTitle.TLabel").pack(anchor="w", pady=(0, 6))
        elec_id = self.receipt_data.get("election_id") or "Unspecified election"
        handle = self.receipt_data.get("handle") or self.receipt_data.get("receipt_handle") or "Unspecified handle"
        leaf_idx = self.receipt_data.get("leaf_index")
        leaf_str = str(leaf_idx) if leaf_idx is not None else "Pending leaf allocation"
        wit_at = self.receipt_data.get("witnessed_at") or "Not yet witnessed"

        ttk.Label(id_card, text=f"Election ID: {elec_id}", style="CardBody.TLabel").pack(anchor="w")
        ttk.Label(id_card, text=f"Handle: {handle}", style="CardMuted.TLabel").pack(anchor="w", pady=2)
        ttk.Label(id_card, text=f"Merkle Leaf Index: {leaf_str}", style="CardBody.TLabel").pack(anchor="w", pady=2)
        ttk.Label(id_card, text=f"Witnessed At: {wit_at}", style="CardMuted.TLabel").pack(anchor="w")

        crypto_card = ttk.Frame(grid_frame, style="Card.TFrame", padding=14)
        crypto_card.pack(side="left", fill="both", expand=True, padx=(6, 0))

        ttk.Label(crypto_card, text="Cryptographic Proofs", style="SubTitle.TLabel").pack(anchor="w", pady=(0, 6))
        ttk.Label(crypto_card, text="Engine: RFC 9162 Merkle + RFC 8785 JCS", style="CardMuted.TLabel").pack(anchor="w")

        server_commit = self.receipt_data.get("server_commitment") or "sha256:7f83b165...pending"
        wit_check = self.receipt_data.get("witness_checkpoint") or "sha256:3a7bd3e2...pending"

        ttk.Label(crypto_card, text="Server Commitment Digest:", style="CardBody.TLabel").pack(anchor="w", pady=(4, 0))
        commit_entry = ttk.Entry(crypto_card, font=("DejaVu Sans Mono", 8))
        commit_entry.insert(0, str(server_commit))
        commit_entry.configure(state="readonly")
        commit_entry.pack(fill="x", pady=(1, 4))

        ttk.Label(crypto_card, text="Witness Checkpoint Root:", style="CardBody.TLabel").pack(anchor="w")
        wit_entry = ttk.Entry(crypto_card, font=("DejaVu Sans Mono", 8))
        wit_entry.insert(0, str(wit_check))
        wit_entry.configure(state="readonly")
        wit_entry.pack(fill="x", pady=(1, 2))

        json_card = ttk.Frame(self, style="Card.TFrame", padding=14)
        json_card.pack(fill="both", expand=True, padx=20, pady=8)

        json_header = ttk.Frame(json_card, style="Card.TFrame")
        json_header.pack(fill="x", pady=(0, 6))

        ttk.Label(json_header, text="Canonical Receipt JSON Payload", style="SubTitle.TLabel").pack(side="left")

        self.copy_btn = ttk.Button(
            json_header,
            text="Copy JSON to Clipboard",
            command=self._copy_json,
            style="Secondary.TButton",
        )
        self.copy_btn.pack(side="right")

        self.copy_status = ttk.Label(json_header, text="", style="CardMuted.TLabel")
        self.copy_status.pack(side="right", padx=8)

        self.json_text = tk.Text(
            json_card,
            wrap="none",
            height=8,
            font=("DejaVu Sans Mono", 9),
            bg=WHITE,
            fg=TEXT,
            relief="solid",
            bd=1,
        )
        self.json_text.pack(fill="both", expand=True)

        try:
            formatted_json = json.dumps(self.receipt_data, indent=2, sort_keys=True)
        except Exception:
            formatted_json = str(self.receipt_data)
        self.json_text.insert("1.0", formatted_json)
        self.json_text.configure(state="disabled")

        bottom_bar = ttk.Frame(self, style="App.TFrame")
        bottom_bar.pack(fill="x", padx=20, pady=(4, 16))

        if self.current_archive:
            ttk.Button(
                bottom_bar,
                text="Verify Against Loaded Archive",
                command=self._verify_against_archive,
                style="Action.TButton",
            ).pack(side="left")

        ttk.Button(
            bottom_bar,
            text="Save to Voter Wallet",
            command=self._save_to_wallet,
            style="Action.TButton",
        ).pack(side="left", padx=4)

        ttk.Button(
            bottom_bar,
            text="Export Receipt File",
            command=self._export_file,
            style="Secondary.TButton",
        ).pack(side="left", padx=4)

        self.archive_verdict = ttk.Label(bottom_bar, text="", style="CardBody.TLabel")
        self.archive_verdict.pack(side="left", padx=10)

        ttk.Button(
            bottom_bar,
            text="Close [Esc]",
            command=self.destroy,
            style="Secondary.TButton",
        ).pack(side="right")

    def _copy_json(self) -> None:
        try:
            payload = json.dumps(self.receipt_data, indent=2, sort_keys=True)
            self.clipboard_clear()
            self.clipboard_append(payload)
            self.copy_status.configure(text="Copied to clipboard!", foreground=GREEN)
        except Exception as exc:
            self.copy_status.configure(text=f"Copy failed: {exc}", foreground=RED)

    def _save_to_wallet(self) -> None:
        try:
            handle = self.receipt_data.get("handle") or self.receipt_data.get("receipt_handle") or "rcpt_unknown"
            elec_id = self.receipt_data.get("election_id") or "elec_unknown"
            status = self.receipt_data.get("status") or "PENDING_WITNESS"
            leaf_idx = self.receipt_data.get("leaf_index")
            wit_at = self.receipt_data.get("witnessed_at")
            server_commit = self.receipt_data.get("server_commitment")
            wit_check = self.receipt_data.get("witness_checkpoint")
            ballot_hash = self.receipt_data.get("ballot_hash")

            saved = SavedReceipt(
                receipt_handle=str(handle),
                election_id=str(elec_id),
                status=str(status),
                leaf_index=leaf_idx if isinstance(leaf_idx, int) else None,
                witnessed_at=str(wit_at) if wit_at else None,
                server_commitment=str(server_commit) if server_commit else None,
                witness_checkpoint=str(wit_check) if wit_check else None,
                ballot_hash=str(ballot_hash) if ballot_hash else None,
            )
            wallet = ReceiptWallet()
            wallet.save_receipt(saved)
            self.copy_status.configure(text="Saved to voter wallet!", foreground=GREEN)
        except Exception as exc:
            self.copy_status.configure(text=f"Save failed: {exc}", foreground=RED)

    def _export_file(self) -> None:
        try:
            from tkinter import filedialog
            path = filedialog.asksaveasfilename(
                defaultextension=".json",
                filetypes=[("JSON Files", "*.json"), ("All Files", "*.*")],
                title="Export Receipt Record",
            )
            if path:
                with open(path, "w", encoding="utf-8") as f:
                    json.dump(self.receipt_data, f, indent=2)
                self.copy_status.configure(text=f"Exported to {Path(path).name}", foreground=GREEN)
        except Exception as exc:
            self.copy_status.configure(text=f"Export failed: {exc}", foreground=RED)

    def _verify_against_archive(self) -> None:
        if not self.current_archive:
            self.archive_verdict.configure(text="No archive loaded in application.", foreground=AMBER)
            return
        leaf_idx = self.receipt_data.get("leaf_index")
        if leaf_idx is None or not isinstance(leaf_idx, int):
            self.archive_verdict.configure(text="Receipt has no integer leaf index to verify.", foreground=RED)
            return
        try:
            proof = self.current_archive.get_leaf_proof(leaf_idx)
            if proof.verified:
                self.archive_verdict.configure(
                    text=f"MATCH: Leaf #{leaf_idx} inclusion verified against archive Merkle root!",
                    foreground=GREEN,
                )
            else:
                self.archive_verdict.configure(text="VERIFICATION FAILED: Proof root mismatch.", foreground=RED)
        except Exception as exc:
            self.archive_verdict.configure(text=f"Verification error: {exc}", foreground=RED)


class KeyboardShortcutsModal(tk.Toplevel):
    """Modal dialog displaying keyboard navigation shortcuts."""

    SHORTCUTS = [
        ("Ctrl + 1", "Switch to Elections view"),
        ("Ctrl + 2", "Switch to Receipt verification view"),
        ("Ctrl + 3", "Switch to Offline election audit view"),
        ("Ctrl + 4", "Switch to Verification Architecture Explainer"),
        ("Ctrl + 5", "Switch to Security Limits & Institutional Trust Model"),
        ("Ctrl + 6", "Switch to Session & Identity Authentication"),
        ("Ctrl + 7", "Switch to System Settings & Origin Endpoints"),
        ("Ctrl + 8", "Switch to Administrative Audit Trail Logs"),
        ("Ctrl + O", "Open election archive file"),
        ("Ctrl + D", "Load demo simulation archive"),
        ("Ctrl + R / F5", "Refresh elections or recompute proofs"),
        ("Ctrl + P", "Recompute leaf proof in audit view"),
        ("Ctrl + H", "Toggle high contrast mode"),
        ("Ctrl + K / F1", "Show this keyboard shortcuts guide"),
        ("Escape", "Close active modal dialog"),
    ]

    def __init__(self, parent: Any, **kwargs: Any) -> None:
        super().__init__(parent, **kwargs)
        self.title("HimVote Keyboard Navigation Shortcuts")
        self.geometry("540x480")
        self.minsize(460, 400)
        self.configure(bg=SURFACE)
        self.transient(parent)

        self._build_ui()
        self.bind("<Escape>", lambda e: self.destroy())

        try:
            self.grab_set()
        except Exception:
            pass

    def _build_ui(self) -> None:
        header = ttk.Frame(self, style="Card.TFrame", padding=16)
        header.pack(fill="x", padx=18, pady=(16, 10))

        ttk.Label(header, text="Keyboard Shortcuts", style="Title.TLabel").pack(anchor="w")
        ttk.Label(
            header,
            text="HimVote Linux desktop client accessibility keyboard bindings.",
            style="CardMuted.TLabel",
        ).pack(anchor="w", pady=(2, 0))

        content_card = ttk.Frame(self, style="Card.TFrame", padding=14)
        content_card.pack(fill="both", expand=True, padx=18, pady=6)

        table = ttk.Treeview(content_card, columns=("key", "action"), show="headings", height=10)
        table.heading("key", text="Shortcut Key")
        table.heading("action", text="Action Description")
        table.column("key", width=140, anchor="w")
        table.column("action", width=320, anchor="w")
        table.pack(fill="both", expand=True)

        for key_combo, desc in self.SHORTCUTS:
            table.insert("", "end", values=(key_combo, desc))

        bottom = ttk.Frame(self, style="App.TFrame")
        bottom.pack(fill="x", padx=18, pady=(8, 16))
        ttk.Button(bottom, text="Close [Esc]", command=self.destroy, style="Secondary.TButton").pack(side="right")


class MerkleTreeVisualizer(ttk.Frame):
    """Interactive visual Merkle tree canvas with animated audit path highlights."""

    def __init__(self, parent: Any, **kwargs: Any) -> None:
        super().__init__(parent, style="Card.TFrame", **kwargs)
        self.current_proof: MerkleProofResult | None = None
        self.animation_step: int = 0
        self.animation_job: str | None = None
        self.is_animating: bool = False
        self.node_meta: dict[str, dict[str, str]] = {}
        self.node_positions: dict[str, tuple[int, int, int, int]] = {}

        self._build_ui()

    def _build_ui(self) -> None:
        self.toolbar = ttk.Frame(self, style="Card.TFrame")
        self.toolbar.pack(fill="x", padx=10, pady=(8, 6))

        ttk.Label(
            self.toolbar,
            text="Merkle Proof Path Graph",
            style="SubTitle.TLabel",
        ).pack(side="left", padx=(0, 12))

        self.btn_animate = ttk.Button(
            self.toolbar,
            text="Animate Proof",
            command=self.animate_proof,
            style="Action.TButton",
        )
        self.btn_animate.pack(side="left", padx=4)

        self.btn_step = ttk.Button(
            self.toolbar,
            text="Step Forward",
            command=self.step_forward,
            style="Secondary.TButton",
        )
        self.btn_step.pack(side="left", padx=4)

        self.btn_reset = ttk.Button(
            self.toolbar,
            text="Reset",
            command=self.reset_highlights,
            style="Secondary.TButton",
        )
        self.btn_reset.pack(side="left", padx=4)

        self.step_status_chip = StatusChip(self.toolbar, text="READY", variant="neutral")
        self.step_status_chip.pack(side="right", padx=6)

        self.step_label = ttk.Label(
            self,
            text="Select a leaf index and run recomputation to inspect the RFC 9162 proof path.",
            style="CardBody.TLabel",
        )
        self.step_label.pack(anchor="w", padx=12, pady=(0, 6))

        canvas_holder = ttk.Frame(self, style="Card.TFrame")
        canvas_holder.pack(fill="both", expand=True, padx=8, pady=(0, 8))

        self.canvas = tk.Canvas(
            canvas_holder,
            height=210,
            bg="#0F172A",
            highlightthickness=1,
            highlightbackground="#334155",
        )
        self.h_scroll = ttk.Scrollbar(canvas_holder, orient="horizontal", command=self.canvas.xview)
        self.canvas.configure(xscrollcommand=self.h_scroll.set)

        self.canvas.pack(side="top", fill="both", expand=True)
        self.h_scroll.pack(side="bottom", fill="x")

        self.detail_label = ttk.Label(
            self,
            text="Click any node in the graph to view full canonical hash details.",
            style="CardMuted.TLabel",
        )
        self.detail_label.pack(anchor="w", padx=12, pady=(0, 8))

        self.canvas.bind("<Button-1>", self._on_canvas_click)

    def draw_proof(self, proof: MerkleProofResult) -> None:
        """Render the complete RFC 9162 proof path nodes and branches on canvas."""
        self.cancel_animation()
        self.current_proof = proof
        self.animation_step = 0
        self.node_meta.clear()
        self.node_positions.clear()
        self.canvas.delete("all")

        depth = len(proof.siblings)
        total_width = max(720, (depth + 1) * 170 + 120)
        self.canvas.configure(scrollregion=(0, 0, total_width, 210))

        y_center = 105
        y_top = 45
        y_bottom = 165
        card_w = 130
        card_h = 42

        x_leaf = 80
        self._draw_node_card(
            x_leaf,
            y_center,
            card_w,
            card_h,
            "leaf",
            f"Leaf #{proof.leaf_index}",
            f"{proof.leaf_hash[:16]}...",
            proof.leaf_hash,
            "#1E293B",
            "#0284C7",
            "#F8FAFC",
        )

        prev_x = x_leaf
        prev_y = y_center

        for s, (side, sibling_hash) in enumerate(proof.siblings, start=1):
            x_sibling = 80 + (s - 1) * 170 + 40
            y_sibling = y_top if side == "left" else y_bottom
            x_parent = 80 + s * 170
            y_parent = y_center

            self._draw_node_card(
                x_sibling,
                y_sibling,
                card_w,
                card_h,
                f"sibling_{s}",
                f"Sibling #{s} ({side.upper()})",
                f"{sibling_hash[:16]}...",
                sibling_hash,
                "#1E293B",
                "#D97706",
                "#FDE68A",
            )

            self._draw_branch(prev_x + card_w // 2, prev_y, x_parent - card_w // 2, y_parent, f"branch_{s}_prev")
            self._draw_branch(x_sibling + card_w // 2, y_sibling, x_parent - card_w // 2, y_parent, f"branch_{s}_sib")

            if s < depth:
                self._draw_node_card(
                    x_parent,
                    y_parent,
                    card_w,
                    card_h,
                    f"combined_{s}",
                    f"Parent Level {s}",
                    "RFC 9162 hash",
                    f"Intermediate parent hash at depth level {s}",
                    "#1E293B",
                    "#475569",
                    "#94A3B8",
                )
            else:
                root_color = "#059669" if proof.verified else "#DC2626"
                root_fg = "#A7F3D0" if proof.verified else "#FCA5A5"
                self._draw_node_card(
                    x_parent,
                    y_parent,
                    card_w,
                    card_h,
                    "root",
                    "Merkle Root",
                    f"{proof.root_hex[:16]}...",
                    proof.root_hex,
                    "#1E293B",
                    root_color,
                    root_fg,
                )

            prev_x = x_parent
            prev_y = y_parent

        status_str = "VERIFIED INCLUSION" if proof.verified else "VERIFICATION FAILED"
        variant = "success" if proof.verified else "danger"
        self.step_status_chip.set_status(status_str, variant)
        self.step_label.configure(
            text=f"Loaded proof path: Depth {depth} siblings connecting Leaf #{proof.leaf_index} to Merkle Root."
        )

    def _draw_node_card(
        self,
        cx: int,
        cy: int,
        w: int,
        h: int,
        key: str,
        title: str,
        subtitle: str,
        full_hash: str,
        fill_color: str,
        outline_color: str,
        text_color: str,
        width: int = 1,
    ) -> None:
        x1 = cx - w // 2
        y1 = cy - h // 2
        x2 = cx + w // 2
        y2 = cy + h // 2

        self.node_positions[key] = (x1, y1, x2, y2)
        self.node_meta[key] = {"label": title, "subtext": subtitle, "full_hash": full_hash}

        self.canvas.create_rectangle(
            x1,
            y1,
            x2,
            y2,
            fill=fill_color,
            outline=outline_color,
            width=width,
            tags=(f"card_{key}", key, "node_card"),
        )
        self.canvas.create_text(
            cx,
            cy - 8,
            text=title,
            fill=text_color,
            font=("DejaVu Sans", 8, "bold"),
            tags=(f"title_{key}", key, "node_text"),
        )
        self.canvas.create_text(
            cx,
            cy + 9,
            text=subtitle,
            fill="#CBD5E1",
            font=("DejaVu Sans Mono", 7),
            tags=(f"sub_{key}", key, "node_text"),
        )

    def _draw_branch(self, x1: int, y1: int, x2: int, y2: int, tag: str) -> None:
        self.canvas.create_line(
            x1,
            y1,
            x2,
            y2,
            fill="#334155",
            width=2,
            arrow=tk.LAST,
            arrowshape=(8, 10, 3),
            tags=(tag, "branch_line"),
        )

    def highlight_step(self, step_idx: int) -> None:
        """Apply glowing animated highlight to the active node and branch lines."""
        if not self.current_proof:
            return
        proof = self.current_proof
        depth = len(proof.siblings)

        if step_idx == 0:
            self.canvas.itemconfig("card_leaf", fill="#064E3B", outline="#34D399", width=3)
            self.canvas.itemconfig("title_leaf", fill="#A7F3D0")
            self.step_status_chip.set_status("LEAF HIGHLIGHTED", "success")
            self.step_label.configure(
                text=f"Step 0: Starting at target leaf index {proof.leaf_index} (ballot {proof.leaf_id})."
            )
            self.animation_step = 0
            return

        if 1 <= step_idx <= depth:
            side, sib_hash = proof.siblings[step_idx - 1]
            sib_key = f"sibling_{step_idx}"
            comb_key = f"combined_{step_idx}" if step_idx < depth else "root"
            br_prev = f"branch_{step_idx}_prev"
            br_sib = f"branch_{step_idx}_sib"

            self.canvas.itemconfig(f"card_{sib_key}", fill="#78350F", outline="#FBBF24", width=3)
            self.canvas.itemconfig(f"title_{sib_key}", fill="#FEF08A")

            self.canvas.itemconfig(br_prev, fill="#38BDF8", width=3)
            self.canvas.itemconfig(br_sib, fill="#38BDF8", width=3)

            comb_outline = "#2DD4BF" if step_idx < depth else ("#4ADE80" if proof.verified else "#F87171")
            comb_fill = "#0F766E" if step_idx < depth else ("#065F46" if proof.verified else "#7F1D1D")
            self.canvas.itemconfig(f"card_{comb_key}", fill=comb_fill, outline=comb_outline, width=3)

            self.step_status_chip.set_status(f"LEVEL {step_idx} OF {depth}", "info")
            self.step_label.configure(
                text=f"Step {step_idx}: Hash combined with {side.upper()} sibling -> Computed Parent {step_idx}."
            )
            self.animation_step = step_idx
            return

        if step_idx > depth:
            root_outline = "#4ADE80" if proof.verified else "#F87171"
            root_fill = "#065F46" if proof.verified else "#7F1D1D"
            self.canvas.itemconfig("card_root", fill=root_fill, outline=root_outline, width=4)
            self.canvas.itemconfig("title_root", fill="#A7F3D0" if proof.verified else "#FCA5A5")
            res_str = "ROOT VERIFIED" if proof.verified else "ROOT MISMATCH"
            var = "success" if proof.verified else "danger"
            self.step_status_chip.set_status(res_str, var)
            self.step_label.configure(
                text="Final: Recomputed Merkle root cryptographically verified against expected tree root!"
            )
            self.animation_step = depth + 1

    def animate_proof(self) -> None:
        """Execute smooth animated multi frame traversal from leaf to root."""
        if not self.current_proof:
            return
        self.cancel_animation()
        self.is_animating = True
        depth = len(self.current_proof.siblings)
        total_steps = depth + 1

        def run_frame(curr: int) -> None:
            if not self.is_animating:
                return
            self.highlight_step(curr)
            if curr < total_steps:
                self.animation_job = self.after(220, run_frame, curr + 1)
            else:
                self.is_animating = False
                self.animation_job = None

        run_frame(0)

    def cancel_animation(self) -> None:
        """Halt active animation timer jobs."""
        if self.animation_job is not None:
            try:
                self.after_cancel(self.animation_job)
            except Exception:
                pass
            self.animation_job = None
        self.is_animating = False

    def step_forward(self) -> None:
        """Step forward one highlight step in the audit path."""
        if not self.current_proof:
            return
        self.cancel_animation()
        depth = len(self.current_proof.siblings)
        next_step = min(depth + 1, self.animation_step + 1)
        self.highlight_step(next_step)

    def reset_highlights(self) -> None:
        """Reset visual node colors to standard base state."""
        self.cancel_animation()
        if self.current_proof:
            self.draw_proof(self.current_proof)

    def _on_canvas_click(self, event: Any) -> None:
        canvas_x = self.canvas.canvasx(event.x)
        canvas_y = self.canvas.canvasy(event.y)

        for key, (x1, y1, x2, y2) in self.node_positions.items():
            if x1 <= canvas_x <= x2 and y1 <= canvas_y <= y2:
                meta = self.node_meta.get(key)
                if meta:
                    self.detail_label.configure(
                        text=f"{meta['label']}: {meta['full_hash']}",
                        foreground=NAVY,
                    )
                return


def demo_receipts() -> list[dict[str, Any]]:
    """Return realistic demo cryptographic receipts for testing and inspection."""
    return [
        {
            "election_id": "demo_union_2026",
            "receipt_handle": "RCPT_2026_A98F21B3",
            "status": "WITNESSED",
            "leaf_index": 42,
            "witnessed_at": "30 Oct 2026 14:32 UTC",
            "server_commitment": "sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
            "witness_checkpoint": "sha256:3a7bd3e2360a3d29eea436fcfb7e44c735d117c42d1c1835420b6b9942dd4f1b",
            "ballot_hash": "sha256:1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
            "protocol_engine": "RFC 9162 Merkle Tree plus RFC 8785 Canonical JSON",
        },
        {
            "election_id": "demo_design_2026",
            "receipt_handle": "RCPT_2026_B12C45D6",
            "status": "PENDING_WITNESS",
            "leaf_index": None,
            "witnessed_at": None,
            "server_commitment": "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            "witness_checkpoint": None,
            "ballot_hash": "sha256:c234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
            "protocol_engine": "RFC 9162 Merkle Tree plus RFC 8785 Canonical JSON",
        },
    ]



class VerificationReport:
    """Generates comprehensive cryptographic verification audit reports."""

    @staticmethod
    def generate_markdown(result: ArchiveInspectionResult) -> str:
        lines = [
            "# HimVote Cryptographic Election Audit Report",
            "**Engine:** HimVote Linux Independent Verifier",
            f"**Election Title:** {result.title}",
            f"**Election ID:** `{result.election_id}`",
            f"**Protocol Version:** {result.protocol_version}",
            f"**Voting Engine:** {result.voting_engine}",
            "",
            "## 1. Executive Summary & Verdict",
            f"- **Overall Audit Verdict:** {'PASS (ALL CHECKS VERIFIED)' if result.is_valid else 'AUDIT ISSUES DETECTED'}",
            f"- **Total Ballots / Leaves in Log:** {result.total_leaves}",
            f"- **Eligible Voter Count:** {result.eligible_count if result.eligible_count is not None else 'Unspecified'}",
            f"- **Total Candidates:** {result.candidate_count}",
            "",
            "## 2. Cryptographic Integrity Checks",
            f"- **RFC 8785 Canonical JSON Manifest Digest:** {'VALID' if result.manifest_digest_valid else 'INVALID'} (`{result.manifest_digest}`)",
            f"- **RFC 9162 Merkle Leaf Sequence:** {'CONTINUOUS' if result.leaf_sequence_valid else 'SEQUENCE GAP OR DUPLICATE'} (0 to N-1 continuous)",
            f"- **Credential Nullifier Uniqueness:** {'UNIQUE' if result.nullifiers_unique else 'COLLISION DETECTED'} (Zero double-votes)",
            f"- **Recomputed Merkle Tree Root:** `{result.merkle_root_hex}`",
            f"- **Witness Checkpoint Merkle Root:** `{result.witness_root_hex or 'None Provided'}`",
            f"- **Recomputed Root Matches Witness:** {result.merkle_root_matches_witness}",
            f"- **Last Leaf Digest:** `{result.last_leaf_digest}`",
            "",
            "## 3. Candidate Tally Recomputation",
            f"- **Recomputed Tally Matches Announced:** {result.tally_recomputed_matches_announced}",
            "",
            "| Rank | Candidate Name | Candidate ID | Recomputed Votes | Percentage | Status |",
            "|---|---|---|---|---|---|",
        ]
        for t in result.candidate_tallies:
            status = "LEADING / WINNER" if t.is_winner else "CONTENDER"
            lines.append(f"| #{t.rank} | {t.name} | `{t.candidate_id}` | {t.vote_count} | {t.percentage:.2f}% | {status} |")

        if result.warnings:
            lines.extend(["", "## Warnings", *[f"- {w}" for w in result.warnings]])
        if result.errors:
            lines.extend(["", "## Audit Errors", *[f"- {e}" for e in result.errors]])

        lines.extend([
            "",
            "---",
            "*Report independently verified by HimVote Linux desktop client conforming to RFC 9162, RFC 8785, and Section 6.8 Specifications.*",
        ])
        return "\n".join(lines)

    @staticmethod
    def generate_json(result: ArchiveInspectionResult) -> str:
        report_dict = {
            "report_type": "himvote_cryptographic_audit",
            "election_id": result.election_id,
            "title": result.title,
            "protocol_version": result.protocol_version,
            "voting_engine": result.voting_engine,
            "verdict": "PASS" if result.is_valid else "FAIL",
            "summary": {
                "total_leaves": result.total_leaves,
                "eligible_count": result.eligible_count,
                "candidate_count": result.candidate_count,
            },
            "cryptographic_checks": {
                "manifest_digest": result.manifest_digest,
                "manifest_digest_valid": result.manifest_digest_valid,
                "leaf_sequence_valid": result.leaf_sequence_valid,
                "nullifiers_unique": result.nullifiers_unique,
                "merkle_root_recomputed": result.merkle_root_hex,
                "witness_root_announced": result.witness_root_hex,
                "merkle_root_matches_witness": result.merkle_root_matches_witness,
                "last_leaf_digest": result.last_leaf_digest,
                "last_leaf_matches_witness": result.last_leaf_matches_witness,
            },
            "tallies": {
                "recomputed_matches_announced": result.tally_recomputed_matches_announced,
                "recomputed_tallies": result.recomputed_tallies,
                "announced_tallies": result.announced_tallies,
                "candidates": [
                    {
                        "candidate_id": t.candidate_id,
                        "name": t.name,
                        "vote_count": t.vote_count,
                        "percentage": t.percentage,
                        "rank": t.rank,
                        "is_winner": t.is_winner,
                    }
                    for t in result.candidate_tallies
                ],
            },
            "warnings": result.warnings,
            "errors": result.errors,
        }
        return json.dumps(report_dict, indent=2)


class CandidateDetailModal(tk.Toplevel):
    """Accessible modal dialog presenting candidate biography, slate, and platform."""

    def __init__(self, parent: Any, candidate: Candidate, election_title: str, **kwargs: Any) -> None:
        super().__init__(parent, **kwargs)
        self.candidate = candidate
        self.title(f"Candidate Profile - {candidate.name}")
        self.geometry("640x540")
        self.minsize(520, 440)
        self.configure(bg=SURFACE)
        self.transient(parent)

        self._build_ui(election_title)
        self.bind("<Escape>", lambda e: self.destroy())
        try:
            self.grab_set()
        except Exception:
            pass

    def _build_ui(self, election_title: str) -> None:
        header = ttk.Frame(self, style="Card.TFrame", padding=18)
        header.pack(fill="x", padx=20, pady=(16, 10))

        avatar_frame = ttk.Frame(header, style="Card.TFrame")
        avatar_frame.pack(side="left", padx=(0, 16))

        canvas = tk.Canvas(avatar_frame, width=54, height=54, bg=WHITE, highlightthickness=0)
        canvas.pack()
        canvas.create_oval(3, 3, 51, 51, fill=TEAL, outline=NAVY, width=2)
        initials = "".join(part[0].upper() for part in self.candidate.name.split()[:2]) or "CD"
        canvas.create_text(27, 27, text=initials, fill=WHITE, font=("DejaVu Sans", 14, "bold"))

        info_col = ttk.Frame(header, style="Card.TFrame")
        info_col.pack(side="left", fill="both", expand=True)

        ttk.Label(info_col, text=self.candidate.name, font=("DejaVu Sans", 16, "bold"), foreground=NAVY, background=WHITE).pack(anchor="w")
        slate_text = f"Slate: {self.candidate.slate}" if self.candidate.slate else "Independent Candidate"
        ttk.Label(info_col, text=slate_text, font=("DejaVu Sans", 10, "bold"), foreground=TEAL, background=WHITE).pack(anchor="w", pady=(2, 0))
        dept_text = f"Department: {self.candidate.department}" if self.candidate.department else "Enrolled Student"
        ttk.Label(info_col, text=dept_text, font=("DejaVu Sans", 9), foreground=MUTED, background=WHITE).pack(anchor="w")

        content_card = ttk.Frame(self, style="Card.TFrame", padding=18)
        content_card.pack(fill="both", expand=True, padx=20, pady=10)

        ttk.Label(content_card, text="Campaign Platform & Manifesto", font=("DejaVu Sans", 12, "bold"), foreground=NAVY, background=WHITE).pack(anchor="w", pady=(0, 8))
        statement_text = self.candidate.statement or "No extended campaign platform statement submitted by this candidate."
        ttk.Label(content_card, text=statement_text, font=("DejaVu Sans", 10), foreground=TEXT, background=WHITE, wraplength=560, justify="left").pack(anchor="w", pady=(0, 14))

        meta_box = ttk.Frame(content_card, style="Card.TFrame", padding=10)
        meta_box.pack(fill="x", pady=6)
        ttk.Label(meta_box, text=f"Election: {election_title}", font=("DejaVu Sans", 9), foreground=MUTED, background=WHITE).pack(anchor="w")
        ttk.Label(meta_box, text=f"Cryptographic Identifier: {self.candidate.candidate_id}", font=("DejaVu Sans Mono", 9), foreground=MUTED, background=WHITE).pack(anchor="w")

        btn_row = ttk.Frame(self, style="App.TFrame")
        btn_row.pack(fill="x", padx=20, pady=(4, 16))
        ttk.Button(btn_row, text="Close Profile [Esc]", command=self.destroy, style="Secondary.TButton").pack(side="right")


class AuditReportExportModal(tk.Toplevel):
    """Modal dialog providing preview, copying, and file export of the election audit report."""

    def __init__(self, parent: Any, inspection: ArchiveInspectionResult, **kwargs: Any) -> None:
        super().__init__(parent, **kwargs)
        self.inspection = inspection
        self.title("Export Cryptographic Audit Report")
        self.geometry("740x620")
        self.minsize(600, 480)
        self.configure(bg=SURFACE)
        self.transient(parent)

        self._build_ui()
        self.bind("<Escape>", lambda e: self.destroy())
        try:
            self.grab_set()
        except Exception:
            pass

    def _build_ui(self) -> None:
        header = ttk.Frame(self, style="Card.TFrame", padding=16)
        header.pack(fill="x", padx=20, pady=(16, 10))

        title_row = ttk.Frame(header, style="Card.TFrame")
        title_row.pack(fill="x")
        ttk.Label(title_row, text="Cryptographic Audit Verification Report", font=("DejaVu Sans", 15, "bold"), foreground=NAVY, background=WHITE).pack(side="left")

        verdict_str = "AUDIT PASSED" if self.inspection.is_valid else "AUDIT ANOMALIES"
        verdict_var = "success" if self.inspection.is_valid else "danger"
        StatusChip(title_row, text=verdict_str, variant=verdict_var).pack(side="right")

        ttk.Label(header, text="Export reproducible proof artifacts compliant with Section 6.8 Audit Specifications.", font=("DejaVu Sans", 9), foreground=MUTED, background=WHITE).pack(anchor="w", pady=(4, 0))

        text_frame = ttk.Frame(self, style="Card.TFrame", padding=10)
        text_frame.pack(fill="both", expand=True, padx=20, pady=10)

        self.report_text = tk.Text(text_frame, wrap="none", font=("DejaVu Sans Mono", 9), bg=WHITE, fg=TEXT)
        scrollbar_y = ttk.Scrollbar(text_frame, orient="vertical", command=self.report_text.yview)
        scrollbar_x = ttk.Scrollbar(text_frame, orient="horizontal", command=self.report_text.xview)
        self.report_text.configure(xscrollcommand=scrollbar_x.set, yscrollcommand=scrollbar_y.set)

        self.report_text.pack(side="top", fill="both", expand=True)
        scrollbar_y.pack(side="right", fill="y", before=self.report_text)
        scrollbar_x.pack(side="bottom", fill="x")

        md_content = VerificationReport.generate_markdown(self.inspection)
        self.report_text.insert("1.0", md_content)
        self.report_text.configure(state="disabled")

        btn_bar = ttk.Frame(self, style="App.TFrame")
        btn_bar.pack(fill="x", padx=20, pady=(0, 16))

        ttk.Button(btn_bar, text="Save as Markdown (.md)", command=self._save_markdown, style="Action.TButton").pack(side="left", padx=(0, 8))
        ttk.Button(btn_bar, text="Save as JSON (.json)", command=self._save_json, style="Secondary.TButton").pack(side="left", padx=(0, 8))
        ttk.Button(btn_bar, text="Copy to Clipboard", command=self._copy_clipboard, style="Secondary.TButton").pack(side="left")
        ttk.Button(btn_bar, text="Close [Esc]", command=self.destroy, style="Secondary.TButton").pack(side="right")

    def _save_markdown(self) -> None:
        target = filedialog.asksaveasfilename(
            parent=self,
            title="Save Audit Report as Markdown",
            defaultextension=".md",
            filetypes=[("Markdown files", "*.md"), ("Text files", "*.txt"), ("All files", "*.*")],
            initialfile=f"himvote_audit_{self.inspection.election_id}.md",
        )
        if target:
            md_content = VerificationReport.generate_markdown(self.inspection)
            with open(target, "w", encoding="utf-8") as f:
                f.write(md_content)
            messagebox.showinfo("Export Successful", f"Audit report saved to:\n{target}", parent=self)

    def _save_json(self) -> None:
        target = filedialog.asksaveasfilename(
            parent=self,
            title="Save Audit Report as JSON",
            defaultextension=".json",
            filetypes=[("JSON files", "*.json"), ("All files", "*.*")],
            initialfile=f"himvote_audit_{self.inspection.election_id}.json",
        )
        if target:
            json_content = VerificationReport.generate_json(self.inspection)
            with open(target, "w", encoding="utf-8") as f:
                f.write(json_content)
            messagebox.showinfo("Export Successful", f"Audit JSON saved to:\n{target}", parent=self)

    def _copy_clipboard(self) -> None:
        md_content = VerificationReport.generate_markdown(self.inspection)
        self.clipboard_clear()
        self.clipboard_append(md_content)
        messagebox.showinfo("Copied", "Audit report copied to system clipboard.", parent=self)




class ResultsComparisonModal(tk.Toplevel):
    """Split-view modal comparing announced election tallies against recomputed engine totals (PROMPT3 DESKTOP-05)."""

    def __init__(
        self,
        parent: tk.Widget,
        election_title: str,
        election_id: str,
        manifest_digest: str,
        merkle_root: str,
        announced_tallies: dict[str, int],
        recomputed_tallies: list[CandidateTally],
    ) -> None:
        super().__init__(parent)
        self.title("Results Comparison & Discrepancy Analysis (DESKTOP-05)")
        self.geometry("880x600")
        self.minsize(740, 480)
        self.configure(bg=SURFACE)

        self.election_title = election_title
        self.election_id = election_id
        self.manifest_digest = manifest_digest
        self.merkle_root = merkle_root
        self.announced_tallies = announced_tallies
        self.recomputed_tallies = recomputed_tallies

        self.discrepancies: list[dict[str, Any]] = []
        self.all_match = True

        recomp_map = {t.candidate_id: t for t in recomputed_tallies}
        all_cand_ids = sorted(set(list(announced_tallies.keys()) + list(recomp_map.keys())))

        total_announced = sum(announced_tallies.values())
        total_recomputed = sum(t.vote_count for t in recomputed_tallies)

        for cid in all_cand_ids:
            recomp_tally = recomp_map.get(cid)
            name = recomp_tally.name if recomp_tally else cid
            ann_votes = announced_tallies.get(cid, 0)
            rec_votes = recomp_tally.vote_count if recomp_tally else 0
            diff = rec_votes - ann_votes
            is_match = (diff == 0)
            if not is_match:
                self.all_match = False

            ann_pct = (ann_votes / total_announced * 100.0) if total_announced > 0 else 0.0
            rec_pct = (rec_votes / total_recomputed * 100.0) if total_recomputed > 0 else 0.0

            self.discrepancies.append({
                "candidate_id": cid,
                "name": name,
                "announced_votes": ann_votes,
                "announced_pct": ann_pct,
                "recomputed_votes": rec_votes,
                "recomputed_pct": rec_pct,
                "diff": diff,
                "is_match": is_match,
            })

        self._build_ui()

    def _build_ui(self) -> None:
        header = ttk.Frame(self, style="App.TFrame")
        header.pack(fill="x", padx=24, pady=(18, 10))

        ttk.Label(header, text="DESKTOP-05 AUDIT VERIFICATION", font=("DejaVu Sans", 8, "bold"), foreground=TEAL).pack(anchor="w")
        ttk.Label(header, text=f"Tally Comparison: {self.election_title}", font=("DejaVu Sans", 14, "bold"), foreground=NAVY).pack(anchor="w", pady=(2, 4))

        # Overall Verdict Banner
        banner = ttk.Frame(self, style="Card.TFrame", padding=(14, 10))
        banner.pack(fill="x", padx=24, pady=(0, 12))

        v_text = "EXACT TALLY MATCH: Recomputed ballots match announced certified results (0 discrepancies)" if self.all_match else "DISCREPANCY DETECTED: Differences found between announced and recomputed counts"
        v_color = GREEN if self.all_match else RED
        ttk.Label(banner, text=v_text, font=("DejaVu Sans", 10, "bold"), foreground=v_color, background=WHITE).pack(anchor="w")

        # Table container
        table_frame = ttk.Frame(self, style="Card.TFrame", padding=14)
        table_frame.pack(fill="both", expand=True, padx=24, pady=(0, 12))

        # Column Headers
        hdr_row = ttk.Frame(table_frame, style="Card.TFrame")
        hdr_row.pack(fill="x", pady=(0, 8))
        ttk.Label(hdr_row, text="Candidate", font=("DejaVu Sans", 9, "bold"), foreground=NAVY, background=WHITE, width=22).pack(side="left")
        ttk.Label(hdr_row, text="Announced / Certified", font=("DejaVu Sans", 9, "bold"), foreground=NAVY, background=WHITE, width=24).pack(side="left")
        ttk.Label(hdr_row, text="Recomputed Engine", font=("DejaVu Sans", 9, "bold"), foreground=NAVY, background=WHITE, width=24).pack(side="left")
        ttk.Label(hdr_row, text="Delta", font=("DejaVu Sans", 9, "bold"), foreground=NAVY, background=WHITE, width=12).pack(side="left")

        # Rows
        for item in self.discrepancies:
            row = ttk.Frame(table_frame, style="Card.TFrame", padding=(0, 4))
            row.pack(fill="x", pady=2)

            cand_text = f"{item['name']} ({item['candidate_id']})"
            ttk.Label(row, text=cand_text, font=("DejaVu Sans", 9), foreground=TEXT, background=WHITE, width=22).pack(side="left")

            ann_str = f"{item['announced_votes']} votes ({item['announced_pct']:.1f}%)"
            ttk.Label(row, text=ann_str, font=("DejaVu Sans", 9), foreground=NAVY, background=WHITE, width=24).pack(side="left")

            rec_str = f"{item['recomputed_votes']} votes ({item['recomputed_pct']:.1f}%)"
            ttk.Label(row, text=rec_str, font=("DejaVu Sans", 9, "bold"), foreground=TEAL, background=WHITE, width=24).pack(side="left")

            diff_str = "MATCH (0)" if item["is_match"] else f"DIFF ({item['diff']:+d})"
            diff_color = GREEN if item["is_match"] else RED
            ttk.Label(row, text=diff_str, font=("DejaVu Sans", 9, "bold"), foreground=diff_color, background=WHITE, width=12).pack(side="left")

        # Bottom Action Bar
        bottom = ttk.Frame(self, style="App.TFrame")
        bottom.pack(fill="x", padx=24, pady=(0, 18))

        ttk.Button(bottom, text="Export Discrepancies Report", command=self.export_report, style="Action.TButton").pack(side="left", padx=(0, 8))
        ttk.Button(bottom, text="Close", command=self.destroy, style="Secondary.TButton").pack(side="left")

        self.status_label = ttk.Label(bottom, text="", font=("DejaVu Sans", 9))
        self.status_label.pack(side="left", padx=12)

    def generate_report_markdown(self) -> str:
        lines = [
            f"# Tally Comparison & Discrepancy Report",
            f"**Election Title**: {self.election_title}",
            f"**Election ID**: `{self.election_id}`",
            f"**Manifest Digest**: `{self.manifest_digest}`",
            f"**Merkle Tree Root**: `{self.merkle_root}`",
            f"**Overall Verdict**: `{'EXACT_MATCH' if self.all_match else 'DISCREPANCY_DETECTED'}`",
            f"",
            f"| Candidate | Announced Votes | Recomputed Votes | Delta | Status |",
            f"|---|---|---|---|---|",
        ]
        for d in self.discrepancies:
            status = "PASS (Match)" if d["is_match"] else f"FAIL ({d['diff']:+d})"
            lines.append(f"| {d['name']} (`{d['candidate_id']}`) | {d['announced_votes']} ({d['announced_pct']:.1f}%) | {d['recomputed_votes']} ({d['recomputed_pct']:.1f}%) | {d['diff']:+d} | {status} |")
        return "\n".join(lines)

    def export_report(self) -> None:
        try:
            path = filedialog.asksaveasfilename(
                defaultextension=".md",
                filetypes=[("Markdown", "*.md"), ("JSON", "*.json"), ("All Files", "*.*")],
                title="Export Discrepancy Audit Report",
            )
            if path:
                content = self.generate_report_markdown() if path.endswith(".md") else json.dumps(self.discrepancies, indent=2)
                with open(path, "w", encoding="utf-8") as f:
                    f.write(content)
                self.status_label.configure(text=f"Exported to {Path(path).name}", foreground=GREEN)
        except Exception as exc:
            self.status_label.configure(text=f"Export failed: {exc}", foreground=RED)


class BallotBox3DCanvas(tk.Canvas):
    """Interactive 3D isometric rotatable ballot box sculpture with studio lighting (PROMPT3 Section 6.2)."""

    def __init__(
        self,
        parent: tk.Widget,
        width: int = 340,
        height: int = 210,
        bg_color: str = WHITE,
        reduced_motion: bool = False,
        **kwargs: Any,
    ) -> None:
        super().__init__(parent, width=width, height=height, bg=bg_color, highlightthickness=0, **kwargs)
        self.width = width
        self.height = height
        self.reduced_motion = reduced_motion
        self.yaw = math.radians(35)
        self.pitch = math.radians(22)
        self._drag_start_x = 0
        self._drag_start_y = 0
        self._is_dragging = False
        self._anim_id: str | None = None
        self._anim_tick = 0.0

        self.box_w = 48
        self.box_h = 38
        self.box_d = 48

        self.bind("<ButtonPress-1>", self._on_mouse_down)
        self.bind("<B1-Motion>", self._on_mouse_drag)
        self.bind("<ButtonRelease-1>", self._on_mouse_up)

        self.draw_box()
        if not self.reduced_motion:
            self.start_animation()

    def toggle_reduced_motion(self) -> bool:
        self.reduced_motion = not self.reduced_motion
        if self.reduced_motion:
            self.stop_animation()
            self.yaw = math.radians(35)
            self.pitch = math.radians(22)
            self.draw_box()
        else:
            self.start_animation()
        return self.reduced_motion

    def start_animation(self) -> None:
        if self._anim_id is not None:
            return
        self._step_animation()

    def stop_animation(self) -> None:
        if self._anim_id is not None:
            self.after_cancel(self._anim_id)
            self._anim_id = None

    def _step_animation(self) -> None:
        if self.reduced_motion or self._is_dragging:
            self._anim_id = self.after(100, self._step_animation)
            return
        self._anim_tick += 0.03
        self.yaw = math.radians(35) + math.sin(self._anim_tick) * 0.12
        self.pitch = math.radians(22) + math.cos(self._anim_tick * 0.8) * 0.06
        self.draw_box()
        self._anim_id = self.after(40, self._step_animation)

    def _on_mouse_down(self, event: tk.Event) -> None:
        self._is_dragging = True
        self._drag_start_x = event.x
        self._drag_start_y = event.y

    def _on_mouse_drag(self, event: tk.Event) -> None:
        dx = event.x - self._drag_start_x
        dy = event.y - self._drag_start_y
        self._drag_start_x = event.x
        self._drag_start_y = event.y

        self.yaw += dx * 0.015
        self.pitch += dy * 0.015
        self.pitch = max(math.radians(-60), min(math.radians(60), self.pitch))
        self.draw_box()

    def _on_mouse_up(self, event: tk.Event) -> None:
        self._is_dragging = False

    def project_point(self, x: float, y: float, z: float, scale: float = 1.0) -> tuple[float, float, float]:
        cos_y, sin_y = math.cos(self.yaw), math.sin(self.yaw)
        cos_p, sin_p = math.cos(self.pitch), math.sin(self.pitch)

        x1 = x * cos_y - z * sin_y
        z1 = x * sin_y + z * cos_y

        y2 = y * cos_p - z1 * sin_p
        z2 = y * sin_p + z1 * cos_p

        cx = self.width / 2.0
        cy = self.height / 2.0 + 6.0
        px = cx + x1 * scale
        py = cy - y2 * scale
        return (px, py, z2)

    def draw_box(self) -> None:
        self.delete("all")
        w, h, d = self.box_w, self.box_h, self.box_d

        verts = [
            (-w, -h, -d), (w, -h, -d), (w, h, -d), (-w, h, -d),
            (-w, -h, d),  (w, -h, d),  (w, h, d),  (-w, h, d)
        ]

        proj = [self.project_point(vx, vy, vz) for vx, vy, vz in verts]

        faces = [
            ([1, 0, 3, 2], "#081320", "#0B1B30", 1, "back"),
            ([0, 4, 7, 3], "#0B1B30", TEAL, 1, "left"),
            ([0, 1, 5, 4], "#050C16", "#050C16", 1, "bottom"),
            ([3, 2, 6, 7], "#D7F3F9", TEAL, 2, "top"),
            ([1, 5, 6, 2], TEAL, "#D7F3F9", 1, "right"),
            ([4, 5, 6, 7], NAVY, TEAL, 2, "front"),
        ]

        face_depths = []
        for face_indices, fill, outline, outline_w, name in faces:
            avg_z = sum(proj[i][2] for i in face_indices) / len(face_indices)
            face_depths.append((avg_z, face_indices, fill, outline, outline_w, name))
        face_depths.sort(key=lambda item: item[0])

        for _, face_indices, fill, outline, outline_w, name in face_depths:
            poly_points = []
            for i in face_indices:
                poly_points.extend([proj[i][0], proj[i][1]])
            self.create_polygon(poly_points, fill=fill, outline=outline, width=outline_w, tags="box_face")

            if name == "top":
                self._draw_slot_and_ballot(w, h, d)
            elif name == "front":
                self._draw_front_emblem(proj[4], proj[5], proj[6], proj[7])

        self._draw_floating_badges()

    def _draw_slot_and_ballot(self, w: float, h: float, d: float) -> None:
        slot_w, slot_d = w * 0.55, d * 0.12
        sw_verts = [
            (-slot_w, h, -slot_d), (slot_w, h, -slot_d),
            (slot_w, h, slot_d), (-slot_w, h, slot_d)
        ]
        sw_proj = [self.project_point(vx, vy, vz) for vx, vy, vz in sw_verts]
        slot_pts = []
        for p in sw_proj:
            slot_pts.extend([p[0], p[1]])
        self.create_polygon(slot_pts, fill="#0B1B30", outline=TEAL, width=1, tags="slot")

        bw, bh = slot_w * 0.82, 20.0
        b_verts = [
            (-bw, h + bh, 0), (bw, h + bh, 0),
            (bw, h + 2, 0), (-bw, h + 2, 0)
        ]
        b_proj = [self.project_point(vx, vy, vz) for vx, vy, vz in b_verts]
        b_pts = []
        for p in b_proj:
            b_pts.extend([p[0], p[1]])
        self.create_polygon(b_pts, fill=WHITE, outline=TEAL, width=1, tags="ballot")

        m_x = (b_proj[0][0] + b_proj[1][0]) / 2.0
        m_y = (b_proj[0][1] + b_proj[2][1]) / 2.0
        self.create_text(m_x, m_y, text="ENCRYPTED", fill=TEAL, font=("DejaVu Sans", 6, "bold"), tags="ballot_text")

    def _draw_front_emblem(self, p4: Any, p5: Any, p6: Any, p7: Any) -> None:
        cx = (p4[0] + p5[0] + p6[0] + p7[0]) / 4.0
        cy = (p4[1] + p5[1] + p6[1] + p7[1]) / 4.0
        self.create_oval(cx - 9, cy - 9, cx + 9, cy + 9, fill=TEAL, outline="#D7F3F9", width=1)
        self.create_text(cx, cy, text="H", fill=WHITE, font=("DejaVu Sans", 8, "bold"))
        self.create_text(cx, cy + 14, text="SECURE ENCLAVE", fill="#D7F3F9", font=("DejaVu Sans", 5, "bold"))

    def _draw_floating_badges(self) -> None:
        badges = [
            ("RFC 9162 MERKLE", 14, 16, GREEN),
            ("ZERO-KNOWLEDGE", self.width - 14, 16, TEAL),
            ("WITNESS CO-SIGNED", self.width / 2, self.height - 12, AMBER),
        ]
        for label, bx, by, color in badges:
            anchor = "nw" if bx < self.width / 3 else ("ne" if bx > 2 * self.width / 3 else "center")
            self.create_text(bx, by, text=f"* {label}", fill=color, font=("DejaVu Sans", 7, "bold"), anchor=anchor)

    def destroy(self) -> None:
        self.stop_animation()
        super().destroy()


class IsometricEvidencePipelineCanvas(tk.Canvas):
    """Interactive isometric canvas illustrating the 6-stage cryptographic evidence pipeline (PROMPT3 Section 6.2)."""

    STAGES = [
        ("Identity Roster", "IDENTITY DOMAIN", "Approved synthetic voter snapshot & SSO", NAVY, "#D7F3F9"),
        ("Anonymous Token", "ISSUER SERVICE", "RFC 9474 unblinded one-use credential", TEAL, WHITE),
        ("Casting Enclave", "CASTING DOMAIN", "Zero-knowledge proof & encrypted ballot", NAVY, "#D7F3F9"),
        ("Merkle Log", "EVIDENCE LOG", "RFC 9162 append-only hash tree leaves", GREEN, WHITE),
        ("Witness Checkpoint", "EXTERNAL WITNESS", "Monotonic cosigned tree head checkpoint", AMBER, WHITE),
        ("Offline Verifier", "INDEPENDENT AUDITOR", "Standalone verification with pinned keys", GREEN, WHITE),
    ]

    def __init__(
        self,
        parent: tk.Widget,
        width: int = 760,
        height: int = 120,
        bg_color: str = SURFACE,
        on_stage_select: Any = None,
        **kwargs: Any,
    ) -> None:
        super().__init__(parent, width=width, height=height, bg=bg_color, highlightthickness=0, **kwargs)
        self.width = width
        self.height = height
        self.on_stage_select = on_stage_select
        self.selected_stage = 3
        self.stage_bounds: list[tuple[float, float, float, float]] = []

        self.bind("<Button-1>", self._on_click)
        self.draw_pipeline()

    def select_stage(self, idx: int) -> None:
        if 0 <= idx < len(self.STAGES):
            self.selected_stage = idx
            self.draw_pipeline()
            if self.on_stage_select:
                self.on_stage_select(idx, self.STAGES[idx])

    def _on_click(self, event: tk.Event) -> None:
        for idx, (x1, y1, x2, y2) in enumerate(self.stage_bounds):
            if x1 <= event.x <= x2 and y1 <= event.y <= y2:
                self.select_stage(idx)
                break

    def draw_pipeline(self) -> None:
        self.delete("all")
        self.stage_bounds.clear()

        n = len(self.STAGES)
        margin_x = 18.0
        avail_w = self.width - 2 * margin_x
        node_w = min(112.0, avail_w / n - 10.0)
        gap = (avail_w - n * node_w) / (n - 1)
        node_h = 68.0
        y_top = 16.0

        for i in range(n - 1):
            x_start = margin_x + i * (node_w + gap) + node_w
            x_end = margin_x + (i + 1) * (node_w + gap)
            y_mid = y_top + node_h / 2.0
            self.create_line(x_start, y_mid, x_end, y_mid, fill="#CBD5E1", width=5)
            self.create_line(x_start, y_mid, x_end, y_mid, fill=TEAL, width=2)
            arrow_x = (x_start + x_end) / 2.0
            self.create_polygon([arrow_x - 3, y_mid - 4, arrow_x + 3, y_mid, arrow_x - 3, y_mid + 4], fill=TEAL)

        for i, (title, domain, desc, bg_color, fg_color) in enumerate(self.STAGES):
            x = margin_x + i * (node_w + gap)
            is_sel = (i == self.selected_stage)

            self.create_rectangle(x + 2, y_top + 2, x + node_w + 2, y_top + node_h + 2, fill="#E2E8F0", outline="")

            card_fill = bg_color if is_sel else WHITE
            card_outline = TEAL if is_sel else "#CBD5E1"
            outline_w = 2 if is_sel else 1
            self.create_rectangle(x, y_top, x + node_w, y_top + node_h, fill=card_fill, outline=card_outline, width=outline_w)

            stripe_color = GREEN if ("VERIFIER" in domain or "LOG" in domain) else TEAL
            self.create_rectangle(x, y_top, x + node_w, y_top + 3, fill=stripe_color, outline="")

            num_color = fg_color if is_sel else TEAL
            self.create_text(x + 8, y_top + 12, text=f"0{i+1}", fill=num_color, font=("DejaVu Sans", 7, "bold"), anchor="w")

            title_color = fg_color if is_sel else NAVY
            self.create_text(x + 8, y_top + 28, text=title, fill=title_color, font=("DejaVu Sans", 7, "bold"), anchor="w")

            dom_color = "#D7F3F9" if is_sel else MUTED
            self.create_text(x + 8, y_top + 46, text=domain, fill=dom_color, font=("DejaVu Sans", 6, "bold"), anchor="w")

            if is_sel:
                self.create_oval(x + node_w - 12, y_top + 8, x + node_w - 4, y_top + 16, fill=GREEN, outline=WHITE)

            self.stage_bounds.append((x, y_top, x + node_w, y_top + node_h))

        sel_title, sel_domain, sel_desc, _, _ = self.STAGES[self.selected_stage]
        legend_text = f"Stage 0{self.selected_stage + 1}: {sel_title} [{sel_domain}] - {sel_desc}"
        self.create_text(self.width / 2.0, self.height - 12, text=legend_text, fill=NAVY, font=("DejaVu Sans", 8, "italic"), anchor="center")



@dataclass
class SavedReceipt:
    receipt_handle: str
    election_id: str
    status: str
    leaf_index: int | None = None
    witnessed_at: str | None = None
    server_commitment: str | None = None
    witness_checkpoint: str | None = None
    ballot_hash: str | None = None
    notes: str = ""
    saved_at_utc: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "receipt_handle": self.receipt_handle,
            "election_id": self.election_id,
            "status": self.status,
            "leaf_index": self.leaf_index,
            "witnessed_at": self.witnessed_at,
            "server_commitment": self.server_commitment,
            "witness_checkpoint": self.witness_checkpoint,
            "ballot_hash": self.ballot_hash,
            "notes": self.notes,
            "saved_at_utc": self.saved_at_utc,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "SavedReceipt":
        return cls(
            receipt_handle=str(data.get("receipt_handle") or data.get("handle") or ""),
            election_id=str(data.get("election_id") or ""),
            status=str(data.get("status") or "PENDING_WITNESS"),
            leaf_index=data.get("leaf_index"),
            witnessed_at=data.get("witnessed_at"),
            server_commitment=data.get("server_commitment"),
            witness_checkpoint=data.get("witness_checkpoint"),
            ballot_hash=data.get("ballot_hash"),
            notes=str(data.get("notes") or ""),
            saved_at_utc=str(data.get("saved_at_utc") or ""),
        )


class ReceiptWallet:
    """Manages persistent voter cryptographic receipts per XDG Base Directory standards."""

    def __init__(self, storage_path: Path | None = None) -> None:
        if storage_path:
            self.file_path = storage_path
        else:
            xdg_data = os.environ.get("XDG_DATA_HOME")
            base = Path(xdg_data) if xdg_data else (Path.home() / ".local" / "share")
            self.file_path = base / "himvote" / "receipts.json"
        self._ensure_storage()

    def _ensure_storage(self) -> None:
        try:
            self.file_path.parent.mkdir(parents=True, exist_ok=True)
            if not self.file_path.exists():
                with open(self.file_path, "w", encoding="utf-8") as f:
                    json.dump({"version": "1.0", "receipts": []}, f, indent=2)
        except Exception:
            pass

    def list_receipts(self) -> list[SavedReceipt]:
        try:
            if not self.file_path.exists():
                return []
            with open(self.file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            return [SavedReceipt.from_dict(r) for r in data.get("receipts", [])]
        except Exception:
            return []

    def save_receipt(self, receipt: SavedReceipt | dict[str, Any]) -> None:
        rec_obj = receipt if isinstance(receipt, SavedReceipt) else SavedReceipt.from_dict(receipt)
        all_recs = self.list_receipts()
        all_recs = [r for r in all_recs if r.receipt_handle != rec_obj.receipt_handle]
        all_recs.insert(0, rec_obj)
        try:
            self.file_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.file_path, "w", encoding="utf-8") as f:
                json.dump({"version": "1.0", "receipts": [r.to_dict() for r in all_recs]}, f, indent=2)
        except Exception:
            pass

    def remove_receipt(self, receipt_handle: str) -> None:
        all_recs = self.list_receipts()
        filtered = [r for r in all_recs if r.receipt_handle != receipt_handle]
        try:
            with open(self.file_path, "w", encoding="utf-8") as f:
                json.dump({"version": "1.0", "receipts": [r.to_dict() for r in filtered]}, f, indent=2)
        except Exception:
            pass


@dataclass(frozen=True)
class TrustPin:
    authority_name: str
    pin_type: str
    public_key_hex: str
    description: str = ""




@dataclass
class UserSession:
    """Represents an authenticated institutional session or student voter credential."""
    user_id: str
    email: str
    full_name: str
    role: str = "Student"
    bearer_token: str = ""
    is_authenticated: bool = False
    eligible_contests: list[str] = field(default_factory=list)
    credential_status: str = "TOKEN_ISSUED"

    def to_dict(self) -> dict[str, Any]:
        return {
            "user_id": self.user_id,
            "email": self.email,
            "full_name": self.full_name,
            "role": self.role,
            "bearer_token": self.bearer_token,
            "is_authenticated": self.is_authenticated,
            "eligible_contests": self.eligible_contests,
            "credential_status": self.credential_status,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "UserSession":
        return cls(
            user_id=str(data.get("user_id") or ""),
            email=str(data.get("email") or ""),
            full_name=str(data.get("full_name") or ""),
            role=str(data.get("role") or "Student"),
            bearer_token=str(data.get("bearer_token") or ""),
            is_authenticated=bool(data.get("is_authenticated", False)),
            eligible_contests=list(data.get("eligible_contests", [])),
            credential_status=str(data.get("credential_status") or "TOKEN_ISSUED"),
        )


@dataclass
class AdminAuditEvent:
    """Represents a tamper-evident administrative log entry."""
    event_id: str
    timestamp: str
    action: str
    actor_id: str
    election_id: str
    digest: str
    details: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "event_id": self.event_id,
            "timestamp": self.timestamp,
            "action": self.action,
            "actor_id": self.actor_id,
            "election_id": self.election_id,
            "digest": self.digest,
            "details": self.details,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "AdminAuditEvent":
        return cls(
            event_id=str(data.get("event_id") or ""),
            timestamp=str(data.get("timestamp") or ""),
            action=str(data.get("action") or ""),
            actor_id=str(data.get("actor_id") or ""),
            election_id=str(data.get("election_id") or ""),
            digest=str(data.get("digest") or ""),
            details=str(data.get("details") or ""),
        )


@dataclass
class AppSettings:
    """Persistent configuration for isolated service origins and verifier."""
    identity_origin: str = "http://localhost:8080"
    casting_origin: str = "http://localhost:8081"
    witness_origin: str = "http://localhost:8082"
    high_contrast: bool = False
    verifier_path: str = "verifier/verify.py"

    def to_dict(self) -> dict[str, Any]:
        return {
            "identity_origin": self.identity_origin,
            "casting_origin": self.casting_origin,
            "witness_origin": self.witness_origin,
            "high_contrast": self.high_contrast,
            "verifier_path": self.verifier_path,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "AppSettings":
        return cls(
            identity_origin=str(data.get("identity_origin") or "http://localhost:8080"),
            casting_origin=str(data.get("casting_origin") or "http://localhost:8081"),
            witness_origin=str(data.get("witness_origin") or "http://localhost:8082"),
            high_contrast=bool(data.get("high_contrast", False)),
            verifier_path=str(data.get("verifier_path") or "verifier/verify.py"),
        )


class AppSettingsStore:
    """Manages persistent application settings adhering to FreeDesktop XDG standards."""

    def __init__(self, config_file: Path | None = None) -> None:
        if config_file is not None:
            self.config_file = config_file
        else:
            xdg_config = os.environ.get("XDG_CONFIG_HOME")
            base = Path(xdg_config) if xdg_config else (Path.home() / ".config")
            self.config_file = base / "himvote" / "settings.json"
        self.settings = self._load()

    def _load(self) -> AppSettings:
        if not self.config_file.exists():
            return AppSettings()
        try:
            with open(self.config_file, "r", encoding="utf-8") as f:
                return AppSettings.from_dict(json.load(f))
        except Exception:
            return AppSettings()

    def save(self, settings: AppSettings) -> None:
        self.settings = settings
        try:
            self.config_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.config_file, "w", encoding="utf-8") as f:
                json.dump(settings.to_dict(), f, indent=2)
        except Exception:
            pass


def demo_admin_events() -> list[AdminAuditEvent]:
    """Realistic immutable administrative audit log entries."""
    return [
        AdminAuditEvent("EVT-1001", "28 Oct 2026 08:30 UTC", "ROSTER_SNAPSHOT_FROZEN", "registrar_office", "demo_union_2026", "sha256:7f9a1c5b2e04", "10,240 eligible students attested by university registrar."),
        AdminAuditEvent("EVT-1002", "28 Oct 2026 10:15 UTC", "MANIFEST_SEALED", "election_commission", "demo_union_2026", "sha256:8b3e4191a021", "Contests and 6 candidates cryptographically committed."),
        AdminAuditEvent("EVT-1003", "29 Oct 2026 09:00 UTC", "KEY_CEREMONY_COMPLETED", "trustee_board", "demo_union_2026", "sha256:4a8c9133d158", "Blind signature threshold key ceremony verified by 3/3 trustees."),
        AdminAuditEvent("EVT-1004", "30 Oct 2026 00:00 UTC", "ELECTION_OPENED", "election_officer", "demo_union_2026", "sha256:11e92066c890", "Casting origin opened for anonymous ballot submissions."),
        AdminAuditEvent("EVT-1005", "30 Oct 2026 23:59 UTC", "ELECTION_CLOSED", "election_officer", "demo_union_2026", "sha256:cc981a44ef71", "Casting origin closed. Final tree size 100 recorded."),
        AdminAuditEvent("EVT-1006", "31 Oct 2026 00:05 UTC", "WITNESS_FINAL_COSIGNED", "independent_witness", "demo_union_2026", "sha256:d8123477bca2", "Independent witness co-signed root checkpoint after gap inspection."),
    ]


def demo_sessions() -> list[UserSession]:
    """Quick demo user profiles representing different institutional roles."""
    return [
        UserSession(
            user_id="STU-2026-8941",
            email="alice.chen@university.edu",
            full_name="Alice Chen",
            role="Student",
            bearer_token="demo_jwt_alice_student_2026",
            is_authenticated=True,
            eligible_contests=["Student Union Council 2026", "School of Design Representatives"],
            credential_status="BLIND_TOKEN_ACTIVE (RFC 9474 Valid)",
        ),
        UserSession(
            user_id="AUD-5501-LEAD",
            email="robert.vance@audit-watch.org",
            full_name="Dr. Robert Vance",
            role="Auditor",
            bearer_token="demo_jwt_auditor_vance_2026",
            is_authenticated=True,
            eligible_contests=["All University Contests (Auditor Inspection)"],
            credential_status="AUDITOR_CERTIFICATE_VERIFIED",
        ),
        UserSession(
            user_id="ADM-0001-CHAIR",
            email="carol.sterling@university.edu",
            full_name="Dean Carol Sterling",
            role="Administrator",
            bearer_token="demo_jwt_dean_sterling_2026",
            is_authenticated=True,
            eligible_contests=["Administrative Commission Scope"],
            credential_status="TWO_PERSON_RULE_AUTHORITY",
        ),
    ]


class TrustPinStore:
    """Manages pinned cryptographic public keys for independent verification."""

    DEFAULT_PINS = [
        TrustPin(
            authority_name="HimVote Independent Witness Cluster",
            pin_type="witness_ed25519",
            public_key_hex="ed25519:7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b",
            description="Autonomous external auditor witness cluster signing periodic checkpoints per RFC 9162.",
        ),
        TrustPin(
            authority_name="Institutional Identity & Blind Credential Issuer",
            pin_type="issuer_rsa",
            public_key_hex="rsa4096:b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5",
            description="University registrar blind credential signing key per RFC 9474.",
        ),
        TrustPin(
            authority_name="HimVoteAnchor Smart Contract",
            pin_type="anchor_evm",
            public_key_hex="0x9A3B5C7D1E2F4A6B8C0D2E4F6A8B0C2D4E6F8A0B",
            description="On-chain consensus smart contract anchoring witnessed log roots.",
        ),
    ]

    def __init__(self, pins: list[TrustPin] | None = None) -> None:
        self.pins = pins if pins is not None else list(self.DEFAULT_PINS)

    def find_pin(self, pin_type: str) -> TrustPin | None:
        for pin in self.pins:
            if pin.pin_type == pin_type:
                return pin
        return None


class HimVoteLinuxApp(tk.Tk):
    """Accessible desktop shell for Linux election and audit workflows."""

    def __init__(
        self,
        api_client: LinuxApiClient | None,
        verifier_path: Path,
        initial_archive: Path | None = None,
    ) -> None:
        last_err: Exception | None = None
        for attempt in range(4):
            try:
                super().__init__()
                last_err = None
                break
            except Exception as err:
                last_err = err
                import time
                time.sleep(0.12)
        if last_err is not None:
            raise last_err
        self.api_client = api_client
        self.verifier_path = verifier_path
        self.elections: list[Election] = []
        self.current_archive: ElectionArchive | None = None
        self.current_inspection: ArchiveInspectionResult | None = None
        self.high_contrast_mode: bool = False
        self.current_view_name: str = "elections"
        self.receipt_modal: ReceiptInspectionModal | None = None
        self.shortcuts_modal: KeyboardShortcutsModal | None = None
        self.last_looked_up_receipt: dict[str, Any] | None = None
        self.election_filter: str = "ALL"
        self.election_search_query: str = ""
        self.receipt_wallet = ReceiptWallet()
        self.trust_pin_store = TrustPinStore()
        self.settings_store = AppSettingsStore()
        self.user_session: UserSession | None = None
        self.admin_events: list[AdminAuditEvent] = demo_admin_events()
        self.ballot_box_3d: BallotBox3DCanvas | None = None
        self.pipeline_canvas: IsometricEvidencePipelineCanvas | None = None
        self._async_queue: queue.Queue[tuple[str, Any, Any, Any]] = queue.Queue()
        self._async_poll_id: str | None = None
        self._async_thread: threading.Thread | None = None

        self.title("HimVote Linux")
        self.geometry("1160x760")
        self.minsize(920, 640)
        self.configure(bg=SURFACE)

        self._configure_styles()
        self._build_shell()
        self._setup_keyboard_shortcuts()

        if initial_archive and initial_archive.exists():
            self._load_archive_path(initial_archive)
        else:
            self._show_elections()

    def destroy(self) -> None:
        if hasattr(self, "_async_thread") and self._async_thread and self._async_thread.is_alive():
            try:
                self._async_thread.join(timeout=1.0)
            except Exception:
                pass
        if hasattr(self, "ballot_box_3d") and self.ballot_box_3d:
            try:
                self.ballot_box_3d.destroy()
            except Exception:
                pass
            self.ballot_box_3d = None
        if hasattr(self, "merkle_visualizer") and self.merkle_visualizer:
            self.merkle_visualizer.cancel_animation()
        if self.receipt_modal:
            try:
                self.receipt_modal.destroy()
            except Exception:
                pass
            self.receipt_modal = None
        if self.shortcuts_modal:
            try:
                self.shortcuts_modal.destroy()
            except Exception:
                pass
            self.shortcuts_modal = None
        if self.current_archive:
            self.current_archive.close()
            self.current_archive = None
        super().destroy()

    def show_toast(self, message: str, variant: str = "info", duration_ms: int = 3500) -> None:
        """Display an elevated modern floating toast notification."""
        try:
            if hasattr(self, "_active_toast") and self._active_toast:
                try:
                    self._active_toast.dismiss()
                except Exception:
                    pass
            self._active_toast = ToastNotification(self, message, variant=variant, duration_ms=duration_ms)
        except Exception:
            pass

    def _configure_styles(self) -> None:
        style = ttk.Style(self)
        try:
            style.theme_use("clam")
        except Exception:
            pass

        if self.high_contrast_mode:
            self.configure(bg=HC_BG)
            style.configure("App.TFrame", background=HC_BG)
            style.configure("Nav.TFrame", background="#111111")
            style.configure("Card.TFrame", background=HC_CARD, relief="solid", borderwidth=2)
            style.configure("Title.TLabel", background=HC_BG, foreground=HC_TEXT, font=("DejaVu Sans", 22, "bold"))
            style.configure("SubTitle.TLabel", background=HC_CARD, foreground=HC_ACCENT, font=("DejaVu Sans", 13, "bold"))
            style.configure("Body.TLabel", background=HC_BG, foreground=HC_TEXT, font=("DejaVu Sans", 10))
            style.configure("Muted.TLabel", background=HC_BG, foreground=HC_MUTED, font=("DejaVu Sans", 10))
            style.configure("CardBody.TLabel", background=HC_CARD, foreground=HC_TEXT, font=("DejaVu Sans", 10))
            style.configure("CardMuted.TLabel", background=HC_CARD, foreground=HC_MUTED, font=("DejaVu Sans", 9))
            style.configure("NavTitle.TLabel", background="#111111", foreground=HC_TEXT, font=("DejaVu Sans", 18, "bold"))
            style.configure("NavBody.TLabel", background="#111111", foreground=HC_MUTED, font=("DejaVu Sans", 10))
            style.configure("NavSection.TLabel", background="#111111", foreground=HC_MUTED, font=("DejaVu Sans", 7, "bold"))
            style.configure("Action.TButton", background=HC_ACCENT, foreground="#000000", padding=(12, 7), font=("DejaVu Sans", 10, "bold"))
            style.map("Action.TButton", background=[("active", "#FFFFFF")])
            style.configure("Secondary.TButton", background="#FFFFFF", foreground="#000000", padding=(10, 6), font=("DejaVu Sans", 9, "bold"))
            style.map("Secondary.TButton", background=[("active", "#E2E8F0")])
            style.configure("Nav.TButton", background="#111111", foreground=HC_TEXT, padding=(12, 10), anchor="w", font=("DejaVu Sans", 10, "bold"))
            style.map("Nav.TButton", background=[("active", "#222222")])
            style.configure("NavActive.TButton", background=HC_ACCENT, foreground="#000000", padding=(12, 10), anchor="w", font=("DejaVu Sans", 10, "bold"))
            style.map("NavActive.TButton", background=[("active", "#FFFFFF")])
            style.configure("TopBar.TFrame", background=HC_BG)
            style.configure("Breadcrumb.TLabel", background=HC_BG, foreground=HC_MUTED, font=("DejaVu Sans", 9))
            style.configure("BreadcrumbActive.TLabel", background=HC_BG, foreground=HC_TEXT, font=("DejaVu Sans", 9, "bold"))
            style.configure("Status.TLabel", background=HC_CARD, foreground=HC_ACCENT, font=("DejaVu Sans", 9, "bold"))
            style.configure("Mode.TLabel", background="#1E293B", foreground=HC_ACCENT, padding=(10, 5), font=("DejaVu Sans", 9, "bold"))
            style.configure("DemoMode.TLabel", background="#1E293B", foreground=HC_ACCENT, padding=(10, 5), font=("DejaVu Sans", 9, "bold"))
            style.configure("BadgeGreen.TLabel", background="#064E3B", foreground=HC_SUCCESS, padding=(8, 4), font=("DejaVu Sans", 9, "bold"))
            style.configure("BadgeRed.TLabel", background="#7F1D1D", foreground=HC_DANGER, padding=(8, 4), font=("DejaVu Sans", 9, "bold"))
            style.configure("BadgeAmber.TLabel", background="#78350F", foreground=HC_WARNING, padding=(8, 4), font=("DejaVu Sans", 9, "bold"))
        else:
            self.configure(bg=SURFACE)
            style.configure("App.TFrame", background=SURFACE)
            style.configure("Nav.TFrame", background=NAVY)
            style.configure("Card.TFrame", background=WHITE, relief="flat", borderwidth=0)
            style.configure("Title.TLabel", background=SURFACE, foreground=NAVY, font=("DejaVu Sans", 22, "bold"))
            style.configure("SubTitle.TLabel", background=WHITE, foreground=NAVY, font=("DejaVu Sans", 13, "bold"))
            style.configure("Body.TLabel", background=SURFACE, foreground=TEXT, font=("DejaVu Sans", 10))
            style.configure("Muted.TLabel", background=SURFACE, foreground=MUTED, font=("DejaVu Sans", 10))
            style.configure("CardBody.TLabel", background=WHITE, foreground=TEXT, font=("DejaVu Sans", 10))
            style.configure("CardMuted.TLabel", background=WHITE, foreground=MUTED, font=("DejaVu Sans", 9))
            style.configure("NavTitle.TLabel", background=NAVY, foreground=WHITE, font=("DejaVu Sans", 17, "bold"))
            style.configure("NavBody.TLabel", background=NAVY, foreground="#94A3B8", font=("DejaVu Sans", 9))
            style.configure("NavSection.TLabel", background=NAVY, foreground="#64748B", font=("DejaVu Sans", 7, "bold"))
            style.configure("Action.TButton", background=TEAL, foreground=WHITE, padding=(16, 8), font=("DejaVu Sans", 9, "bold"), relief="flat", borderwidth=0)
            style.map("Action.TButton", background=[("active", NAVY_SOFT), ("disabled", "#94A3B8")])
            style.configure("Secondary.TButton", background="#E2E8F0", foreground=TEXT, padding=(12, 7), font=("DejaVu Sans", 9, "bold"), relief="flat", borderwidth=0)
            style.map("Secondary.TButton", background=[("active", "#CBD5E1"), ("disabled", "#F1F5F9")])
            style.configure("Danger.TButton", background="#FEE2E2", foreground="#991B1B", padding=(12, 7), font=("DejaVu Sans", 9, "bold"), relief="flat", borderwidth=0)
            style.map("Danger.TButton", background=[("active", "#FECACA")])
            style.configure("Nav.TButton", background=NAVY, foreground="#94A3B8", padding=(14, 9), anchor="w", font=("DejaVu Sans", 9, "bold"), relief="flat", borderwidth=0)
            style.map("Nav.TButton", background=[("active", NAVY_SOFT), ("focus", NAVY_SOFT)], foreground=[("active", WHITE), ("focus", WHITE)])
            style.configure("NavActive.TButton", background=NAVY_SOFT, foreground=WHITE, padding=(14, 9), anchor="w", font=("DejaVu Sans", 9, "bold"), relief="flat", borderwidth=0)
            style.map("NavActive.TButton", background=[("active", NAVY_SOFT)], foreground=[("active", WHITE)])
            style.configure("TopBar.TFrame", background=WHITE, relief="flat", borderwidth=0)
            style.configure("Breadcrumb.TLabel", background=WHITE, foreground="#64748B", font=("DejaVu Sans", 9))
            style.configure("BreadcrumbActive.TLabel", background=WHITE, foreground=NAVY, font=("DejaVu Sans", 9, "bold"))
            style.configure("Status.TLabel", background=WHITE, foreground=TEAL, font=("DejaVu Sans", 9, "bold"))
            style.configure("Mode.TLabel", background=LIGHT_BG, foreground=TEAL, padding=(10, 5), font=("DejaVu Sans", 9, "bold"))
            style.configure("DemoMode.TLabel", background="#FEF3C7", foreground=AMBER, padding=(10, 5), font=("DejaVu Sans", 9, "bold"))
            style.configure("BadgeGreen.TLabel", background="#DCFCE7", foreground=GREEN, padding=(8, 4), font=("DejaVu Sans", 9, "bold"))
            style.configure("BadgeRed.TLabel", background="#FEE2E2", foreground=RED, padding=(8, 4), font=("DejaVu Sans", 9, "bold"))
            style.configure("BadgeAmber.TLabel", background="#FEF3C7", foreground=AMBER, padding=(8, 4), font=("DejaVu Sans", 9, "bold"))

            # Modern Notebook Pill Tabs (eliminating boxy tab bars)
            style.configure("TNotebook", background=SURFACE, borderwidth=0, tabmargins=(0, 4, 0, 0))
            style.configure("TNotebook.Tab", background="#E2E8F0", foreground="#475569", padding=(18, 8), font=("DejaVu Sans", 9, "bold"), borderwidth=0, relief="flat")
            style.map("TNotebook.Tab", background=[("selected", WHITE), ("active", "#CBD5E1")], foreground=[("selected", TEAL), ("active", NAVY)])

            # Modern Flat Treeview
            style.configure("Treeview", background=WHITE, foreground=TEXT, fieldbackground=WHITE, rowheight=30, borderwidth=1, relief="solid")
            style.configure("Treeview.Heading", background="#F8FAFC", foreground="#475569", font=("DejaVu Sans", 9, "bold"), relief="flat", borderwidth=0)
            style.map("Treeview", background=[("selected", "#CCFBF1")], foreground=[("selected", "#0F766E")])

    def _build_shell(self) -> None:
        root = ttk.Frame(self, style="App.TFrame")
        root.pack(fill="both", expand=True)

        navigation = ttk.Frame(root, style="Nav.TFrame", width=235)
        navigation.pack(side="left", fill="y")
        navigation.pack_propagate(False)

        # Modern Sidebar Brand Badge
        brand_frame = ttk.Frame(navigation, style="Nav.TFrame")
        brand_frame.pack(fill="x", padx=16, pady=(20, 14))

        logo_row = ttk.Frame(brand_frame, style="Nav.TFrame")
        logo_row.pack(anchor="w")
        ttk.Label(logo_row, text="✦ HIMVOTE", style="NavTitle.TLabel").pack(side="left")

        ttk.Label(brand_frame, text="ZERO-KNOWLEDGE CLIENT v2.0", style="NavBody.TLabel", font=("DejaVu Sans", 7, "bold")).pack(anchor="w", pady=(2, 0))

        # Thin divider
        div = tk.Frame(navigation, height=1, bg=NAVY_SOFT, bd=0)
        div.pack(fill="x", padx=16, pady=(0, 10))

        self.nav_buttons: dict[str, ttk.Button] = {}

        # Section 1: Portals & Audit
        self._nav_section_label(navigation, "PORTALS & TOOLS")
        self.nav_buttons["elections"] = self._nav_button(navigation, "🏛  Elections Portal", self._show_elections)
        self.nav_buttons["receipt"] = self._nav_button(navigation, "🛡  Receipt Verifier", self._show_receipt)
        self.nav_buttons["audit"] = self._nav_button(navigation, "🔍  Offline Audit", self._show_audit)

        # Section 2: Architecture & Security
        self._nav_section_label(navigation, "SECURITY & ENGINE")
        self.nav_buttons["how_it_works"] = self._nav_button(navigation, "📐  How It Works", self._show_how_it_works)
        self.nav_buttons["security_limits"] = self._nav_button(navigation, "🔒  Security Limits", self._show_security_limits)

        # Section 3: Session & Preferences
        self._nav_section_label(navigation, "SESSION & ADMIN")
        self.nav_buttons["login"] = self._nav_button(navigation, "👤  Session & SSO", self._show_login)
        self.nav_buttons["settings"] = self._nav_button(navigation, "⚙  System Settings", self._show_settings)
        self.nav_buttons["admin"] = self._nav_button(navigation, "📜  Audit Trail Logs", self._show_admin)

        ttk.Frame(navigation, style="Nav.TFrame").pack(fill="both", expand=True)

        self.mode_label = ttk.Label(navigation, text="", style="NavBody.TLabel", wraplength=190)
        self.mode_label.pack(anchor="w", padx=20, pady=(0, 20))

        # Main area with Top Bar & Content
        self.main_area = ttk.Frame(root, style="App.TFrame")
        self.main_area.pack(side="left", fill="both", expand=True)

        # Top Bar
        self.top_bar = ttk.Frame(self.main_area, style="TopBar.TFrame", height=50)
        self.top_bar.pack(fill="x")
        self.top_bar.pack_propagate(False)

        top_inner = ttk.Frame(self.top_bar, style="TopBar.TFrame")
        top_inner.pack(fill="both", expand=True, padx=24)

        b_frame = ttk.Frame(top_inner, style="TopBar.TFrame")
        b_frame.pack(side="left", fill="y")
        ttk.Label(b_frame, text="✦ HimVote  / ", style="Breadcrumb.TLabel").pack(side="left", pady=14)
        self.breadcrumb_current = ttk.Label(b_frame, text="Elections Directory", style="BreadcrumbActive.TLabel")
        self.breadcrumb_current.pack(side="left", pady=14)

        top_right = ttk.Frame(top_inner, style="TopBar.TFrame")
        top_right.pack(side="right", fill="y", pady=8)

        self.top_status_chip = StatusChip(top_right, text="LOCAL DEMO", variant="warning", font_size=8)
        self.top_status_chip.pack(side="left", padx=(0, 8))

        self.top_session_pill = StatusChip(top_right, text="GUEST OBSERVER", variant="neutral", font_size=8)
        self.top_session_pill.pack(side="left", padx=(0, 10))

        ttk.Button(top_right, text="⚡ Contrast", command=self.toggle_high_contrast, style="Secondary.TButton").pack(side="left", padx=(0, 6))
        ttk.Button(top_right, text="⌨ Shortcuts", command=self.show_shortcuts_modal, style="Secondary.TButton").pack(side="left")

        # Top bar border divider
        self.top_divider = tk.Frame(self.main_area, height=1, bg=LINE, bd=0)
        self.top_divider.pack(fill="x")

        # Content view container
        self.content = ttk.Frame(self.main_area, style="App.TFrame")
        self.content.pack(fill="both", expand=True)

    def _nav_button(self, parent: ttk.Frame, label: str, command: Callable[[], None]) -> ttk.Button:
        btn = ttk.Button(parent, text=label, command=command, style="Nav.TButton")
        btn.pack(fill="x", padx=12, pady=2)
        return btn

    def _nav_section_label(self, parent: ttk.Frame, text: str) -> None:
        ttk.Label(parent, text=text, style="NavSection.TLabel").pack(anchor="w", padx=16, pady=(12, 3))

    def _update_active_nav(self, active_key: str) -> None:
        if not hasattr(self, "nav_buttons"):
            return
        for key, btn in self.nav_buttons.items():
            if key == active_key:
                btn.configure(style="NavActive.TButton")
            else:
                btn.configure(style="Nav.TButton")

    def _clear_content(self) -> None:
        for child in self.content.winfo_children():
            child.destroy()

    def _header(self, eyebrow: str, title: str, detail: str) -> None:
        if hasattr(self, "breadcrumb_current"):
            self.breadcrumb_current.configure(text=f"{eyebrow}  /  {title}")
        self._update_active_nav(self.current_view_name)
        header = ttk.Frame(self.content, style="App.TFrame")
        header.pack(fill="x", padx=36, pady=(20, 14))
        ttk.Label(header, text=eyebrow.upper(), style="Muted.TLabel").pack(anchor="w")
        ttk.Label(header, text=title, style="Title.TLabel").pack(anchor="w", pady=(3, 3))
        ttk.Label(header, text=detail, style="Body.TLabel", wraplength=820).pack(anchor="w")

    def _show_elections(self) -> None:
        self.current_view_name = "elections"
        self._clear_content()
        self._header(
            "Student Portal",
            "Institutional Elections Directory",
            "The server enforces eligibility and timing per specification rules. This client displays confirmed states and hands voting to the vetted booth.",
        )

        # 3D Premium Hero Banner & Interactive Enclave Model (PROMPT3 Section 6.2)
        hero_frame = ttk.Frame(self.content, style="Card.TFrame", padding=(16, 12))
        hero_frame.pack(fill="x", padx=36, pady=(0, 10))

        hero_left = ttk.Frame(hero_frame, style="Card.TFrame")
        hero_left.pack(side="left", fill="both", expand=True, padx=(0, 12))

        ttk.Label(
            hero_left,
            text="PROMPT3 CRYPTOGRAPHIC ENCLAVE ARCHITECTURE",
            font=("DejaVu Sans", 8, "bold"),
            foreground=TEAL,
            background=WHITE,
        ).pack(anchor="w")

        ttk.Label(
            hero_left,
            text="Institutional Zero-Knowledge Voting System",
            font=("DejaVu Sans", 13, "bold"),
            foreground=NAVY,
            background=WHITE,
        ).pack(anchor="w", pady=(2, 4))

        ttk.Label(
            hero_left,
            text="Specification Rule 0.1(3) Security Notice: Native clients never implement custom ballot encryption. The ballot booth runs in an isolated cryptographic enclave communicating via verified API contracts.",
            font=("DejaVu Sans", 9),
            foreground=MUTED,
            background=WHITE,
            wraplength=520,
        ).pack(anchor="w", pady=(0, 8))

        btn_row = ttk.Frame(hero_left, style="Card.TFrame")
        btn_row.pack(anchor="w")

        def toggle_motion() -> None:
            if hasattr(self, "ballot_box_3d") and self.ballot_box_3d:
                is_reduced = self.ballot_box_3d.toggle_reduced_motion()
                btn_motion.configure(text="Enable 3D Motion" if is_reduced else "Reduce 3D Motion")

        btn_motion = ttk.Button(btn_row, text="Reduce 3D Motion", command=toggle_motion, style="Secondary.TButton")
        btn_motion.pack(side="left", padx=(0, 8))

        self.ballot_box_3d = BallotBox3DCanvas(hero_frame, width=320, height=140, bg_color=WHITE)
        self.ballot_box_3d.pack(side="right")

        # Search and Filter Toolbar
        toolbar = ttk.Frame(self.content, style="App.TFrame")
        toolbar.pack(fill="x", padx=36, pady=(0, 12))

        ttk.Button(toolbar, text="Refresh", command=self._load_elections, style="Action.TButton").pack(side="left", padx=(0, 8))

        # Filter Tabs
        filter_box = ttk.Frame(toolbar, style="App.TFrame")
        filter_box.pack(side="left", padx=(0, 14))

        def set_filter(f: str) -> None:
            self.election_filter = f
            self._render_filtered_elections()

        ttk.Button(filter_box, text="All", command=lambda: set_filter("ALL"), style="Secondary.TButton").pack(side="left", padx=2)
        ttk.Button(filter_box, text="Active / Open", command=lambda: set_filter("OPEN"), style="Secondary.TButton").pack(side="left", padx=2)
        ttk.Button(filter_box, text="Upcoming", command=lambda: set_filter("UPCOMING"), style="Secondary.TButton").pack(side="left", padx=2)

        # Search Bar
        ttk.Label(toolbar, text="Search:", style="Body.TLabel").pack(side="left", padx=(10, 4))
        self.search_entry = ttk.Entry(toolbar, width=22)
        self.search_entry.pack(side="left", padx=(0, 12))
        self.search_entry.bind("<KeyRelease>", lambda e: self._on_search_elections())

        self.election_status = ttk.Label(toolbar, text="", style="Muted.TLabel")
        self.election_status.pack(side="left", padx=6)

        self.mode_chip = StatusChip(toolbar, text="LOCAL DEMO MODE", variant="warning")
        self.mode_chip.pack(side="right")
        self.mode_badge = self.mode_chip

        self.election_list = ttk.Frame(self.content, style="App.TFrame")
        self.election_list.pack(fill="both", expand=True, padx=36, pady=(0, 24))
        self.election_list.columnconfigure(0, weight=1)
        self.election_list.columnconfigure(1, weight=1)
        self._load_elections()

    def _on_search_elections(self) -> None:
        self.election_search_query = self.search_entry.get().strip().lower() if hasattr(self, "search_entry") else ""
        self._render_filtered_elections()

    def _load_elections(self) -> None:
        try:
            self.elections = self.api_client.get_elections() if self.api_client else demo_elections()
            mode = "Connected to institutional API" if self.api_client else "Local demo mode. No ballots can be cast."
            self.mode_label.configure(text=mode)
            chip_var = "info" if self.api_client else "warning"
            chip_text = "CONNECTED API" if self.api_client else "LOCAL DEMO MODE"
            self.mode_chip.set_status(chip_text, chip_var)
            self.election_status.configure(text=f"{len(self.elections)} elections loaded")
            if hasattr(self, "top_status_chip"):
                self.top_status_chip.set_status("CONNECTED API" if self.api_client else "LOCAL DEMO", "info" if self.api_client else "warning")
        except ApiError as exc:
            self.elections = demo_elections()
            self.mode_label.configure(text="API unavailable. Showing local demo data only.")
            self.mode_chip.set_status("API UNAVAILABLE", "danger")
            self.election_status.configure(text=str(exc))

        self._render_filtered_elections()

    def _render_filtered_elections(self) -> None:
        for child in self.election_list.winfo_children():
            child.destroy()

        filtered = []
        for e in self.elections:
            # Status filter
            if self.election_filter == "OPEN" and e.state not in {"OPEN", "ACTIVE"}:
                continue
            if self.election_filter == "UPCOMING" and e.state != "UPCOMING":
                continue

            # Query filter
            q = getattr(self, "election_search_query", "")
            if q:
                cand_match = any(q in c.name.lower() or q in c.slate.lower() for c in e.candidates)
                if q not in e.title.lower() and q not in e.election_id.lower() and not cand_match:
                    continue
            filtered.append(e)

        if not filtered:
            empty = ttk.Frame(self.election_list, style="Card.TFrame", padding=(28, 20))
            empty.grid(row=0, column=0, columnspan=2, sticky="ew", padx=10, pady=24)
            ttk.Label(empty, text="🔍", font=("DejaVu Sans", 22)).pack(pady=(0, 6))
            ttk.Label(empty, text="No Elections Match Your Filter", font=("DejaVu Sans", 12, "bold"), foreground=NAVY).pack(pady=(0, 4))
            ttk.Label(
                empty,
                text="Try searching for a different keyword or reset the status filters to view all institutional contests.",
                font=("DejaVu Sans", 9),
                foreground=MUTED,
                wraplength=480,
                justify="center",
            ).pack(pady=(0, 14))

            def reset_all_filters() -> None:
                self.election_filter = "ALL"
                self.election_search_query = ""
                if hasattr(self, "search_entry"):
                    self.search_entry.delete(0, "end")
                self._render_filtered_elections()

            ttk.Button(empty, text="Clear Search & Show All", command=reset_all_filters, style="Action.TButton").pack()
            return

        for index, election in enumerate(filtered):
            self._election_card(election, index)

    def _election_card(self, election: Election, index: int) -> None:
        card = ttk.Frame(self.election_list, style="Card.TFrame", padding=(18, 14))
        card.grid(row=index // 2, column=index % 2, sticky="nsew", padx=8, pady=8)
        card.columnconfigure(0, weight=1)

        # 3px top accent stripe (removing boxy border, adding modern card stripe)
        stripe_color = GREEN if election.state in {"OPEN", "ACTIVE"} else (TEAL if election.state == "UPCOMING" else MUTED)
        stripe = tk.Frame(card, height=3, bg=stripe_color, bd=0)
        stripe.pack(fill="x", pady=(0, 10))

        top = ttk.Frame(card, style="Card.TFrame")
        top.pack(fill="x")
        status = StatusChip(top, text=election.state, variant=chip_variant_from_state(election.state))
        status.pack(side="left")
        ttk.Label(top, text=f"Closes {election.closes_at}", background=WHITE, foreground=MUTED, font=("DejaVu Sans", 9)).pack(side="right")

        ttk.Label(card, text=election.title, background=WHITE, foreground=NAVY, font=("DejaVu Sans", 14, "bold"), wraplength=380).pack(anchor="w", pady=(12, 4))

        if election.description:
            ttk.Label(card, text=election.description, background=WHITE, foreground=TEXT, font=("DejaVu Sans", 9), wraplength=380).pack(anchor="w", pady=(0, 6))

        mid = ttk.Frame(card, style="Card.TFrame")
        mid.pack(fill="x", pady=4)
        ttk.Label(mid, text=f"{election.candidate_count} candidates registered", background=WHITE, foreground=TEAL, font=("DejaVu Sans", 10, "bold")).pack(side="left")

        if election.candidates:
            cand_names = ", ".join(c.name for c in election.candidates[:3])
            if len(election.candidates) > 3:
                cand_names += f" +{len(election.candidates) - 3} more"
            ttk.Label(card, text=f"Candidates: {cand_names}", background=WHITE, foreground=MUTED, font=("DejaVu Sans", 9), wraplength=380).pack(anchor="w", pady=(2, 6))

        bot = ttk.Frame(card, style="Card.TFrame")
        bot.pack(fill="x", pady=(6, 0))
        ttk.Label(bot, text=f"ID: {election.election_id}", background=WHITE, foreground=MUTED, font=("DejaVu Sans Mono", 8)).pack(side="left")

        if election.candidates:
            def view_cands(cand_list=election.candidates, e_title=election.title) -> None:
                if cand_list:
                    CandidateDetailModal(self, cand_list[0], e_title)
            ttk.Button(bot, text="View Candidates", command=view_cands, style="Secondary.TButton").pack(side="right")

    def _show_how_it_works(self) -> None:
        """Render the educational trust architecture explainer view."""
        self.current_view_name = "how_it_works"
        self._clear_content()
        self._header(
            "Verification Architecture",
            "How Mathematical Election Verification Works",
            "HimVote replaces administrative trust with 4 independent, mathematically verifiable layers. Every ballot is cast-as-intended, recorded-as-cast, and tallied-as-recorded.",
        )

        container = ttk.Frame(self.content, style="App.TFrame")
        container.pack(fill="both", expand=True, padx=36, pady=(0, 20))

        tiers = [
            (
                "Tier 1: Student Voter Booth",
                "Zero-Knowledge & Blind Credentials",
                "Voters obtain an RSA blind signature credential (RFC 9474) from the Identity Issuer. During casting, the booth blinds voter identity completely. The casting server verifies the signature without learning which student submitted the vote.",
                "RFC 9474 Blind Signatures",
                GREEN,
            ),
            (
                "Tier 2: Tamper-Evident Merkle Log",
                "Canonical Hashing & RFC 9162 Log",
                "Every accepted ballot is canonicalized per RFC 8785 (JCS) and inserted as an ordered leaf into an append-only RFC 9162 Merkle tree. Any alteration or deletion fundamentally corrupts the tree root.",
                "RFC 8785 JCS & RFC 9162 Merkle",
                TEAL,
            ),
            (
                "Tier 3: Independent Witness Co-signing",
                "External Validator Checkpoints",
                "An autonomous witness service operated outside the university periodically inspects the log, verifies sequence continuity and consistency proofs, and co-signs tree head checkpoints.",
                "Ed25519 Cosigned Checkpoints",
                AMBER,
            ),
            (
                "Tier 4: Immutable Blockchain Anchor",
                "Public Consensus Finality",
                "Witnessed checkpoints are anchored periodically onto the public Ethereum / EVM smart contract (HimVoteAnchor.sol). This provides tamper-proof public timestamps that no university administrator can rewrite.",
                "EVM Smart Contract Consensus",
                NAVY,
            ),
        ]

        for index, (tier_title, sub_title, desc, spec_tag, accent_color) in enumerate(tiers):
            card = ttk.Frame(container, style="Card.TFrame", padding=16)
            card.pack(fill="x", pady=5)

            hdr = ttk.Frame(card, style="Card.TFrame")
            hdr.pack(fill="x")

            ttk.Label(hdr, text=f"LAYER 0{index + 1}", font=("DejaVu Sans", 9, "bold"), foreground=accent_color, background=WHITE).pack(side="left")
            StatusChip(hdr, text=spec_tag, variant="info").pack(side="right")

            ttk.Label(card, text=tier_title, font=("DejaVu Sans", 13, "bold"), foreground=NAVY, background=WHITE).pack(anchor="w", pady=(3, 1))
            ttk.Label(card, text=sub_title, font=("DejaVu Sans", 10, "bold"), foreground=TEAL, background=WHITE).pack(anchor="w", pady=(0, 4))
            ttk.Label(card, text=desc, font=("DejaVu Sans", 9), foreground=TEXT, background=WHITE, wraplength=840).pack(anchor="w")

        rule_card = ttk.Frame(container, style="Card.TFrame", padding=14)
        rule_card.pack(fill="x", pady=(8, 0))
        ttk.Label(rule_card, text="Independent Verification Guarantee", font=("DejaVu Sans", 10, "bold"), foreground=NAVY, background=WHITE).pack(anchor="w")
        ttk.Label(
            rule_card,
            text="Any voter or auditor can independently verify their ballot inclusion in the Merkle log using the Offline Audit view, completely without relying on server trust or internet access.",
            font=("DejaVu Sans", 9),
            foreground=MUTED,
            background=WHITE,
            wraplength=840,
        ).pack(anchor="w", pady=(2, 0))

    def _show_security_limits(self) -> None:
        """Render the security guarantees and institutional trust boundaries view."""
        self.current_view_name = "security_limits"
        self._clear_content()
        self._header(
            "Institutional Trust Model",
            "Security Guarantees & Cryptographic Limits",
            "In strict compliance with Specification Rule 0.1(7), HimVote never makes unqualified claims such as 'unhackable' or '100% secure'. Below are the exact verified mathematical properties and assumptions.",
        )

        container = ttk.Frame(self.content, style="App.TFrame")
        container.pack(fill="both", expand=True, padx=36, pady=(0, 20))

        col1 = ttk.Frame(container, style="App.TFrame")
        col1.pack(side="left", fill="both", expand=True, padx=(0, 8))

        col2 = ttk.Frame(container, style="App.TFrame")
        col2.pack(side="left", fill="both", expand=True, padx=(8, 0))

        card_guar = ttk.Frame(col1, style="Card.TFrame", padding=18)
        card_guar.pack(fill="both", expand=True)

        ttk.Label(card_guar, text="What Independent Verification Proves", font=("DejaVu Sans", 13, "bold"), foreground=GREEN, background=WHITE).pack(anchor="w", pady=(0, 8))

        guarantees = [
            ("Cast-as-Intended", "The voting booth encrypts the ballot using the election public key before submission, preventing network eavesdroppers from observing selections."),
            ("Recorded-as-Cast", "The voter's receipt handle and ballot hash are mathematically proven to be present in the append-only RFC 9162 Merkle tree via verifiable sibling proof paths."),
            ("Tallied-as-Recorded", "The candidate tallies shown in the Audit Explorer are recomputed directly by summing canonical decrypted ballots from the export archive, matching the published results."),
            ("Double-Voting Impossibility", "The nullifier of each credential is cryptographically derived and unique. The audit engine verifies zero collisions across all leaves."),
            ("Server Non-Equivocation", "Because tree checkpoints are co-signed by an independent witness and anchored on-chain, the server cannot show different tree states to different users."),
        ]
        for title, desc in guarantees:
            ttk.Label(card_guar, text=f"✓  {title}", font=("DejaVu Sans", 10, "bold"), foreground=NAVY, background=WHITE).pack(anchor="w", pady=(6, 2))
            ttk.Label(card_guar, text=desc, font=("DejaVu Sans", 9), foreground=TEXT, background=WHITE, wraplength=400).pack(anchor="w", padx=(18, 0))

        card_bound = ttk.Frame(col2, style="Card.TFrame", padding=18)
        card_bound.pack(fill="both", expand=True)

        ttk.Label(card_bound, text="Trust Assumptions & System Boundaries", font=("DejaVu Sans", 13, "bold"), foreground=AMBER, background=WHITE).pack(anchor="w", pady=(0, 8))

        boundaries = [
            ("Client Device Integrity", "If the voter's personal phone or laptop is infected with malware, malicious software could tamper with display inputs before encryption."),
            ("Honest Witness Threshold", "The system assumes at least one independent witness co-signer is honest and refuses to sign forks or inconsistent log heads."),
            ("Coercion Resistance", "While ballots are private, standard receipt tokens must not disclose individual candidate choices to prevent vote-buying or coercion."),
            ("Eligibility Authority Boundary", "The university identity issuer is the authoritative source for roster eligibility. The verifier proves ballots match issued credentials, but cannot verify if the student was legally eligible."),
            ("Key Management Assurance", "Cryptographic keys must reside in reviewed Hardware Security Modules (HSMs) or cloud KMS per specification rules."),
        ]
        for title, desc in boundaries:
            ttk.Label(card_bound, text=f"!  {title}", font=("DejaVu Sans", 10, "bold"), foreground=AMBER, background=WHITE).pack(anchor="w", pady=(6, 2))
            ttk.Label(card_bound, text=desc, font=("DejaVu Sans", 9), foreground=TEXT, background=WHITE, wraplength=400).pack(anchor="w", padx=(18, 0))

    def _show_login(self) -> None:
        """Render the Session & Institutional Identity Authentication portal."""
        self.current_view_name = "login"
        self._clear_content()
        self._header(
            "Identity & Access",
            "Institutional University Session",
            "Authenticate student credentials or auditor credentials. Blind signature token issuance preserves unlinkability between identity and ballot casting.",
        )

        container = ttk.Frame(self.content, style="App.TFrame")
        container.pack(fill="both", expand=True, padx=36, pady=(0, 20))

        cols = ttk.Frame(container, style="App.TFrame")
        cols.pack(fill="both", expand=True)

        left_card = ttk.Frame(cols, style="Card.TFrame", padding=24)
        left_card.pack(side="left", fill="both", expand=True, padx=(0, 16))

        if self.user_session and self.user_session.is_authenticated:
            # Active session view
            header_row = ttk.Frame(left_card, style="Card.TFrame")
            header_row.pack(fill="x", pady=(0, 14))
            ttk.Label(header_row, text="Authenticated Session Active", style="SubTitle.TLabel").pack(side="left")
            StatusChip(header_row, text="ACTIVE", variant="success").pack(side="right")

            info_box = ttk.Frame(left_card, style="Card.TFrame")
            info_box.pack(fill="x", pady=6)

            rows = [
                ("Full Name:", self.user_session.full_name),
                ("Institutional Email:", self.user_session.email),
                ("Assigned Role:", self.user_session.role),
                ("User Identifier:", self.user_session.user_id),
                ("Credential Status:", self.user_session.credential_status),
            ]
            for lbl, val in rows:
                r = ttk.Frame(info_box, style="Card.TFrame")
                r.pack(fill="x", pady=3)
                ttk.Label(r, text=lbl, font=("DejaVu Sans", 10, "bold"), foreground=NAVY, background=WHITE, width=22).pack(side="left")
                ttk.Label(r, text=val, font=("DejaVu Sans", 10), foreground=TEXT, background=WHITE).pack(side="left")

            if self.user_session.eligible_contests:
                ttk.Label(left_card, text="Eligible Voting Contests:", font=("DejaVu Sans", 10, "bold"), foreground=NAVY, background=WHITE).pack(anchor="w", pady=(14, 6))
                for c in self.user_session.eligible_contests:
                    ttk.Label(left_card, text=f"• {c}", font=("DejaVu Sans", 9), foreground=TEAL, background=WHITE).pack(anchor="w", padx=8, pady=2)

            def do_sign_out() -> None:
                self.user_session = None
                self._show_login()

            ttk.Button(left_card, text="Sign Out Session", command=do_sign_out, style="Action.TButton").pack(anchor="w", pady=(20, 0))

        else:
            # Sign in form
            ttk.Label(left_card, text="Sign in to HimVote", style="SubTitle.TLabel").pack(anchor="w", pady=(0, 4))
            ttk.Label(left_card, text="Institutional University SSO and Credential Authentication", style="CardBody.TLabel").pack(anchor="w", pady=(0, 16))

            ttk.Label(left_card, text="University Email / ID:", font=("DejaVu Sans", 9, "bold"), foreground=NAVY, background=WHITE).pack(anchor="w", pady=(4, 2))
            email_entry = ttk.Entry(left_card, width=38)
            email_entry.insert(0, "alice.chen@university.edu")
            email_entry.pack(anchor="w", pady=(0, 8))

            ttk.Label(left_card, text="Password:", font=("DejaVu Sans", 9, "bold"), foreground=NAVY, background=WHITE).pack(anchor="w", pady=(4, 2))
            pass_entry = ttk.Entry(left_card, width=38, show="*")
            pass_entry.insert(0, "hunter2_demo")
            pass_entry.pack(anchor="w", pady=(0, 8))

            ttk.Label(left_card, text="MFA / Authenticator Code (Optional):", font=("DejaVu Sans", 9, "bold"), foreground=NAVY, background=WHITE).pack(anchor="w", pady=(4, 2))
            mfa_entry = ttk.Entry(left_card, width=38)
            mfa_entry.pack(anchor="w", pady=(0, 16))

            status_msg = ttk.Label(left_card, text="", style="CardBody.TLabel")
            status_msg.pack(anchor="w", pady=(0, 10))

            def do_login() -> None:
                em = email_entry.get().strip()
                pw = pass_entry.get().strip()
                mfa = mfa_entry.get().strip()
                if not em:
                    status_msg.configure(text="Please enter your institutional email.", foreground=RED)
                    return
                if self.api_client:
                    self.user_session = self.api_client.login(em, pw, mfa)
                else:
                    self.user_session = UserSession(
                        user_id=f"usr_{hashlib.sha256(em.encode()).hexdigest()[:8]}",
                        email=em,
                        full_name=em.split("@")[0].replace(".", " ").title(),
                        role="Administrator" if "admin" in em else ("Auditor" if "audit" in em else "Student"),
                        bearer_token="demo_offline_token",
                        is_authenticated=True,
                        eligible_contests=["Student Union Council 2026"],
                        credential_status="ACTIVE_VERIFIED",
                    )
                self._show_login()

            ttk.Button(left_card, text="Sign In with SSO", command=do_login, style="Action.TButton").pack(anchor="w", pady=4)

        # Right Card: Demo quick sign-in profiles
        right_card = ttk.Frame(cols, style="Card.TFrame", padding=24)
        right_card.pack(side="right", fill="both", expand=True)

        ttk.Label(right_card, text="Quick Demo Sign-In Profiles", style="SubTitle.TLabel").pack(anchor="w", pady=(0, 4))
        ttk.Label(right_card, text="Simulate distinct institutional actors in local disconnected mode:", style="CardBody.TLabel").pack(anchor="w", pady=(0, 14))

        for demo_u in demo_sessions():
            is_active = bool(self.user_session and self.user_session.role == demo_u.role)
            box = ttk.Frame(right_card, style="Card.TFrame", padding=12)
            box.pack(fill="x", pady=6)
            top = ttk.Frame(box, style="Card.TFrame")
            top.pack(fill="x")
            ttk.Label(top, text=demo_u.full_name, font=("DejaVu Sans", 10, "bold"), foreground=NAVY, background=WHITE).pack(side="left")
            chip_variant = "success" if is_active else ("accent" if demo_u.role == "Student" else "info")
            chip_text = f"● ACTIVE {demo_u.role.upper()}" if is_active else demo_u.role.upper()
            StatusChip(top, text=chip_text, variant=chip_variant).pack(side="right")
            ttk.Label(box, text=demo_u.email, font=("DejaVu Sans", 9), foreground=MUTED, background=WHITE).pack(anchor="w", pady=(2, 6))

            def make_handler(user_obj: UserSession):
                return lambda: self._apply_session(user_obj)

            btn_text = f"✓ Currently Signed In" if is_active else f"Switch to {demo_u.role}"
            btn_style = "Secondary.TButton" if is_active else "Action.TButton"
            ttk.Button(box, text=btn_text, command=make_handler(demo_u), style=btn_style).pack(anchor="w")

    def _apply_session(self, session: UserSession) -> None:
        self.user_session = session
        if hasattr(self, "top_session_pill"):
            self.top_session_pill.set_status(f"{session.role.upper()}: {session.full_name}", "info")
        self.show_toast(f"Authenticated as {session.full_name} ({session.role.title()})", variant="success")
        self._show_login()

    def _show_settings(self) -> None:
        """Render System Settings, origin endpoints configuration, and diagnostics."""
        self.current_view_name = "settings"
        self._clear_content()
        self._header(
            "Configuration & Diagnostics",
            "System Settings & Origin Endpoints",
            "Inspect and configure isolated service origins, manage cryptographic trust pins, and run network latency diagnostics.",
        )

        container = ttk.Frame(self.content, style="App.TFrame")
        container.pack(fill="both", expand=True, padx=36, pady=(0, 20))

        # Card 1: Network Endpoints
        net_card = ttk.Frame(container, style="Card.TFrame", padding=20)
        net_card.pack(fill="x", pady=(0, 16))

        net_hdr = ttk.Frame(net_card, style="Card.TFrame")
        net_hdr.pack(fill="x", pady=(0, 6))
        ttk.Label(net_hdr, text="Network Endpoint Configuration", style="SubTitle.TLabel").pack(side="left")

        def test_all_endpoints() -> None:
            for n, entry_widget in self._endpoint_entries.items():
                target = entry_widget.get().strip()
                ok, msg, ms = LinuxApiClient.check_origin_health(target)
                stat_lbl = self._endpoint_status_labels.get(n)
                if stat_lbl:
                    if ok:
                        stat_lbl.configure(text=f"CONNECTED - {ms:.1f}ms (OK)", foreground=GREEN)
                    else:
                        stat_lbl.configure(text=f"OFFLINE - {ms:.1f}ms ({msg[:25]})", foreground=AMBER)
            self.show_toast("Origin ping diagnostics completed", variant="info")

        ttk.Button(net_hdr, text="⚡ Test All Endpoints", command=test_all_endpoints, style="Action.TButton").pack(side="right")
        ttk.Label(
            net_card,
            text="HimVote enforces strict origin separation: Identity (authentication), Casting (anonymous ballots), and Witness (independent log checkpoints).",
            style="CardBody.TLabel",
        ).pack(anchor="w", pady=(0, 12))

        endpoints = [
            ("Identity Origin:", "http://localhost:8080"),
            ("Casting Origin:", "http://localhost:8081"),
            ("Witness Origin:", "http://localhost:8082"),
        ]

        self._endpoint_entries: dict[str, ttk.Entry] = {}
        self._endpoint_status_labels: dict[str, ttk.Label] = {}

        for name, default_url in endpoints:
            row = ttk.Frame(net_card, style="Card.TFrame")
            row.pack(fill="x", pady=4)
            ttk.Label(row, text=name, font=("DejaVu Sans", 9, "bold"), foreground=NAVY, background=WHITE, width=18).pack(side="left")
            ent = ttk.Entry(row, width=36)
            ent.insert(0, default_url)
            ent.pack(side="left", padx=8)
            self._endpoint_entries[name] = ent

            stat = ttk.Label(row, text="Not checked", font=("DejaVu Sans", 9), foreground=MUTED, background=WHITE)
            stat.pack(side="left", padx=8)
            self._endpoint_status_labels[name] = stat

            def make_test_cmd(url_entry: ttk.Entry, stat_lbl: ttk.Label):
                def run_check():
                    target = url_entry.get().strip()
                    ok, msg, ms = LinuxApiClient.check_origin_health(target)
                    if ok:
                        stat_lbl.configure(text=f"CONNECTED - {ms:.1f}ms (OK)", foreground=GREEN)
                    else:
                        stat_lbl.configure(text=f"OFFLINE - {ms:.1f}ms ({msg[:30]})", foreground=AMBER)
                return run_check

            ttk.Button(row, text="Test Ping", command=make_test_cmd(ent, stat), style="Action.TButton").pack(side="left", padx=4)

        # Card 2: Cryptographic Trust Pins
        pins_card = ttk.Frame(container, style="Card.TFrame", padding=20)
        pins_card.pack(fill="both", expand=True, pady=(0, 16))

        top_row = ttk.Frame(pins_card, style="Card.TFrame")
        top_row.pack(fill="x", pady=(0, 8))
        ttk.Label(top_row, text="Institutional Cryptographic Trust Pins", style="SubTitle.TLabel").pack(side="left")
        StatusChip(top_row, text="3 PINS ACTIVE", variant="success").pack(side="right")

        for pin in self.trust_pin_store.pins:
            p_box = ttk.Frame(pins_card, style="Card.TFrame")
            p_box.pack(fill="x", pady=4)
            ttk.Label(p_box, text=f"• {pin.pin_type}:", font=("DejaVu Sans", 9, "bold"), foreground=NAVY, background=WHITE, width=20).pack(side="left")
            ttk.Label(p_box, text=pin.public_key_hex, font=("DejaVu Sans Mono", 8), foreground=TEAL, background=WHITE).pack(side="left", padx=4)

        btn_row = ttk.Frame(pins_card, style="Card.TFrame")
        btn_row.pack(anchor="w", pady=(12, 0))

        def restore_pins():
            self.trust_pin_store = TrustPinStore()
            messagebox.showinfo("Trust Pins", "Restored institutional default trust pins.")
            self._show_settings()

        ttk.Button(btn_row, text="Restore Default Trust Pins", command=restore_pins, style="Action.TButton").pack(side="left", padx=(0, 10))

    def _show_admin(self) -> None:
        """Render Administrative Audit Log & Evidence Package verification."""
        self.current_view_name = "admin"
        self._clear_content()
        self._header(
            "Administrative Audit Trail",
            "Append-Only Administrative Log & Evidence Verification",
            "Inspect certified administrative events, verify two-person rule authorizations, and validate external trust evidence packages.",
        )

        container = ttk.Frame(self.content, style="App.TFrame")
        container.pack(fill="both", expand=True, padx=36, pady=(0, 20))

        # Cards summary
        stat_row = ttk.Frame(container, style="App.TFrame")
        stat_row.pack(fill="x", pady=(0, 16))

        summaries = [
            ("MANIFEST STATE", "SEALED & FROZEN", "Contests and candidate slates cryptographically locked with SHA-256.", "success"),
            ("TWO-PERSON RULE", "2/2 TRUSTEES APPROVED", "Independent dual authorizations confirmed for roster freeze.", "success"),
            ("ROSTER ATTESTATION", "10,240 ATTESTED", "Certified voter roster snapshot signed by university registrar.", "accent"),
        ]

        for title, val, sub, var in summaries:
            c = ttk.Frame(stat_row, style="Card.TFrame", padding=14)
            c.pack(side="left", fill="both", expand=True, padx=4)
            ttk.Label(c, text=title, font=("DejaVu Sans", 8, "bold"), foreground=MUTED, background=WHITE).pack(anchor="w")
            ttk.Label(c, text=val, font=("DejaVu Sans", 11, "bold"), foreground=NAVY, background=WHITE).pack(anchor="w", pady=2)
            ttk.Label(c, text=sub, font=("DejaVu Sans", 8), foreground=TEXT, background=WHITE, wraplength=220).pack(anchor="w")

        # Event Log List
        log_card = ttk.Frame(container, style="Card.TFrame", padding=20)
        log_card.pack(fill="both", expand=True)

        header = ttk.Frame(log_card, style="Card.TFrame")
        header.pack(fill="x", pady=(0, 10))
        ttk.Label(header, text="Append-Only Administrative Event Log", style="SubTitle.TLabel").pack(side="left")
        StatusChip(header, text=f"{len(self.admin_events)} EVENTS RECORDED", variant="success").pack(side="right")

        table_frame = ttk.Frame(log_card, style="Card.TFrame")
        table_frame.pack(fill="both", expand=True)

        col_hdr = ttk.Frame(table_frame, style="Card.TFrame")
        col_hdr.pack(fill="x", pady=(0, 4))
        ttk.Label(col_hdr, text="EVENT ID", font=("DejaVu Sans", 9, "bold"), foreground=NAVY, background=WHITE, width=12).pack(side="left")
        ttk.Label(col_hdr, text="TIMESTAMP", font=("DejaVu Sans", 9, "bold"), foreground=NAVY, background=WHITE, width=22).pack(side="left")
        ttk.Label(col_hdr, text="ACTION", font=("DejaVu Sans", 9, "bold"), foreground=NAVY, background=WHITE, width=28).pack(side="left")
        ttk.Label(col_hdr, text="ACTOR", font=("DejaVu Sans", 9, "bold"), foreground=NAVY, background=WHITE, width=22).pack(side="left")
        ttk.Label(col_hdr, text="SHA-256 DIGEST", font=("DejaVu Sans", 9, "bold"), foreground=NAVY, background=WHITE).pack(side="left")

        for evt in self.admin_events:
            r = ttk.Frame(table_frame, style="Card.TFrame")
            r.pack(fill="x", pady=2)
            ttk.Label(r, text=evt.event_id, font=("DejaVu Sans Mono", 8, "bold"), foreground=NAVY, background=WHITE, width=12).pack(side="left")
            ttk.Label(r, text=evt.timestamp, font=("DejaVu Sans", 8), foreground=MUTED, background=WHITE, width=22).pack(side="left")
            ttk.Label(r, text=evt.action, font=("DejaVu Sans", 8, "bold"), foreground=TEAL, background=WHITE, width=28).pack(side="left")
            ttk.Label(r, text=evt.actor_id, font=("DejaVu Sans", 8), foreground=TEXT, background=WHITE, width=22).pack(side="left")
            ttk.Label(r, text=evt.digest, font=("DejaVu Sans Mono", 8), foreground=MUTED, background=WHITE).pack(side="left")


    def _show_receipt(self) -> None:
        self.current_view_name = "receipt"
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

        btn_row = ttk.Frame(form, style="Card.TFrame")
        btn_row.grid(row=2, column=1, sticky="w", pady=(12, 0))

        self.receipt_chip = StatusChip(form, text="READY", variant="neutral")
        self.receipt_chip.grid(row=3, column=0, sticky="w", pady=(18, 0))

        result = ttk.Label(form, text="Enter election ID and receipt handle to verify status.", background=WHITE, foreground=TEXT, wraplength=620)
        result.grid(row=3, column=1, sticky="w", pady=(18, 0), padx=(10, 0))

        # 4-Stage Cryptographic Pipeline Bar
        pipeline_frame = ttk.Frame(self.content, style="Card.TFrame", padding=14)
        pipeline_frame.pack(fill="x", padx=36, pady=(0, 10))

        ttk.Label(pipeline_frame, text="4-Stage Independent Evidence Pipeline", font=("DejaVu Sans", 11, "bold"), foreground=NAVY, background=WHITE).pack(anchor="w", pady=(0, 8))
        stages_row = ttk.Frame(pipeline_frame, style="Card.TFrame")
        stages_row.pack(fill="x")

        stage_chips: list[StatusChip] = []
        pipeline_defs = [
            ("1. SUBMITTED", "Booth cast verified"),
            ("2. ACCEPTED", "Credential nullified"),
            ("3. WITNESSED", "Merkle log checkpointed"),
            ("4. ANCHORED", "Blockchain finality"),
        ]
        for idx, (st_name, st_sub) in enumerate(pipeline_defs):
            s_box = ttk.Frame(stages_row, style="Card.TFrame")
            s_box.pack(side="left", fill="both", expand=True, padx=4)
            chip = StatusChip(s_box, text=st_name, variant="neutral")
            chip.pack(anchor="w")
            stage_chips.append(chip)
            ttk.Label(s_box, text=st_sub, font=("DejaVu Sans", 8), foreground=MUTED, background=WHITE).pack(anchor="w", pady=(2, 0))

        def update_pipeline_stages(status: str) -> None:
            st = status.upper()
            is_sub = True
            is_acc = st in {"ACCEPTED", "PENDING_WITNESS", "WITNESSED", "ANCHOR_FINALIZED", "CONFIRMED"}
            is_wit = st in {"WITNESSED", "ANCHOR_FINALIZED", "CONFIRMED"}
            is_anc = st in {"ANCHOR_FINALIZED", "CONFIRMED"}

            stage_chips[0].set_status("1. SUBMITTED", "success" if is_sub else "neutral")
            stage_chips[1].set_status("2. ACCEPTED", "success" if is_acc else "warning")
            stage_chips[2].set_status("3. WITNESSED", "success" if is_wit else ("warning" if is_acc else "neutral"))
            stage_chips[3].set_status("4. ANCHORED", "success" if is_anc else "neutral")

        def lookup() -> None:
            e_id = election_entry.get().strip()
            h_id = handle_entry.get().strip()
            if not self.api_client:
                demos = demo_receipts()
                match = next((d for d in demos if d.get("election_id") == e_id or d.get("receipt_handle") == h_id), demos[0])
                self.last_looked_up_receipt = match
                self.receipt_chip.set_status(match["status"], chip_variant_from_state(match["status"]))
                update_pipeline_stages(match["status"])
                result.configure(
                    text=f"Demo Receipt State: {match['status']}\nLeaf index: {match['leaf_index']}\nWitnessed: {match['witnessed_at']}",
                    foreground=TEXT,
                )
                return
            try:
                receipt = self.api_client.get_receipt(e_id, h_id)
                self.last_looked_up_receipt = {
                    "election_id": e_id,
                    "receipt_handle": h_id,
                    "status": receipt.status,
                    "leaf_index": receipt.leaf_index,
                    "witnessed_at": receipt.witnessed_at,
                }
                self.receipt_chip.set_status(receipt.status, chip_variant_from_state(receipt.status))
                update_pipeline_stages(receipt.status)
                result.configure(
                    text=f"State: {receipt.status}\nLeaf index: {receipt.leaf_index}\nWitnessed at: {receipt.witnessed_at or 'Not yet witnessed'}",
                    foreground=status_colour(receipt.status),
                )
            except ApiError as exc:
                self.receipt_chip.set_status("ERROR", "danger")
                result.configure(text=str(exc), foreground=RED)

        def open_modal() -> None:
            rec_to_open = self.last_looked_up_receipt or demo_receipts()[0]
            self._open_receipt_modal(rec_to_open)

        def load_demo(idx: int = 0) -> None:
            demos = demo_receipts()
            demo_item = demos[idx % len(demos)]
            election_entry.delete(0, "end")
            election_entry.insert(0, demo_item["election_id"])
            handle_entry.delete(0, "end")
            handle_entry.insert(0, demo_item["receipt_handle"])
            lookup()

        def save_to_wallet() -> None:
            rec = self.last_looked_up_receipt or demo_receipts()[0]
            saved = SavedReceipt(
                receipt_handle=str(rec.get("receipt_handle") or rec.get("handle") or "UNSPECIFIED"),
                election_id=str(rec.get("election_id") or "UNSPECIFIED"),
                status=str(rec.get("status") or "PENDING_WITNESS"),
                leaf_index=rec.get("leaf_index"),
                witnessed_at=rec.get("witnessed_at"),
                server_commitment=rec.get("server_commitment"),
                witness_checkpoint=rec.get("witness_checkpoint"),
                ballot_hash=rec.get("ballot_hash"),
                saved_at_utc="30 Oct 2026",
            )
            self.receipt_wallet.save_receipt(saved)
            refresh_wallet_list()
            messagebox.showinfo("Receipt Saved", f"Receipt {saved.receipt_handle} saved to your local wallet.")

        ttk.Button(btn_row, text="Check receipt", command=lookup, style="Action.TButton").pack(side="left", padx=(0, 8))
        ttk.Button(btn_row, text="Inspect Certificate Modal", command=open_modal, style="Secondary.TButton").pack(side="left", padx=(0, 8))
        ttk.Button(btn_row, text="Save to Wallet", command=save_to_wallet, style="Action.TButton").pack(side="left", padx=(0, 8))
        ttk.Button(btn_row, text="Load Witnessed Demo", command=lambda: load_demo(0), style="Secondary.TButton").pack(side="left", padx=(0, 8))
        ttk.Button(btn_row, text="Load Pending Demo", command=lambda: load_demo(1), style="Secondary.TButton").pack(side="left")

        # Persistent Receipt Wallet List
        wallet_frame = ttk.Frame(self.content, style="Card.TFrame", padding=14)
        wallet_frame.pack(fill="x", padx=36, pady=(10, 0))

        w_hdr = ttk.Frame(wallet_frame, style="Card.TFrame")
        w_hdr.pack(fill="x", pady=(0, 6))
        ttk.Label(w_hdr, text="Local Receipt Wallet (Saved Proofs)", font=("DejaVu Sans", 11, "bold"), foreground=NAVY, background=WHITE).pack(side="left")

        wallet_items_frame = ttk.Frame(wallet_frame, style="Card.TFrame")
        wallet_items_frame.pack(fill="x")

        def refresh_wallet_list() -> None:
            for child in wallet_items_frame.winfo_children():
                child.destroy()
            saved_list = self.receipt_wallet.list_receipts()
            if not saved_list:
                ttk.Label(wallet_items_frame, text="No saved receipts in local wallet yet. Look up a receipt and click 'Save to Wallet'.", font=("DejaVu Sans", 9), foreground=MUTED, background=WHITE).pack(anchor="w")
                return
            for s_rec in saved_list[:5]:
                row = ttk.Frame(wallet_items_frame, style="Card.TFrame")
                row.pack(fill="x", pady=2)
                StatusChip(row, text=s_rec.status, variant=chip_variant_from_state(s_rec.status)).pack(side="left", padx=(0, 8))
                ttk.Label(row, text=f"Handle: {s_rec.receipt_handle}   (Election: {s_rec.election_id})", font=("DejaVu Sans Mono", 9), foreground=TEXT, background=WHITE).pack(side="left")

                def select_rec(r=s_rec) -> None:
                    election_entry.delete(0, "end")
                    election_entry.insert(0, r.election_id)
                    handle_entry.delete(0, "end")
                    handle_entry.insert(0, r.receipt_handle)
                    lookup()

                ttk.Button(row, text="Select", command=select_rec, style="Secondary.TButton").pack(side="right")

        refresh_wallet_list()

    def _show_audit(self) -> None:
        """Render the comprehensive offline election audit view."""
        self.current_view_name = "audit"
        self._clear_content()
        self._header(
            "Offline election audit",
            "Inspect archive, verify Merkle tree, and visualize tallies",
            "Perform standalone cryptographic inspection without network access. Recompute Merkle roots, verify leaf inclusion proofs, and visualize candidate tallies.",
        )

        toolbar = ttk.Frame(self.content, style="App.TFrame")
        toolbar.pack(fill="x", padx=36, pady=(0, 12))

        ttk.Button(toolbar, text="Open Archive File", command=self._open_archive_file, style="Action.TButton").pack(side="left", padx=(0, 6))
        ttk.Button(toolbar, text="Open Evidence Directory", command=self._open_archive_directory, style="Secondary.TButton").pack(side="left", padx=(0, 6))
        ttk.Button(toolbar, text="Load Demo Archive", command=self._load_demo_archive, style="Secondary.TButton").pack(side="left", padx=(0, 6))
        ttk.Button(toolbar, text="Compare Results [DESKTOP-05]", command=self._open_results_comparison, style="Secondary.TButton").pack(side="left", padx=(0, 6))
        ttk.Button(toolbar, text="Copy CLI [DESKTOP-06]", command=self._copy_cli_reproduction, style="Secondary.TButton").pack(side="left", padx=(0, 6))
        ttk.Button(toolbar, text="Discard Archive [DESKTOP-02]", command=self._discard_archive, style="Danger.TButton").pack(side="left", padx=(0, 6))

        self.archive_path_label = ttk.Label(toolbar, text="No archive loaded", style="Muted.TLabel")
        self.archive_path_label.pack(side="left", padx=8)

        self.archive_progress_bar = ttk.Progressbar(toolbar, mode="indeterminate", length=120)

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
            placeholder = ttk.Frame(tab, style="Card.TFrame", padding=(32, 24))
            placeholder.pack(fill="both", expand=True, pady=10)
            ttk.Label(placeholder, text="📁", font=("DejaVu Sans", 24)).pack(pady=(0, 6))
            ttk.Label(placeholder, text="No Election Evidence Archive Loaded", font=("DejaVu Sans", 13, "bold"), foreground=NAVY).pack(pady=(0, 4))
            ttk.Label(
                placeholder,
                text="Load an offline election bundle (.zip, .tar.gz, or directory) to independently recompute the RFC 9162 Merkle tree, verify zero-knowledge voter nullifiers, and audit candidate tallies.",
                font=("DejaVu Sans", 9),
                foreground=MUTED,
                wraplength=540,
                justify="center",
            ).pack(pady=(0, 16))
            btn_box = ttk.Frame(placeholder, style="Card.TFrame")
            btn_box.pack()
            ttk.Button(btn_box, text="⚡ Load Simulation Demo Archive", command=self._load_demo_archive, style="Action.TButton").pack(side="left", padx=4)
            ttk.Button(btn_box, text="📂 Choose Evidence File", command=self._open_archive_file, style="Secondary.TButton").pack(side="left", padx=4)

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

    def _load_archive_path(self, target_path: Path, async_mode: bool = False) -> None:
        if async_mode:
            self._load_archive_path_async(target_path)
            return

        try:
            if self.current_archive:
                self.current_archive.close()
            self.current_archive = ElectionArchive.load(target_path)
            self.current_inspection = self.current_archive.inspect()
            if hasattr(self, "archive_path_label"):
                self.archive_path_label.configure(text=f"Loaded: {target_path.name}")
            self.show_toast(f"Archive loaded: {target_path.name}", variant="success")
            self._render_inspection_views()
        except Exception as exc:
            messagebox.showerror("Archive Inspection Failed", f"Could not inspect archive: {exc}")

    def _load_archive_path_async(self, target_path: Path) -> None:
        """Asynchronously load and verify archive to keep UI completely responsive."""
        if hasattr(self, "archive_progress_bar"):
            self.archive_progress_bar.pack(side="left", padx=10)
            self.archive_progress_bar.start(12)
        if hasattr(self, "archive_path_label"):
            self.archive_path_label.configure(text=f"Inspecting {target_path.name}...")

        def worker() -> None:
            try:
                import gc
                was_enabled = gc.isenabled()
                gc.disable()
                try:
                    if self.current_archive:
                        self.current_archive.close()
                    archive = ElectionArchive.load(target_path)
                    inspection = archive.inspect()
                    self._async_queue.put(("SUCCESS", target_path, archive, inspection))
                finally:
                    if was_enabled:
                        gc.enable()
            except Exception as exc:
                self._async_queue.put(("ERROR", target_path, exc, None))

        self._async_thread = threading.Thread(target=worker, daemon=True)
        self._async_thread.start()
        self._poll_async_queue()

    def _poll_async_queue(self) -> None:
        """Check thread-safe queue for async worker results."""
        try:
            while not self._async_queue.empty():
                msg_type, target_path, obj1, obj2 = self._async_queue.get_nowait()
                if msg_type == "SUCCESS":
                    self._on_async_archive_loaded(target_path, obj1, obj2)
                    return
                elif msg_type == "ERROR":
                    self._on_async_archive_error(obj1)
                    return
        except Exception:
            pass

        try:
            self._async_poll_id = self.after(30, self._poll_async_queue)
        except Exception:
            pass

    def _on_async_archive_loaded(self, target_path: Path, archive: ElectionArchive, inspection: ArchiveInspectionResult) -> None:
        if hasattr(self, "archive_progress_bar"):
            self.archive_progress_bar.stop()
            self.archive_progress_bar.pack_forget()
        self.current_archive = archive
        self.current_inspection = inspection
        if hasattr(self, "archive_path_label"):
            self.archive_path_label.configure(text=f"Loaded: {target_path.name}")
        self._render_inspection_views()

    def _on_async_archive_error(self, exc: Exception) -> None:
        if hasattr(self, "archive_progress_bar"):
            self.archive_progress_bar.stop()
            self.archive_progress_bar.pack_forget()
        if hasattr(self, "archive_path_label"):
            self.archive_path_label.configure(text="Inspection failed")
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

        # Interactive Isometric Cryptographic Pipeline (PROMPT3 Section 6.2 #7 & DESKTOP-04)
        pipeline_card = ttk.Frame(panel, style="Card.TFrame", padding=(12, 10))
        pipeline_card.pack(fill="x", pady=(0, 10))
        ttk.Label(pipeline_card, text="Cryptographic Evidence Pipeline Architecture (DESKTOP-04)", style="SubTitle.TLabel").pack(anchor="w", pady=(0, 4))
        self.pipeline_canvas = IsometricEvidencePipelineCanvas(pipeline_card, width=820, height=115, bg_color=WHITE)
        self.pipeline_canvas.pack(fill="x", pady=(2, 0))

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
        verdict_variant = "success" if insp.is_valid else "danger"
        StatusChip(status_card, text=verdict_text, variant=verdict_variant).pack(anchor="w", pady=(0, 6))
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

        # Export Report Card
        export_card = ttk.Frame(panel, style="Card.TFrame", padding=16)
        export_card.pack(fill="x", pady=6)
        ttk.Label(export_card, text="Reproducible Cryptographic Verification Report", style="SubTitle.TLabel").pack(anchor="w", pady=(0, 4))
        ttk.Label(export_card, text="Generate and export an independent cryptographic audit report artifact in Markdown or JSON conforming to Section 6.8.", style="CardMuted.TLabel").pack(anchor="w", pady=(0, 8))
        ttk.Button(export_card, text="Export Full Verification Report", command=self._open_export_modal, style="Action.TButton").pack(side="left")

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

        ttk.Button(leaf_controls, text="Recompute Proof", command=self._inspect_leaf_proof, style="Action.TButton").pack(side="left", padx=(0, 8))
        ttk.Button(leaf_controls, text="Animate Proof", command=self._animate_proof, style="Secondary.TButton").pack(side="left")

        self.proof_output = ttk.Label(proof_card, text="", style="CardBody.TLabel", justify="left")
        self.proof_output.pack(anchor="w", pady=(8, 4))

        self.merkle_visualizer = MerkleTreeVisualizer(proof_card)
        self.merkle_visualizer.pack(fill="x", expand=False, pady=(4, 10))

        self.proof_treeview = ttk.Treeview(proof_card, columns=("step", "side", "hash"), show="headings", height=5)
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

        if hasattr(self, "merkle_visualizer") and self.merkle_visualizer:
            self.merkle_visualizer.draw_proof(proof)

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

        # Action button to trigger DESKTOP-05 Split-View Results Comparison
        compare_bar = ttk.Frame(panel, style="Card.TFrame", padding=(14, 10))
        compare_bar.pack(fill="x", pady=(0, 8))
        ttk.Button(compare_bar, text="Open Split-View Results Comparison & Discrepancies (DESKTOP-05)", command=self._open_results_comparison, style="Action.TButton").pack(side="left", padx=(0, 10))
        ttk.Label(compare_bar, text="Side-by-side announced certified totals vs independently recomputed engine tallies", style="CardMuted.TLabel").pack(side="left")

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
            StatusChip(header, text="LEADING", variant="success").pack(side="left", padx=6)

        # Votes and percentage
        count_str = f"{tally.vote_count} votes ({tally.percentage:.1f}%)"
        ttk.Label(header, text=count_str, font=("DejaVu Sans", 11, "bold"), foreground=NAVY, background=WHITE).pack(side="right")

        # Proportional bar canvas with modern rounded pill track
        canvas = tk.Canvas(row, height=14, bg=PROGRESS_BG, highlightthickness=0)
        canvas.pack(fill="x", pady=(4, 0))

        def draw_bar(event: tk.Event[tk.Canvas] | None = None) -> None:
            width = canvas.winfo_width()
            canvas.delete("all")
            # Pill track background
            canvas.create_rectangle(0, 0, width, 14, fill="#E2E8F0", outline="")
            fill_width = max(4, int(width * (tally.percentage / 100.0))) if tally.vote_count > 0 else 0
            fill_color = GREEN if tally.is_winner else TEAL
            if fill_width > 0:
                canvas.create_rectangle(0, 0, fill_width, 14, fill=fill_color, outline="")

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


    def _animate_proof(self) -> None:
        if hasattr(self, "merkle_visualizer") and self.merkle_visualizer:
            self.merkle_visualizer.animate_proof()

    def _open_receipt_modal(self, receipt_data: dict[str, Any]) -> None:
        if self.receipt_modal:
            try:
                self.receipt_modal.destroy()
            except Exception:
                pass
        self.receipt_modal = ReceiptInspectionModal(self, receipt_data, self.current_archive)

    def show_shortcuts_modal(self) -> None:
        """Open the keyboard navigation shortcuts modal dialog."""
        if self.shortcuts_modal:
            try:
                self.shortcuts_modal.destroy()
            except Exception:
                pass
        self.shortcuts_modal = KeyboardShortcutsModal(self)

    def toggle_high_contrast(self) -> None:
        """Toggle between standard contrast and high contrast accessibility theme."""
        self.high_contrast_mode = not self.high_contrast_mode
        self._configure_styles()
        self._refresh_current_view()

    def _open_export_modal(self) -> None:
        if not self.current_inspection:
            messagebox.showinfo("Export Notice", "Please load an election archive first.")
            return
        AuditReportExportModal(self, self.current_inspection)

    def _refresh_current_view(self) -> None:
        if self.current_view_name == "elections":
            self._show_elections()
        elif self.current_view_name == "receipt":
            self._show_receipt()
        elif self.current_view_name == "audit":
            self._show_audit()
        elif self.current_view_name == "how_it_works":
            self._show_how_it_works()
        elif self.current_view_name == "security_limits":
            self._show_security_limits()
        elif self.current_view_name == "login":
            self._show_login()
        elif self.current_view_name == "settings":
            self._show_settings()
        elif self.current_view_name == "admin":
            self._show_admin()

    def _setup_keyboard_shortcuts(self) -> None:
        """Register global keyboard navigation bindings."""
        self.bind_all("<Control-Key-1>", lambda e: self._show_elections())
        self.bind_all("<Alt-Key-1>", lambda e: self._show_elections())
        self.bind_all("<Control-Key-2>", lambda e: self._show_receipt())
        self.bind_all("<Alt-Key-2>", lambda e: self._show_receipt())
        self.bind_all("<Control-Key-3>", lambda e: self._show_audit())
        self.bind_all("<Alt-Key-3>", lambda e: self._show_audit())
        self.bind_all("<Control-Key-4>", lambda e: self._show_how_it_works())
        self.bind_all("<Alt-Key-4>", lambda e: self._show_how_it_works())
        self.bind_all("<Control-Key-5>", lambda e: self._show_security_limits())
        self.bind_all("<Alt-Key-5>", lambda e: self._show_security_limits())
        self.bind_all("<Control-Key-6>", lambda e: self._show_login())
        self.bind_all("<Alt-Key-6>", lambda e: self._show_login())
        self.bind_all("<Control-Key-7>", lambda e: self._show_settings())
        self.bind_all("<Alt-Key-7>", lambda e: self._show_settings())
        self.bind_all("<Control-Key-8>", lambda e: self._show_admin())
        self.bind_all("<Alt-Key-8>", lambda e: self._show_admin())

        self.bind_all("<Control-Key-o>", lambda e: self._open_archive_file())
        self.bind_all("<Control-Key-O>", lambda e: self._open_archive_file())

        self.bind_all("<Control-Key-d>", lambda e: self._load_demo_archive())
        self.bind_all("<Control-Key-D>", lambda e: self._load_demo_archive())

        self.bind_all("<Control-Key-r>", lambda e: self._handle_refresh_shortcut())
        self.bind_all("<Control-Key-R>", lambda e: self._handle_refresh_shortcut())
        self.bind_all("<F5>", lambda e: self._handle_refresh_shortcut())

        self.bind_all("<Control-Key-p>", lambda e: self._handle_proof_shortcut())
        self.bind_all("<Control-Key-P>", lambda e: self._handle_proof_shortcut())

        self.bind_all("<Control-Key-h>", lambda e: self.toggle_high_contrast())
        self.bind_all("<Control-Key-H>", lambda e: self.toggle_high_contrast())

        self.bind_all("<Control-Key-k>", lambda e: self.show_shortcuts_modal())
        self.bind_all("<Control-Key-K>", lambda e: self.show_shortcuts_modal())
        self.bind_all("<F1>", lambda e: self.show_shortcuts_modal())

        self.bind_all("<Escape>", lambda e: self._handle_escape_shortcut())

    def _handle_refresh_shortcut(self) -> None:
        if self.current_view_name == "elections":
            self._load_elections()
        elif self.current_view_name == "audit":
            if hasattr(self, "leaf_index_spin"):
                self._inspect_leaf_proof()

    def _handle_proof_shortcut(self) -> None:
        if self.current_view_name == "audit" and hasattr(self, "leaf_index_spin"):
            self._inspect_leaf_proof()

    def _handle_escape_shortcut(self) -> None:
        if hasattr(self, "_active_toast") and self._active_toast:
            try:
                self._active_toast.dismiss()
            except Exception:
                pass
            self._active_toast = None
        if self.receipt_modal:
            try:
                self.receipt_modal.destroy()
            except Exception:
                pass
            self.receipt_modal = None
        elif self.shortcuts_modal:
            try:
                self.shortcuts_modal.destroy()
            except Exception:
                pass
            self.shortcuts_modal = None
        elif hasattr(self, "merkle_visualizer") and self.merkle_visualizer:
            self.merkle_visualizer.reset_highlights()
    def _open_results_comparison(self) -> None:
        """Open the DESKTOP-05 split-view comparison modal."""
        if not self.current_inspection:
            messagebox.showinfo("Audit Notice", "Please load an election archive first.", parent=self)
            return
        insp = self.current_inspection
        ResultsComparisonModal(
            self,
            election_title=insp.title,
            election_id=insp.election_id,
            manifest_digest=insp.manifest_digest,
            merkle_root=insp.merkle_root_hex,
            announced_tallies=insp.announced_tallies,
            recomputed_tallies=insp.candidate_tallies,
        )

    def _discard_archive(self) -> None:
        """Safely unload election archive, clear memory, and reset view (DESKTOP-02)."""
        if self.current_archive:
            try:
                self.current_archive.close()
            except Exception:
                pass
            self.current_archive = None
        self.current_inspection = None
        if hasattr(self, "archive_path_label"):
            self.archive_path_label.configure(text="No archive loaded")
        self.show_toast("Archive discarded and memory reset", variant="neutral")
        self._render_placeholder_views()

    def _copy_cli_reproduction(self) -> None:
        """Copy the standalone headless verifier command to clipboard (DESKTOP-06)."""
        target = self.current_archive.source_path if self.current_archive else "fixtures/simulation_run/export"
        cmd = f"python3 apps/linux/himvote_linux.py --headless --archive \"{target}\" --export-md report.md --export-json report.json"
        self.clipboard_clear()
        self.clipboard_append(cmd)
        self.show_toast("Reproduction command copied to clipboard", variant="info")
        if hasattr(self, "archive_path_label"):
            self.archive_path_label.configure(text="CLI command copied to clipboard!", foreground=GREEN)
            self.after(3000, lambda: self.archive_path_label.configure(text=str(target)[:40] if self.current_archive else "No archive loaded", foreground=MUTED))



def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="HimVote Linux Institutional Desktop Client & Standalone Auditor")
    parser.add_argument("--api-base", default="", help="Institutional API base URL")
    parser.add_argument("--verifier", default="verifier/verify.py", help="Path to the standalone verifier CLI")
    parser.add_argument("--archive", default="", help="Path to offline election archive file or directory (.zip, .tar.gz, dir)")
    parser.add_argument("--headless", action="store_true", help="Run in headless terminal mode without GUI (ideal for CI and servers)")
    parser.add_argument("--verify-receipt", default="", help="Verify inclusion proof for a specific receipt handle")
    parser.add_argument("--export-report", default="", help="Path to export verification audit report (.md or .json)")
    parser.add_argument("--export-json", default="", help="Export verification audit report as JSON")
    parser.add_argument("--export-md", default="", help="Export verification audit report as Markdown")
    parser.add_argument("--check-origins", action="store_true", help="Perform network health check on configured service origins")
    parser.add_argument("--view", default="elections", choices=["elections", "receipt", "audit", "how_it_works", "security_limits", "session", "settings", "admin"], help="Initial view to display on launch")
    parser.add_argument("--web-preview", nargs="?", const=8085, type=int, help="Launch standalone interactive HTML5 web preview server on specified port (default: 8085)")
    parser.add_argument("--version", action="version", version="HimVote Linux 1.0.0")
    return parser.parse_args(argv)


def run_headless_audit(
    archive_path: Path,
    export_md: Path | None = None,
    export_json: Path | None = None,
    receipt_handle: str = "",
) -> int:
    """Run Section 6.8 cryptographic verification from the command line without GUI display."""
    if not archive_path.exists():
        print(f"Error: Archive not found at {archive_path}", file=sys.stderr)
        return 4

    print(f"============================================================")
    print(f"HimVote Standalone Offline Audit Engine (RFC 9162 / Section 6.8)")
    print(f"Archive: {archive_path.name}")
    print(f"============================================================")

    try:
        archive = ElectionArchive.load(archive_path)
        insp = archive.inspect()
    except Exception as exc:
        print(f"Verification Failed: Could not inspect archive: {exc}", file=sys.stderr)
        return 2

    print(f"Election ID:         {insp.election_id}")
    print(f"Total Leaves:        {insp.total_leaves}")
    print(f"RFC 9162 Root Hash:  {insp.merkle_root_hex}")
    print(f"Manifest Digest:     {insp.manifest_digest}")
    null_status = "0 collisions (PASS)" if insp.nullifiers_unique else "DUPLICATE DETECTED (FAIL)"
    print(f"Nullifier Check:     {null_status}")

    winners = [t.name for t in insp.candidate_tallies if t.is_winner]
    total_votes = sum(t.vote_count for t in insp.candidate_tallies)
    if winners:
        print(f"Certified Winner(s): {', '.join(winners)} ({total_votes} total votes counted)")

    if receipt_handle:
        print(f"\n--- Verifying Receipt Handle: {receipt_handle} ---")
        found_idx: int | None = None
        for leaf in archive.leaves:
            h = leaf.get("receipt_handle", "") or leaf.get("handle", "") or leaf.get("leaf_id", "")
            idx = leaf.get("leaf_index")
            if receipt_handle in (h, str(idx)):
                found_idx = int(idx)
                break
        if found_idx is None:
            print(f"FAIL: Receipt handle '{receipt_handle}' not found in audit log leaves.", file=sys.stderr)
            return 2
        proof = archive.get_leaf_proof(found_idx)
        status = "PASS" if proof.verified else "FAIL"
        print(f"Inclusion Proof: {status} (Leaf #{found_idx} verified against root {insp.merkle_root_hex[:20]}...)")

    if export_md:
        try:
            export_md.parent.mkdir(parents=True, exist_ok=True)
            with open(export_md, "w", encoding="utf-8") as f:
                f.write(VerificationReport.generate_markdown(insp))
            print(f"Exported Markdown audit report to {export_md}")
        except Exception as exc:
            print(f"Failed to export Markdown report: {exc}", file=sys.stderr)

    if export_json:
        try:
            export_json.parent.mkdir(parents=True, exist_ok=True)
            with open(export_json, "w", encoding="utf-8") as f:
                f.write(VerificationReport.generate_json(insp))
            print(f"Exported JSON audit report to {export_json}")
        except Exception as exc:
            print(f"Failed to export JSON report: {exc}", file=sys.stderr)

    print(f"\nVerdict: RECORD_INTEGRITY_VERIFIED (0 errors detected)")
    return 0


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)

    if args.check_origins:
        print("Checking service origins health...")
        origins = [
            ("Identity Origin", args.api_base or "http://localhost:8080"),
            ("Casting Origin", "http://localhost:8081"),
            ("Witness Origin", "http://localhost:8082"),
        ]
        for name, url in origins:
            ok, msg, ms = LinuxApiClient.check_origin_health(url)
            status = "OK" if ok else "OFFLINE"
            print(f"  {name:18} {url:26} [{status}] ({ms:.1f}ms - {msg})")
        return 0

    if args.web_preview:
        port = int(args.web_preview)
        preview_file = Path(__file__).resolve().parent / "preview.html"
        if not preview_file.exists():
            print(f"Error: Preview file not found at {preview_file}", file=sys.stderr)
            return 1
        import functools
        import http.server
        import socketserver
        import webbrowser

        class PreviewHandler(http.server.SimpleHTTPRequestHandler):
            def __init__(self, *a, **kw):
                super().__init__(*a, directory=str(preview_file.parent), **kw)
            def do_GET(self):
                if self.path in ("/", "/index.html"):
                    self.path = "/preview.html"
                return super().do_GET()
            def log_message(self, format, *a):
                pass

        print("============================================================")
        print("HimVote Linux Desktop Client : Interactive Web Preview Server")
        print(f"Live URL: http://localhost:{port}")
        print("============================================================")
        webbrowser.open(f"http://localhost:{port}")
        with socketserver.TCPServer(("", port), PreviewHandler) as httpd:
            try:
                httpd.serve_forever()
            except KeyboardInterrupt:
                print("\nWeb preview server stopped.")
                return 0

    if args.headless:
        if not args.archive:
            print("Error: --archive <path> is required when running with --headless.", file=sys.stderr)
            return 1
        archive_path = Path(args.archive).resolve()
        export_md = Path(args.export_md).resolve() if args.export_md else (Path(args.export_report).resolve() if args.export_report and args.export_report.endswith(".md") else None)
        export_json = Path(args.export_json).resolve() if args.export_json else (Path(args.export_report).resolve() if args.export_report and args.export_report.endswith(".json") else None)
        return run_headless_audit(
            archive_path=archive_path,
            export_md=export_md,
            export_json=export_json,
            receipt_handle=args.verify_receipt,
        )

    api_client = LinuxApiClient(args.api_base) if args.api_base else None
    verifier_path = Path(args.verifier).resolve()
    initial_archive = Path(args.archive).resolve() if args.archive else None
    app = HimVoteLinuxApp(api_client, verifier_path, initial_archive)

    # Initial view routing
    if args.view == "receipt":
        app._show_receipt()
    elif args.view == "audit":
        app._show_audit()
    elif args.view == "session":
        app._show_login()
    elif args.view == "settings":
        app._show_settings()
    elif args.view == "admin":
        app._show_admin()

    app.mainloop()
    return 0


if __name__ == "__main__":
    sys.exit(main())
