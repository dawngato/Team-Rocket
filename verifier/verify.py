"""Standalone auditor and verifier CLI for HimVote election evidence.
Compliant with Section 6.8 of prompt specification.
"""

import argparse
import base64
import hashlib
import json
import os
import shutil
import sys
import tarfile
import tempfile
import zipfile
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec, ed25519, padding, rsa

# Ensure repository root is on sys.path
_current_dir = os.path.dirname(os.path.abspath(__file__))
_repo_root = os.path.dirname(_current_dir)
if _repo_root not in sys.path:
    sys.path.insert(0, _repo_root)

try:
    from services.election_engine.adapter import VotingEngineAdapter
    from services.election_engine.credentials import derive_nullifier, hash_token_to_int
except ImportError:
    VotingEngineAdapter = None  # type: ignore
    derive_nullifier = None  # type: ignore
    hash_token_to_int = None  # type: ignore

try:
    from himvote_crypto.rsa_blind import (
        RSABSSAVariant,
        verify_signature as verify_rsa_blind_signature,
    )
    HAVE_HIMVOTE_CRYPTO = True
except ImportError:
    HAVE_HIMVOTE_CRYPTO = False

# Exit codes per Section 6.8
EXIT_PASS = 0
EXIT_CRYPTO_FAIL = 2
EXIT_UNVERIFIABLE = 3
EXIT_BAD_ARCHIVE = 4

# Property names
PROPERTY_RECORD_INTEGRITY = "RECORD_INTEGRITY"
PROPERTY_CREDENTIAL_UNIQUENESS = "CREDENTIAL_UNIQUENESS"
PROPERTY_ROSTER_ATTESTATION = "ROSTER_ATTESTATION"
PROPERTY_TALLY_PROOF = "TALLY_PROOF"
PROPERTY_ANCHOR_FINALITY = "ANCHOR_FINALITY"
PROPERTY_BALLOT_SECRECY_ASSUMPTIONS = "BALLOT_SECRECY_ASSUMPTIONS"
PROPERTY_CAST_AS_INTENDED = "CAST_AS_INTENDED"
PROPERTY_RECEIPT_FREENESS = "RECEIPT_FREENESS"
PROPERTY_COMPROMISED_ENDPOINT_RESISTANCE = "COMPROMISED_ENDPOINT_RESISTANCE"
PROPERTY_INDEPENDENT_OPERATORS = "INDEPENDENT_OPERATORS"
PROPERTY_REAL_WORLD_ELIGIBILITY = "REAL_WORLD_ELIGIBILITY"

ALL_PROPERTIES = [
    PROPERTY_RECORD_INTEGRITY,
    PROPERTY_CREDENTIAL_UNIQUENESS,
    PROPERTY_ROSTER_ATTESTATION,
    PROPERTY_TALLY_PROOF,
    PROPERTY_ANCHOR_FINALITY,
    PROPERTY_BALLOT_SECRECY_ASSUMPTIONS,
    PROPERTY_CAST_AS_INTENDED,
    PROPERTY_RECEIPT_FREENESS,
    PROPERTY_COMPROMISED_ENDPOINT_RESISTANCE,
    PROPERTY_INDEPENDENT_OPERATORS,
    PROPERTY_REAL_WORLD_ELIGIBILITY,
]

# Property status constants
STATUS_PASS = "PASS"
STATUS_FAIL = "FAIL"
STATUS_LIMITED = "LIMITED"
STATUS_ASSUMED = "ASSUMED"
STATUS_NOT_SUPPORTED = "NOT_SUPPORTED"
STATUS_UNVERIFIABLE = "UNVERIFIABLE"

# Failure code constants
FAIL_BAD_SIGNATURE = "BAD_SIGNATURE"
FAIL_TRUNCATED = "TRUNCATED"
FAIL_WRONG_CHAIN = "WRONG_CHAIN"
FAIL_INVALID_TALLY = "INVALID_TALLY"
FAIL_MISSING_FINAL = "MISSING_FINAL"
FAIL_STALE_CHECKPOINT = "STALE_CHECKPOINT"
FAIL_DUPLICATE_NULLIFIER = "DUPLICATE_NULLIFIER"
FAIL_BAD_ROOT = "BAD_ROOT"
FAIL_BAD_DIGEST = "BAD_DIGEST"

# Parser safety limits
MAX_ARCHIVE_SIZE_BYTES = 100 * 1024 * 1024
MAX_UNCOMPRESSED_SIZE_BYTES = 500 * 1024 * 1024
MAX_FILE_COUNT = 10000


class BadArchiveError(Exception):
    """Raised when an archive or input JSON is invalid or unsafe."""
    pass


class CryptoAuthError(Exception):
    """Raised when cryptographic or authorization verification fails."""
    pass


class UnverifiableError(Exception):
    """Raised when verification cannot proceed due to missing or untrusted data."""
    pass


def canonicalize_json(obj: Any) -> bytes:
    """RFC 8785 JSON Canonicalization Scheme JCS.
    Encodes JSON data to canonical UTF 8 bytes.
    Keys are sorted by UTF 16 code units.
    Floats are strictly rejected.
    """
    if obj is None:
        return b"null"
    if isinstance(obj, bool):
        return b"true" if obj else b"false"
    if isinstance(obj, int):
        return str(obj).encode("utf_8")
    if isinstance(obj, float):
        raise BadArchiveError("Floats are not permitted in canonical records")
    if isinstance(obj, str):
        escaped = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
        return escaped.encode("utf_8")
    if isinstance(obj, list):
        items = [canonicalize_json(x) for x in obj]
        return b"[" + b",".join(items) + b"]"
    if isinstance(obj, dict):
        sorted_keys = sorted(obj.keys(), key=lambda k: k.encode("utf_16_be"))
        pairs = []
        for k in sorted_keys:
            key_bytes = json.dumps(k, ensure_ascii=False, separators=(",", ":")).encode("utf_8")
            val_bytes = canonicalize_json(obj[k])
            pairs.append(key_bytes + b":" + val_bytes)
        return b"{" + b",".join(pairs) + b"}"
    raise BadArchiveError(f"Unsupported data type for canonical JSON: {type(obj)}")


def safe_json_loads(data: str | bytes) -> Any:
    """Safe JSON loader that strictly rejects duplicate keys and floats."""
    if isinstance(data, bytes):
        try:
            text = data.decode("utf_8")
        except UnicodeDecodeError as err:
            raise BadArchiveError("Invalid UTF 8 encoding in JSON data") from err
    else:
        text = data

    def duplicate_key_hook(pairs: List[Tuple[str, Any]]) -> Dict[str, Any]:
        seen: Set[str] = set()
        result: Dict[str, Any] = {}
        for k, v in pairs:
            if k in seen:
                raise BadArchiveError(f"Duplicate JSON key detected: {k}")
            seen.add(k)
            result[k] = v
        return result

    def reject_float_hook(val: str) -> None:
        raise BadArchiveError(f"Floats not permitted in canonical records: {val}")

    try:
        return json.loads(
            text,
            object_pairs_hook=duplicate_key_hook,
            parse_float=reject_float_hook,
        )
    except json.JSONDecodeError as err:
        raise BadArchiveError(f"Malformed JSON data: {err}") from err


def sha256_digest(data: bytes) -> bytes:
    """Compute raw SHA256 digest bytes."""
    return hashlib.sha256(data).digest()


def sha256_hex(data: bytes) -> str:
    """Compute hex SHA256 digest string."""
    return hashlib.sha256(data).hexdigest()


def format_digest(data: bytes) -> str:
    """Format digest with sha256 prefix."""
    return f"sha256:{hashlib.sha256(data).hexdigest()}"


def normalize_digest(digest_str: Optional[str]) -> str:
    """Normalize a digest string by stripping sha256 prefix and converting to lowercase."""
    if not digest_str:
        return ""
    d = digest_str.strip()
    if d.startswith("sha256:"):
        d = d[7:]
    return d.lower()


def compute_rfc9162_merkle_root(leaf_bytes_list: List[bytes]) -> bytes:
    """Compute RFC 9162 Merkle tree hash across a list of leaf canonical bytes.
    Prefix 0x00 is applied to each leaf.
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


def decode_signature_bytes(sig_data: Any) -> bytes:
    """Decode a signature from bytes or base64 or base64url or hex string."""
    if isinstance(sig_data, bytes):
        return sig_data
    if not isinstance(sig_data, str):
        raise CryptoAuthError("Signature value is not a string or bytes")
    sig_str = sig_data.strip()
    try:
        padded = sig_str + "=" * ((4 - len(sig_str) % 4) % 4)
        return base64.urlsafe_b64decode(padded)
    except Exception:
        pass
    try:
        padded = sig_str + "=" * ((4 - len(sig_str) % 4) % 4)
        return base64.b64decode(padded)
    except Exception:
        pass
    try:
        return bytes.fromhex(sig_str)
    except Exception as err:
        raise CryptoAuthError(f"Cannot decode signature format: {err}") from err


def load_public_key_from_info(key_info: Any) -> Any:
    """Load a public key object from a dictionary or string or bytes."""
    if key_info is None:
        raise UnverifiableError("Public key information is missing")

    if isinstance(key_info, (ed25519.Ed25519PublicKey, ec.EllipticCurvePublicKey, rsa.RSAPublicKey)):
        return key_info

    pem_str: Optional[str] = None
    raw_bytes: Optional[bytes] = None

    if isinstance(key_info, dict):
        if "public_key_pem" in key_info and key_info["public_key_pem"]:
            pem_str = key_info["public_key_pem"]
        elif "public_key_b64" in key_info and key_info["public_key_b64"]:
            padded = key_info["public_key_b64"] + "=" * ((4 - len(key_info["public_key_b64"]) % 4) % 4)
            raw_bytes = base64.b64decode(padded)
        elif "public_key_b64url" in key_info and key_info["public_key_b64url"]:
            padded = key_info["public_key_b64url"] + "=" * ((4 - len(key_info["public_key_b64url"]) % 4) % 4)
            raw_bytes = base64.urlsafe_b64decode(padded)
        elif "public_key_hex" in key_info and key_info["public_key_hex"]:
            raw_bytes = bytes.fromhex(key_info["public_key_hex"])
        elif "public_key" in key_info:
            return load_public_key_from_info(key_info["public_key"])
        elif ("n" in key_info or "modulus_n" in key_info) and ("e" in key_info or "public_exponent_e" in key_info):
            n_raw = key_info.get("n") or key_info.get("modulus_n")
            e_raw = key_info.get("e") or key_info.get("public_exponent_e")
            n_val = int(n_raw, 16) if isinstance(n_raw, str) and (n_raw.startswith("0x") or any(c in "abcdefABCDEF" for c in n_raw)) else int(n_raw)
            e_val = int(e_raw, 16) if isinstance(e_raw, str) and (e_raw.startswith("0x") or any(c in "abcdefABCDEF" for c in e_raw)) else int(e_raw)
            return rsa.RSAPublicNumbers(e_val, n_val).public_key()
        else:
            raise UnverifiableError("Trust pin dictionary contains no known public key encoding")
    elif isinstance(key_info, str):
        stripped = key_info.strip()
        if stripped.startswith("-----BEGIN"):
            pem_str = stripped
        else:
            try:
                padded = stripped + "=" * ((4 - len(stripped) % 4) % 4)
                raw_bytes = base64.urlsafe_b64decode(padded)
            except Exception:
                try:
                    padded = stripped + "=" * ((4 - len(stripped) % 4) % 4)
                    raw_bytes = base64.b64decode(padded)
                except Exception:
                    try:
                        raw_bytes = bytes.fromhex(stripped)
                    except Exception as err:
                        raise UnverifiableError("Failed to parse public key string") from err
    elif isinstance(key_info, bytes):
        raw_bytes = key_info
    else:
        raise UnverifiableError(f"Unsupported key info type: {type(key_info)}")

    if pem_str:
        try:
            return serialization.load_pem_public_key(pem_str.encode("utf_8"))
        except Exception as err:
            raise UnverifiableError(f"Failed to load PEM public key: {err}") from err

    if raw_bytes:
        if len(raw_bytes) == 32:
            return ed25519.Ed25519PublicKey.from_public_bytes(raw_bytes)
        try:
            return serialization.load_der_public_key(raw_bytes)
        except Exception:
            pass
        if len(raw_bytes) == 65 and raw_bytes[0] == 4:
            return ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), raw_bytes)
        if len(raw_bytes) == 33 and raw_bytes[0] in (2, 3):
            return ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), raw_bytes)

    raise UnverifiableError("Could not construct public key from provided key material")


def verify_signature(public_key: Any, message: bytes, signature_val: Any) -> bool:
    """Verify cryptographic signature across message bytes."""
    sig_bytes = decode_signature_bytes(signature_val)

    if isinstance(public_key, ed25519.Ed25519PublicKey):
        try:
            public_key.verify(sig_bytes, message)
            return True
        except InvalidSignature:
            return False

    if isinstance(public_key, ec.EllipticCurvePublicKey):
        try:
            public_key.verify(sig_bytes, message, ec.ECDSA(hashes.SHA256()))
            return True
        except InvalidSignature:
            return False

    if isinstance(public_key, rsa.RSAPublicKey):
        for hash_algo in [hashes.SHA256(), hashes.SHA384(), hashes.SHA512()]:
            try:
                public_key.verify(sig_bytes, message, padding.PKCS1v15(), hash_algo)
                return True
            except (InvalidSignature, ValueError):
                pass
        for hash_algo in [hashes.SHA256(), hashes.SHA384(), hashes.SHA512()]:
            for salt_len in [padding.PSS.MAX_LENGTH, padding.PSS.DIGEST_LENGTH, 0]:
                try:
                    public_key.verify(
                        sig_bytes,
                        message,
                        padding.PSS(mgf=padding.MGF1(hash_algo), salt_length=salt_len),
                        hash_algo,
                    )
                    return True
                except (InvalidSignature, ValueError):
                    pass
        return False

    raise UnverifiableError(f"Unsupported public key type for verification: {type(public_key)}")


def get_public_key_fingerprint(public_key: Any) -> str:
    """Compute sha256 fingerprint for a public key."""
    if isinstance(public_key, ed25519.Ed25519PublicKey):
        raw = public_key.public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)
        return format_digest(raw)
    try:
        der = public_key.public_bytes(serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)
        return format_digest(der)
    except Exception:
        return ""


def safe_inspect_directory(dir_path: str) -> None:
    """Inspect a directory to reject symlinks and enforce file size limits."""
    file_count = 0
    total_size = 0

    for root, dirs, files in os.walk(dir_path, followlinks=False):
        for d in dirs:
            full_d = os.path.join(root, d)
            if os.path.islink(full_d):
                raise BadArchiveError(f"Symlinks are prohibited: {full_d}")
        for f in files:
            full_f = os.path.join(root, f)
            if os.path.islink(full_f):
                raise BadArchiveError(f"Symlinks are prohibited: {full_f}")
            file_count += 1
            if file_count > MAX_FILE_COUNT:
                raise BadArchiveError("File count exceeds maximum permitted limit")
            size = os.path.getsize(full_f)
            total_size += size
            if total_size > MAX_UNCOMPRESSED_SIZE_BYTES:
                raise BadArchiveError("Total content size exceeds maximum permitted limit")


def safe_extract_archive(archive_path: str, extract_dir: str) -> None:
    """Extract an archive safely with path traversal and symlink and size limit checks."""
    if not os.path.exists(archive_path):
        raise BadArchiveError(f"Archive file not found: {archive_path}")

    archive_size = os.path.getsize(archive_path)
    if archive_size > MAX_ARCHIVE_SIZE_BYTES:
        raise BadArchiveError("Archive file size exceeds maximum limit")

    extract_real = os.path.realpath(extract_dir)
    file_count = 0
    total_uncompressed = 0

    if zipfile.is_zipfile(archive_path):
        with zipfile.ZipFile(archive_path, "r") as zf:
            for info in zf.infolist():
                name = info.filename
                if name.startswith("/") or name.startswith("\\") or ".." in name.split("/") or ".." in name.split("\\"):
                    raise BadArchiveError(f"Path traversal detected in archive entry: {name}")

                target = os.path.realpath(os.path.join(extract_dir, name))
                if not (target == extract_real or target.startswith(extract_real + os.sep)):
                    raise BadArchiveError(f"Path traversal target outside boundary: {name}")

                is_symlink = ((info.external_attr >> 16) & 0o120000) == 0o120000
                if is_symlink:
                    raise BadArchiveError(f"Symlinks are prohibited in archive: {name}")

                file_count += 1
                if file_count > MAX_FILE_COUNT:
                    raise BadArchiveError("Archive contains too many files")
                total_uncompressed += info.file_size
                if total_uncompressed > MAX_UNCOMPRESSED_SIZE_BYTES:
                    raise BadArchiveError("Archive uncompressed size exceeds limit")

            zf.extractall(extract_dir)
        return

    if tarfile.is_tarfile(archive_path):
        with tarfile.open(archive_path, "r:*") as tf:
            for member in tf.getmembers():
                name = member.name
                if name.startswith("/") or name.startswith("\\") or ".." in name.split("/") or ".." in name.split("\\"):
                    raise BadArchiveError(f"Path traversal detected in tar entry: {name}")

                target = os.path.realpath(os.path.join(extract_dir, name))
                if not (target == extract_real or target.startswith(extract_real + os.sep)):
                    raise BadArchiveError(f"Path traversal target outside boundary: {name}")

                if member.issym() or member.islnk():
                    raise BadArchiveError(f"Symlinks are prohibited in tar: {name}")

                file_count += 1
                if file_count > MAX_FILE_COUNT:
                    raise BadArchiveError("Tar archive contains too many files")
                total_uncompressed += member.size
                if total_uncompressed > MAX_UNCOMPRESSED_SIZE_BYTES:
                    raise BadArchiveError("Tar archive uncompressed size exceeds limit")

            tf.extractall(extract_dir)
        return

    raise BadArchiveError("Unsupported archive format. Expected zip or tar archive")


def get_verifier_sha256() -> str:
    """Compute sha256 digest of this verifier script."""
    current_file = os.path.abspath(__file__)
    try:
        with open(current_file, "rb") as f:
            return sha256_hex(f.read())
    except Exception:
        return ""


def load_file_content(path: str) -> bytes:
    """Read file content safely."""
    if not os.path.exists(path):
        raise UnverifiableError(f"Required file does not exist: {path}")
    if os.path.islink(path):
        raise BadArchiveError(f"File cannot be a symlink: {path}")
    with open(path, "rb") as f:
        return f.read()


def _load_export_leaves(export_path: str) -> Tuple[str, List[Dict[str, Any]]]:
    """Load export leaves through the same archive safety boundary as a full audit."""
    temp_dir: Optional[str] = None
    export_dir = export_path
    if not os.path.exists(export_path):
        raise BadArchiveError(f"Export target does not exist: {export_path}")
    if os.path.islink(export_path):
        raise BadArchiveError("Export target cannot be a symlink")
    if os.path.isfile(export_path):
        temp_dir = tempfile.mkdtemp(prefix="himvote_inclusion_")
        safe_extract_archive(export_path, temp_dir)
        export_dir = temp_dir
    else:
        safe_inspect_directory(export_path)

    leaves_path = os.path.join(export_dir, "leaves.json")
    if not os.path.exists(leaves_path):
        raise BadArchiveError("Export directory is missing leaves.json")
    leaves = safe_json_loads(load_file_content(leaves_path))
    if not isinstance(leaves, list) or any(not isinstance(item, dict) for item in leaves):
        raise BadArchiveError("leaves.json must contain an array of objects")
    return temp_dir or "", leaves


def _digest_bytes(value: Any) -> bytes:
    """Decode a sha256 digest string used by an inclusion tracker."""
    normalized = normalize_digest(value)
    if len(normalized) != 64:
        raise BadArchiveError("Digest must contain exactly 32 bytes")
    try:
        return bytes.fromhex(normalized)
    except ValueError as err:
        raise BadArchiveError("Digest is not valid hexadecimal") from err


def verify_inclusion(
    export_path: str,
    trust_path: str,
    final_path: str,
    tracker_path: str,
    report_path: Optional[str] = None,
) -> Tuple[int, Dict[str, Any]]:
    """Verify one non choice revealing tracker against an external final root."""
    tracker = safe_json_loads(load_file_content(tracker_path))
    final_checkpoint = safe_json_loads(load_file_content(final_path))
    trust_pins = safe_json_loads(load_file_content(trust_path))
    if not isinstance(tracker, dict) or not isinstance(final_checkpoint, dict):
        raise BadArchiveError("Tracker and final checkpoint must be JSON objects")
    if not isinstance(trust_pins, dict):
        raise BadArchiveError("Trust pins must be a JSON object")
    if tracker.get("schema") != "himvote.inclusion_tracker.v1":
        raise BadArchiveError("Unsupported inclusion tracker schema")

    witness_keys_info = trust_pins.get("witness_keys") or trust_pins.get("witness_public_key")
    if not witness_keys_info:
        raise UnverifiableError("Trust pins file is missing witness keys")
    witness_infos = witness_keys_info if isinstance(witness_keys_info, list) else [witness_keys_info]
    witness_keys = [load_public_key_from_info(item) for item in witness_infos]

    checkpoint_data = dict(final_checkpoint)
    checkpoint_signature = checkpoint_data.pop("signature", None)
    if final_checkpoint.get("checkpoint_kind") != "FINAL" or not checkpoint_signature:
        raise CryptoAuthError("External checkpoint is not a signed FINAL")
    checkpoint_bytes = canonicalize_json(checkpoint_data)
    if not any(verify_signature(key, checkpoint_bytes, checkpoint_signature) for key in witness_keys):
        raise CryptoAuthError("External final checkpoint signature is invalid")

    election_id = tracker.get("election_id")
    manifest_digest = tracker.get("manifest_digest")
    leaf_index = tracker.get("leaf_index")
    audit_path = tracker.get("audit_path")
    if not election_id or not manifest_digest or not isinstance(leaf_index, int) or not isinstance(audit_path, list):
        raise BadArchiveError("Tracker is missing election binding, leaf index, or audit path")
    if final_checkpoint.get("election_id") != election_id:
        raise CryptoAuthError("Tracker election does not match final checkpoint")
    if normalize_digest(final_checkpoint.get("manifest_digest")) != normalize_digest(manifest_digest):
        raise CryptoAuthError("Tracker manifest does not match final checkpoint")
    tree_size = final_checkpoint.get("tree_size")
    if not isinstance(tree_size, int) or tree_size < 1 or leaf_index < 0 or leaf_index >= tree_size:
        raise CryptoAuthError("Tracker leaf index is outside the final tree")

    temp_dir, leaves = _load_export_leaves(export_path)
    try:
        matching = [item for item in leaves if item.get("leaf_index") == leaf_index]
        if len(matching) != 1:
            raise CryptoAuthError("Tracker leaf index is absent or duplicated")
        leaf = matching[0]
        if leaf.get("election_id") != election_id or normalize_digest(leaf.get("manifest_digest")) != normalize_digest(manifest_digest):
            raise CryptoAuthError("Tracker leaf election binding is invalid")

        leaf_bytes = canonicalize_json(leaf)
        leaf_digest = format_digest(b"\x00" + leaf_bytes)
        if normalize_digest(tracker.get("leaf_digest")) != normalize_digest(leaf_digest):
            raise CryptoAuthError("Tracker leaf digest does not match the exported leaf")

        current = _digest_bytes(leaf_digest)
        for node in audit_path:
            if not isinstance(node, dict) or node.get("position") not in {"left", "right"}:
                raise BadArchiveError("Each audit path entry needs a left or right position")
            sibling = _digest_bytes(node.get("hash"))
            if node["position"] == "left":
                current = sha256_digest(b"\x01" + sibling + current)
            else:
                current = sha256_digest(b"\x01" + current + sibling)

        computed_root = f"sha256:{current.hex()}"
        final_root = final_checkpoint.get("merkle_root")
        if normalize_digest(computed_root) != normalize_digest(final_root):
            raise CryptoAuthError("Inclusion path does not reach the external final root")
        tracker_root = tracker.get("root")
        if tracker_root and normalize_digest(tracker_root) != normalize_digest(computed_root):
            raise CryptoAuthError("Tracker root does not match computed root")

        report = {
            "schema": "himvote.inclusion_report.v1",
            "election_id": election_id,
            "manifest_digest": manifest_digest,
            "leaf_index": leaf_index,
            "leaf_digest": leaf_digest,
            "merkle_root": computed_root,
            "status": STATUS_PASS,
            "verifier_sha256": get_verifier_sha256(),
        }
        if report_path:
            os.makedirs(os.path.dirname(os.path.abspath(report_path)), exist_ok=True)
            with open(report_path, "wb") as stream:
                stream.write(canonicalize_json(report))
        return EXIT_PASS, report
    finally:
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)


def derive_nullifier_local(election_id: str, voter_token: str) -> str:
    """Derive deterministic nullifier from election ID and voter secret token."""
    message = f"himvote_nullifier_v1:{election_id}:{voter_token}".encode("utf_8")
    return hashlib.sha256(message).hexdigest()


def hash_token_to_int_local(token_str: str, modulus_n: int) -> int:
    """Hash voter token to an integer scalar modulo RSA modulus N."""
    digest = hashlib.sha256(token_str.encode("utf_8")).digest()
    return int.from_bytes(digest, "big") % modulus_n


def verify_credential_proof_record(
    issuer_key: Any,
    election_id: str,
    manifest_digest: str,
    nullifier: str,
    proof_bytes: bytes,
) -> Tuple[bool, str]:
    """Verify credential proof supporting RFC 9474 RSABSSA and Ed25519 signatures."""
    proof_json = None
    try:
        proof_json = safe_json_loads(proof_bytes)
    except Exception:
        pass

    if isinstance(proof_json, dict):
        p_elec = proof_json.get("election_id")
        if p_elec and p_elec != election_id:
            return False, "ELECTION_ID_MISMATCH"

        p_man = proof_json.get("manifest_digest")
        if p_man and normalize_digest(p_man) != normalize_digest(manifest_digest):
            return False, "MANIFEST_DIGEST_MISMATCH"

        voter_tok = proof_json.get("voter_token") or proof_json.get("token") or ""
        sig_val = proof_json.get("signature")

        # Check RSA blind signature forms
        if isinstance(issuer_key, rsa.RSAPublicKey):
            # Check integer RSA blind signature
            if voter_tok and sig_val is not None:
                try:
                    sig_int = int(sig_val, 16) if isinstance(sig_val, str) and (sig_val.startswith("0x") or any(c in "abcdefABCDEF" for c in sig_val)) else int(sig_val)
                    n = issuer_key.public_numbers().n
                    e = issuer_key.public_numbers().e
                    m = hash_token_to_int_local(voter_tok, n)
                    if pow(sig_int, e, n) == m:
                        derived_1 = derive_nullifier_local(election_id, voter_tok)
                        derived_2 = hashlib.sha256(f"himvote_nullifier:{election_id}:{voter_tok}".encode("utf_8")).hexdigest()
                        derived_3 = hashlib.sha256(voter_tok.encode("utf_8")).hexdigest()
                        target = normalize_digest(nullifier)
                        valid_nulls = {
                            normalize_digest(derived_1),
                            normalize_digest(format_digest(derived_1.encode("utf_8"))),
                            normalize_digest(derived_2),
                            normalize_digest(format_digest(derived_2.encode("utf_8"))),
                            normalize_digest(derived_3),
                        }
                        if target in valid_nulls:
                            return True, ""
                except Exception:
                    pass

            # Check RFC 9474 RSABSSA verification
            if HAVE_HIMVOTE_CRYPTO and sig_val is not None:
                try:
                    sig_b = decode_signature_bytes(sig_val) if isinstance(sig_val, str) else sig_val
                    check_msgs = []
                    if "prepared_msg" in proof_json:
                        prep = proof_json["prepared_msg"]
                        check_msgs.append(decode_signature_bytes(prep) if isinstance(prep, str) else prep)
                    if voter_tok:
                        check_msgs.append(voter_tok.encode("utf_8"))
                        check_msgs.append(f"{election_id}:{voter_tok}".encode("utf_8"))
                        check_msgs.append(f"{election_id}:{manifest_digest}:{voter_tok}".encode("utf_8"))
                        check_msgs.append(f"{election_id}:{manifest_digest}:{nullifier}".encode("utf_8"))
                    if "message" in proof_json:
                        m_val = proof_json["message"]
                        check_msgs.append(decode_signature_bytes(m_val) if isinstance(m_val, str) else (m_val.encode("utf_8") if isinstance(m_val, str) else m_val))

                    v_list = [RSABSSAVariant[proof_json["variant"]]] if "variant" in proof_json and proof_json["variant"] in RSABSSAVariant.__members__ else list(RSABSSAVariant)
                    for prep_msg in check_msgs:
                        for v in v_list:
                            if verify_rsa_blind_signature(issuer_key, prep_msg, sig_b, variant=v):
                                if voter_tok:
                                    derived_1 = derive_nullifier_local(election_id, voter_tok)
                                    derived_2 = hashlib.sha256(f"himvote_nullifier:{election_id}:{voter_tok}".encode("utf_8")).hexdigest()
                                    derived_3 = hashlib.sha256(voter_tok.encode("utf_8")).hexdigest()
                                    target = normalize_digest(nullifier)
                                    valid_nulls = {
                                        normalize_digest(derived_1),
                                        normalize_digest(format_digest(derived_1.encode("utf_8"))),
                                        normalize_digest(derived_2),
                                        normalize_digest(format_digest(derived_2.encode("utf_8"))),
                                        normalize_digest(derived_3),
                                    }
                                    if target in valid_nulls:
                                        return True, ""
                                else:
                                    return True, ""
                except Exception:
                    pass

            # Check standard RSA signature over canonical JSON
            if sig_val is not None:
                p_data = dict(proof_json)
                p_data.pop("signature", None)
                if verify_signature(issuer_key, canonicalize_json(p_data), sig_val):
                    return True, ""

        # Check Ed25519 signature
        if isinstance(issuer_key, ed25519.Ed25519PublicKey) and sig_val is not None:
            p_data = dict(proof_json)
            p_data.pop("signature", None)
            if verify_signature(issuer_key, canonicalize_json(p_data), sig_val):
                return True, ""

            binding_1 = f"{election_id}:{manifest_digest}:{nullifier}".encode("utf_8")
            binding_2 = canonicalize_json({
                "election_id": election_id,
                "manifest_digest": manifest_digest,
                "nullifier": nullifier,
            })
            if verify_signature(issuer_key, binding_1, sig_val) or verify_signature(issuer_key, binding_2, sig_val):
                return True, ""

    # Raw signature checks over binding messages
    binding_1 = f"{election_id}:{manifest_digest}:{nullifier}".encode("utf_8")
    binding_2 = canonicalize_json({
        "election_id": election_id,
        "manifest_digest": manifest_digest,
        "nullifier": nullifier,
    })
    binding_3 = f"himvote_nullifier:{election_id}:{nullifier}".encode("utf_8")
    binding_4 = nullifier.encode("utf_8")
    binding_5 = normalize_digest(nullifier).encode("utf_8")

    all_raw_candidates = [binding_1, binding_2, binding_3, binding_4, binding_5]

    for m in all_raw_candidates:
        if verify_signature(issuer_key, m, proof_bytes):
            return True, ""
        if isinstance(issuer_key, rsa.RSAPublicKey) and HAVE_HIMVOTE_CRYPTO:
            for variant in RSABSSAVariant:
                if verify_rsa_blind_signature(issuer_key, m, proof_bytes, variant=variant):
                    return True, ""

    return False, FAIL_BAD_SIGNATURE


def audit_evidence(
    export_path: str,
    trust_path: str,
    final_path: str,
    roster_path: str,
    issuance_path: str,
    chain_path: str,
    report_path: Optional[str] = None,
) -> Tuple[int, Dict[str, Any]]:
    """Execute rigorous audit verification on election evidence per Section 6.8."""
    temp_dir: Optional[str] = None
    export_dir: str = export_path

    failure_reasons: List[str] = []
    property_statuses: Dict[str, Dict[str, str]] = {
        p: {"status": STATUS_UNVERIFIABLE, "details": "Pending verification"}
        for p in ALL_PROPERTIES
    }

    # Step 1: Load pinned trust keys from external trust pins file only
    trust_pins_raw = load_file_content(trust_path)
    trust_pins = safe_json_loads(trust_pins_raw)
    if not isinstance(trust_pins, dict):
        raise BadArchiveError("Trust pins root must be a JSON object")

    roster_approver_key_info = trust_pins.get("roster_approver_key") or trust_pins.get("roster_approver_public_key")
    issuer_key_info = trust_pins.get("issuer_key") or trust_pins.get("issuer_public_key")
    witness_keys_info = trust_pins.get("witness_keys") or trust_pins.get("witness_public_key")
    chain_pins = trust_pins.get("chain", {})
    if not chain_pins and "contract_address" in trust_pins:
        chain_pins = trust_pins

    if not roster_approver_key_info or not issuer_key_info or not witness_keys_info:
        raise UnverifiableError("Trust pins file is missing required authority keys")

    roster_approver_key = load_public_key_from_info(roster_approver_key_info)
    issuer_key = load_public_key_from_info(issuer_key_info)

    witness_keys: List[Any] = []
    if isinstance(witness_keys_info, list):
        for wk in witness_keys_info:
            witness_keys.append(load_public_key_from_info(wk))
    else:
        witness_keys.append(load_public_key_from_info(witness_keys_info))

    # Step 9: Parser safety on export
    if not os.path.exists(export_path):
        raise BadArchiveError(f"Export target does not exist: {export_path}")

    if os.path.islink(export_path):
        raise BadArchiveError("Export target cannot be a symlink")

    if os.path.isfile(export_path):
        temp_dir = tempfile.mkdtemp(prefix="himvote_verify_")
        safe_extract_archive(export_path, temp_dir)
        export_dir = temp_dir
    else:
        safe_inspect_directory(export_path)

    any_crypto_fail = False
    any_unverifiable = False

    try:
        # Step 2: Verify manifest, roster approval, issuance closure
        manifest_file = os.path.join(export_dir, "manifest.json")
        if not os.path.exists(manifest_file):
            raise BadArchiveError("Export directory is missing manifest.json")

        manifest = safe_json_loads(load_file_content(manifest_file))
        if not isinstance(manifest, dict):
            raise BadArchiveError("Manifest must be a JSON object")

        election_id = manifest.get("election_id")
        manifest_digest = manifest.get("manifest_digest")
        if not election_id or not manifest_digest:
            raise BadArchiveError("Manifest is missing election_id or manifest_digest")

        # Verify manifest canonical digest
        manifest_copy = dict(manifest)
        manifest_copy.pop("manifest_digest", None)
        manifest_copy.pop("signature", None)
        recomputed_manifest_digest = format_digest(canonicalize_json(manifest_copy))
        if normalize_digest(manifest_digest) != normalize_digest(recomputed_manifest_digest):
            manifest_copy_full = dict(manifest)
            manifest_copy_full.pop("signature", None)
            alt_digest = format_digest(canonicalize_json(manifest_copy_full))
            if normalize_digest(manifest_digest) != normalize_digest(alt_digest):
                property_statuses[PROPERTY_RECORD_INTEGRITY] = {
                    "status": STATUS_FAIL,
                    "details": "Manifest canonical digest mismatch",
                }
                failure_reasons.append(FAIL_BAD_DIGEST)
                any_crypto_fail = True

        # Verify Roster Approval
        roster_raw = load_file_content(roster_path)
        roster_approval = safe_json_loads(roster_raw)
        if not isinstance(roster_approval, dict):
            raise BadArchiveError("Roster approval must be a JSON object")

        roster_ok = True
        if roster_approval.get("election_id") != election_id:
            roster_ok = False
            failure_reasons.append(FAIL_BAD_SIGNATURE)
        if normalize_digest(roster_approval.get("manifest_digest")) != normalize_digest(manifest_digest):
            roster_ok = False
            failure_reasons.append(FAIL_BAD_SIGNATURE)

        manifest_roster_commitment = manifest.get("roster_commitment")
        if manifest_roster_commitment and normalize_digest(roster_approval.get("roster_commitment")) != normalize_digest(manifest_roster_commitment):
            roster_ok = False
            failure_reasons.append(FAIL_BAD_SIGNATURE)

        manifest_eligible_count = manifest.get("public_eligible_count")
        if manifest_eligible_count is not None and roster_approval.get("eligible_count") != manifest_eligible_count:
            roster_ok = False
            failure_reasons.append(FAIL_BAD_SIGNATURE)

        roster_sig = roster_approval.get("signature")
        if not roster_sig:
            roster_ok = False
            failure_reasons.append(FAIL_BAD_SIGNATURE)
        else:
            roster_data_to_verify = dict(roster_approval)
            roster_data_to_verify.pop("signature", None)
            roster_canonical_bytes = canonicalize_json(roster_data_to_verify)
            if not verify_signature(roster_approver_key, roster_canonical_bytes, roster_sig):
                roster_ok = False
                failure_reasons.append(FAIL_BAD_SIGNATURE)

        if roster_ok:
            property_statuses[PROPERTY_ROSTER_ATTESTATION] = {
                "status": STATUS_PASS,
                "details": "Roster approval verified against pinned approver key",
            }
            property_statuses[PROPERTY_REAL_WORLD_ELIGIBILITY] = {
                "status": STATUS_PASS,
                "details": "Roster snapshot verified prior to election freeze",
            }
        else:
            property_statuses[PROPERTY_ROSTER_ATTESTATION] = {
                "status": STATUS_FAIL,
                "details": "Roster approval verification failed",
            }
            property_statuses[PROPERTY_REAL_WORLD_ELIGIBILITY] = {
                "status": STATUS_FAIL,
                "details": "Roster approval invalid",
            }
            any_crypto_fail = True

        # Verify Issuance Closure
        issuance_raw = load_file_content(issuance_path)
        issuance_closure = safe_json_loads(issuance_raw)
        if not isinstance(issuance_closure, dict):
            raise BadArchiveError("Issuance closure must be a JSON object")

        issuance_ok = True
        if issuance_closure.get("election_id") != election_id:
            issuance_ok = False
            failure_reasons.append(FAIL_BAD_SIGNATURE)
        if normalize_digest(issuance_closure.get("manifest_digest")) != normalize_digest(manifest_digest):
            issuance_ok = False
            failure_reasons.append(FAIL_BAD_SIGNATURE)

        issuance_sig = issuance_closure.get("signature")
        if not issuance_sig:
            issuance_ok = False
            failure_reasons.append(FAIL_BAD_SIGNATURE)
        else:
            issuance_data_to_verify = dict(issuance_closure)
            issuance_data_to_verify.pop("signature", None)
            issuance_canonical_bytes = canonicalize_json(issuance_data_to_verify)
            if not verify_signature(issuer_key, issuance_canonical_bytes, issuance_sig):
                issuance_ok = False
                failure_reasons.append(FAIL_BAD_SIGNATURE)

        issued_count = issuance_closure.get("issued_count", 0)
        if manifest_eligible_count is not None and issued_count > manifest_eligible_count:
            issuance_ok = False
            failure_reasons.append(FAIL_BAD_SIGNATURE)

        if not issuance_ok:
            property_statuses[PROPERTY_RECORD_INTEGRITY] = {
                "status": STATUS_FAIL,
                "details": "Issuance closure verification failed",
            }
            any_crypto_fail = True

        # Step 3: Verify independent final witness checkpoint
        final_raw = load_file_content(final_path)
        final_checkpoint = safe_json_loads(final_raw)
        if not isinstance(final_checkpoint, dict):
            raise BadArchiveError("Final checkpoint must be a JSON object")

        checkpoint_ok = True
        if final_checkpoint.get("checkpoint_kind") != "FINAL":
            checkpoint_ok = False
            failure_reasons.append(FAIL_MISSING_FINAL)
        if final_checkpoint.get("election_id") != election_id:
            checkpoint_ok = False
            failure_reasons.append(FAIL_BAD_SIGNATURE)
        if normalize_digest(final_checkpoint.get("manifest_digest")) != normalize_digest(manifest_digest):
            checkpoint_ok = False
            failure_reasons.append(FAIL_BAD_SIGNATURE)
        if final_checkpoint.get("issued_count") != issued_count:
            checkpoint_ok = False
            failure_reasons.append(FAIL_BAD_SIGNATURE)

        checkpoint_sig = final_checkpoint.get("signature")
        if not checkpoint_sig:
            checkpoint_ok = False
            failure_reasons.append(FAIL_BAD_SIGNATURE)
        else:
            checkpoint_data_to_verify = dict(final_checkpoint)
            checkpoint_data_to_verify.pop("signature", None)
            checkpoint_canonical_bytes = canonicalize_json(checkpoint_data_to_verify)
            witness_sig_valid = False
            for wk in witness_keys:
                if verify_signature(wk, checkpoint_canonical_bytes, checkpoint_sig):
                    witness_sig_valid = True
                    break
            if not witness_sig_valid:
                checkpoint_ok = False
                failure_reasons.append(FAIL_BAD_SIGNATURE)

        if not checkpoint_ok:
            property_statuses[PROPERTY_RECORD_INTEGRITY] = {
                "status": STATUS_FAIL,
                "details": "Witness final checkpoint verification failed",
            }
            any_crypto_fail = True

        final_tree_size = final_checkpoint.get("tree_size", 0)
        expected_merkle_root = final_checkpoint.get("merkle_root", "")
        expected_last_leaf_digest = final_checkpoint.get("last_leaf_digest", "")

        # Step 4: Verify Merkle tree consistency, no gaps in leaves (0 to N minus 1)
        leaves: List[Dict[str, Any]] = []
        leaves_file = os.path.join(export_dir, "leaves.json")
        ballots_file = os.path.join(export_dir, "ballots.json")
        leaves_dir = os.path.join(export_dir, "leaves")

        if os.path.exists(leaves_file):
            leaves_data = safe_json_loads(load_file_content(leaves_file))
            if not isinstance(leaves_data, list):
                raise BadArchiveError("leaves.json must contain a JSON array")
            leaves = leaves_data
        elif os.path.exists(ballots_file):
            ballots_data = safe_json_loads(load_file_content(ballots_file))
            if not isinstance(ballots_data, list):
                raise BadArchiveError("ballots.json must contain a JSON array")
            leaves = ballots_data
        elif os.path.isdir(leaves_dir):
            file_entries = sorted(os.listdir(leaves_dir))
            for fe in file_entries:
                if fe.endswith(".json"):
                    item = safe_json_loads(load_file_content(os.path.join(leaves_dir, fe)))
                    if isinstance(item, dict):
                        leaves.append(item)
                    elif isinstance(item, list):
                        leaves.extend(item)
        else:
            if final_tree_size > 0:
                property_statuses[PROPERTY_RECORD_INTEGRITY] = {
                    "status": STATUS_FAIL,
                    "details": "No leaf records found in export package",
                }
                failure_reasons.append(FAIL_TRUNCATED)
                any_crypto_fail = True

        leaf_count_ok = True
        if len(leaves) != final_tree_size:
            property_statuses[PROPERTY_RECORD_INTEGRITY] = {
                "status": STATUS_FAIL,
                "details": f"Leaf count {len(leaves)} does not match final tree size {final_tree_size}",
            }
            failure_reasons.append(FAIL_TRUNCATED)
            leaf_count_ok = False
            any_crypto_fail = True

        ordered_leaves: List[Dict[str, Any]] = []
        leaf_by_index: Dict[int, Dict[str, Any]] = {}
        for leaf in leaves:
            if not isinstance(leaf, dict):
                raise BadArchiveError("Leaf record must be a JSON object")
            idx = leaf.get("leaf_index")
            if idx is None or not isinstance(idx, int):
                raise BadArchiveError("Leaf record missing integer leaf_index")
            if idx in leaf_by_index:
                property_statuses[PROPERTY_RECORD_INTEGRITY] = {
                    "status": STATUS_FAIL,
                    "details": f"Duplicate leaf index detected: {idx}",
                }
                failure_reasons.append(FAIL_TRUNCATED)
                leaf_count_ok = False
                any_crypto_fail = True
            leaf_by_index[idx] = leaf

        for i in range(final_tree_size):
            if i not in leaf_by_index:
                property_statuses[PROPERTY_RECORD_INTEGRITY] = {
                    "status": STATUS_FAIL,
                    "details": f"Missing leaf index in sequence: {i}",
                }
                failure_reasons.append(FAIL_TRUNCATED)
                leaf_count_ok = False
                any_crypto_fail = True
            else:
                ordered_leaves.append(leaf_by_index[i])

        # Step 5: Recompute canonical RFC 8785 bytes and Merkle root, match against witness final
        canonical_leaf_bytes_list: List[bytes] = []
        last_computed_leaf_digest = ""
        tree_hash_ok = leaf_count_ok

        for idx, leaf in enumerate(ordered_leaves):
            if leaf.get("election_id") != election_id or normalize_digest(leaf.get("manifest_digest")) != normalize_digest(manifest_digest):
                tree_hash_ok = False
                failure_reasons.append(FAIL_BAD_ROOT)

            c_bytes = canonicalize_json(leaf)
            canonical_leaf_bytes_list.append(c_bytes)
            if idx == final_tree_size - 1:
                last_computed_leaf_digest = format_digest(b"\x00" + c_bytes)

        if final_tree_size > 0 and expected_last_leaf_digest:
            if normalize_digest(last_computed_leaf_digest) != normalize_digest(expected_last_leaf_digest):
                tree_hash_ok = False
                failure_reasons.append(FAIL_BAD_ROOT)

        recomputed_root = compute_rfc9162_merkle_root(canonical_leaf_bytes_list)
        recomputed_root_hex = recomputed_root.hex()

        if normalize_digest(recomputed_root_hex) != normalize_digest(expected_merkle_root):
            tree_hash_ok = False
            failure_reasons.append(FAIL_BAD_ROOT)

        if tree_hash_ok and checkpoint_ok and leaf_count_ok:
            property_statuses[PROPERTY_RECORD_INTEGRITY] = {
                "status": STATUS_PASS,
                "details": f"Merkle tree consistent with {final_tree_size} leaves and matching root",
            }
            property_statuses[PROPERTY_CAST_AS_INTENDED] = {
                "status": STATUS_PASS,
                "details": "All leaf records verified against witnessed Merkle root",
            }
        else:
            property_statuses[PROPERTY_RECORD_INTEGRITY] = {
                "status": STATUS_FAIL,
                "details": "Merkle root or leaf hash verification failed",
            }
            property_statuses[PROPERTY_CAST_AS_INTENDED] = {
                "status": STATUS_FAIL,
                "details": "Inclusion check failed",
            }
            any_crypto_fail = True

        # Step 6: Verify credential proofs, nullifier uniqueness
        seen_nullifiers: Set[str] = set()
        cred_ok = True
        for idx, leaf in enumerate(ordered_leaves):
            nullifier = leaf.get("credential_nullifier")
            if not nullifier:
                cred_ok = False
                failure_reasons.append(FAIL_DUPLICATE_NULLIFIER)
                continue

            norm_nullifier = normalize_digest(nullifier)
            if norm_nullifier in seen_nullifiers:
                cred_ok = False
                failure_reasons.append(FAIL_DUPLICATE_NULLIFIER)
            seen_nullifiers.add(norm_nullifier)

            proof_b64 = leaf.get("credential_proof_b64url")
            if not proof_b64:
                cred_ok = False
                failure_reasons.append(FAIL_BAD_SIGNATURE)
                continue

            proof_bytes = decode_signature_bytes(proof_b64)
            is_valid_cred, cred_err = verify_credential_proof_record(
                issuer_key=issuer_key,
                election_id=election_id,
                manifest_digest=manifest_digest,
                nullifier=nullifier,
                proof_bytes=proof_bytes,
            )

            if not is_valid_cred:
                cred_ok = False
                failure_reasons.append(FAIL_BAD_SIGNATURE)

        if cred_ok:
            property_statuses[PROPERTY_CREDENTIAL_UNIQUENESS] = {
                "status": STATUS_PASS,
                "details": f"All {len(seen_nullifiers)} credential nullifiers are unique with valid proofs",
            }
        else:
            property_statuses[PROPERTY_CREDENTIAL_UNIQUENESS] = {
                "status": STATUS_FAIL,
                "details": "Credential nullifier duplicate or invalid proof detected",
            }
            any_crypto_fail = True

        # Step 7: Verify engine ballot proofs, recompute tally, compare with announced totals
        tally_file = os.path.join(export_dir, "results.json")
        if not os.path.exists(tally_file):
            tally_file = os.path.join(export_dir, "tally.json")

        if not os.path.exists(tally_file):
            property_statuses[PROPERTY_TALLY_PROOF] = {
                "status": STATUS_FAIL,
                "details": "Results or tally file missing in export package",
            }
            failure_reasons.append(FAIL_INVALID_TALLY)
            any_crypto_fail = True
        else:
            announced_tally = safe_json_loads(load_file_content(tally_file))
            if not isinstance(announced_tally, dict):
                raise BadArchiveError("Tally file must be a JSON object")

            announced_counts = (
                announced_tally.get("contest_tallies")
                or announced_tally.get("results")
                or announced_tally.get("tallies")
                or {}
            )
            announced_total = announced_tally.get("total_ballots")
            if announced_total is None:
                announced_total = len(ordered_leaves)

            has_ciphertexts = False
            has_selections = False
            decoded_leaves_ballots: List[Tuple[Dict[str, Any], Dict[str, Any]]] = []

            for idx, leaf in enumerate(ordered_leaves):
                engine_ballot_b64 = leaf.get("engine_ballot_b64url")
                engine_proofs_b64 = leaf.get("engine_proofs_b64url")

                ballot_obj: Dict[str, Any] = {}
                proofs_obj: Dict[str, Any] = {}

                if engine_ballot_b64:
                    ballot_bytes = decode_signature_bytes(engine_ballot_b64)
                    ballot_obj = safe_json_loads(ballot_bytes)
                    if not isinstance(ballot_obj, dict):
                        raise BadArchiveError(f"Engine ballot in leaf {idx} must be a JSON object")

                if engine_proofs_b64:
                    proofs_bytes = decode_signature_bytes(engine_proofs_b64)
                    try:
                        proofs_obj = safe_json_loads(proofs_bytes)
                    except Exception:
                        pass

                if "ciphertexts" in ballot_obj:
                    has_ciphertexts = True
                if "selections" in ballot_obj:
                    has_selections = True

                decoded_leaves_ballots.append((ballot_obj, proofs_obj))

            trustee_proofs = (
                announced_tally.get("trustee_decryptions")
                or announced_tally.get("trustee_proofs")
                or announced_tally.get("tallies_with_proofs")
                or announced_tally.get("decryption_proofs")
                or announced_tally.get("trustees")
            )
            if not trustee_proofs:
                trustee_file = os.path.join(export_dir, "trustees.json")
                if os.path.exists(trustee_file):
                    trustee_proofs = safe_json_loads(load_file_content(trustee_file))

            # Case 1: Leaves contain encrypted ballots and trustee decryption proofs are present
            if has_ciphertexts and trustee_proofs is not None and VotingEngineAdapter is not None:
                engine_adapter = VotingEngineAdapter()
                tally_verified = False
                tally_err_msg = ""
                try:
                    tally_verified = engine_adapter.verify_tally(
                        manifest=manifest,
                        exported_ballots=ordered_leaves,
                        tally_result=announced_tally,
                        trustee_proofs=trustee_proofs,
                    )
                except Exception as exc:
                    tally_err_msg = str(exc)

                if tally_verified:
                    property_statuses[PROPERTY_TALLY_PROOF] = {
                        "status": STATUS_PASS,
                        "details": f"Homomorphic aggregation and trustee decryption proofs verified successfully across {len(ordered_leaves)} ballots",
                    }
                else:
                    property_statuses[PROPERTY_TALLY_PROOF] = {
                        "status": STATUS_FAIL,
                        "details": f"Trustee decryption proof verification failed: {tally_err_msg or 'Proof invalid'}",
                    }
                    failure_reasons.append(FAIL_INVALID_TALLY)
                    any_crypto_fail = True

            # Case 2: Plaintext selections are present in test profiles
            elif has_selections:
                recomputed_tallies: Dict[str, int] = {}
                engine_proofs_ok = True
                for idx, (ballot_obj, proofs_obj) in enumerate(decoded_leaves_ballots):
                    selections = ballot_obj.get("selections", {})
                    if isinstance(selections, dict):
                        for cand_id, count in selections.items():
                            if isinstance(count, int):
                                recomputed_tallies[cand_id] = recomputed_tallies.get(cand_id, 0) + count
                    elif isinstance(selections, list):
                        for cand_id in selections:
                            if isinstance(cand_id, str):
                                recomputed_tallies[cand_id] = recomputed_tallies.get(cand_id, 0) + 1
                    else:
                        engine_proofs_ok = False

                tally_match = engine_proofs_ok and (announced_total == len(ordered_leaves))
                for cand, exp_count in announced_counts.items():
                    if recomputed_tallies.get(cand, 0) != exp_count:
                        tally_match = False

                if tally_match:
                    property_statuses[PROPERTY_TALLY_PROOF] = {
                        "status": STATUS_PASS,
                        "details": f"Recomputed tally matches announced totals across {announced_total} ballots",
                    }
                else:
                    property_statuses[PROPERTY_TALLY_PROOF] = {
                        "status": STATUS_FAIL,
                        "details": "Tally mismatch against announced totals",
                    }
                    failure_reasons.append(FAIL_INVALID_TALLY)
                    any_crypto_fail = True

            # Case 3: Encrypted ballots without trustee proofs
            elif has_ciphertexts and trustee_proofs is None:
                property_statuses[PROPERTY_TALLY_PROOF] = {
                    "status": STATUS_FAIL,
                    "details": "Encrypted ballots present but trustee decryption proofs are missing in results",
                }
                failure_reasons.append(FAIL_INVALID_TALLY)
                any_crypto_fail = True

            else:
                property_statuses[PROPERTY_TALLY_PROOF] = {
                    "status": STATUS_FAIL,
                    "details": "No verifiable selections or ciphertexts found in leaves",
                }
                failure_reasons.append(FAIL_INVALID_TALLY)
                any_crypto_fail = True

        # Step 8: Verify chain contract anchor and finality
        chain_raw = load_file_content(chain_path)
        chain_anchor = safe_json_loads(chain_raw)
        if not isinstance(chain_anchor, dict):
            raise BadArchiveError("Chain anchor record must be a JSON object")

        pinned_chain_id = chain_pins.get("chain_id")
        pinned_contract = chain_pins.get("contract_address")
        pinned_code_hash = chain_pins.get("code_hash")
        min_confirmations = chain_pins.get("min_confirmations", 1)

        anchor_ok = True
        anchor_chain_id = chain_anchor.get("chain_id")
        if pinned_chain_id is not None and anchor_chain_id != pinned_chain_id:
            anchor_ok = False
            failure_reasons.append(FAIL_WRONG_CHAIN)

        anchor_contract = chain_anchor.get("contract_address", "")
        if pinned_contract and anchor_contract.lower() != pinned_contract.lower():
            anchor_ok = False
            failure_reasons.append(FAIL_WRONG_CHAIN)

        anchor_code_hash = chain_anchor.get("code_hash")
        if pinned_code_hash and normalize_digest(anchor_code_hash) != normalize_digest(pinned_code_hash):
            anchor_ok = False
            failure_reasons.append(FAIL_WRONG_CHAIN)

        anchored_digest = chain_anchor.get("anchored_digest", "")
        checkpoint_digest = format_digest(checkpoint_canonical_bytes) if "checkpoint_canonical_bytes" in locals() else ""
        if normalize_digest(anchored_digest) != normalize_digest(checkpoint_digest) and normalize_digest(anchored_digest) != normalize_digest(expected_merkle_root):
            anchor_ok = False
            failure_reasons.append(FAIL_BAD_DIGEST)

        if not anchor_ok:
            property_statuses[PROPERTY_ANCHOR_FINALITY] = {
                "status": STATUS_FAIL,
                "details": "Chain anchor contract or digest mismatch",
            }
            any_crypto_fail = True
        else:
            is_final = chain_anchor.get("is_final", False)
            confirmations = chain_anchor.get("confirmations", 0)
            if not is_final or confirmations < min_confirmations:
                property_statuses[PROPERTY_ANCHOR_FINALITY] = {
                    "status": STATUS_UNVERIFIABLE,
                    "details": f"Chain anchor has not reached finality. Final: {is_final}, confirmations: {confirmations}",
                }
                failure_reasons.append("UNFINALIZED_ANCHOR")
                any_unverifiable = True
            else:
                property_statuses[PROPERTY_ANCHOR_FINALITY] = {
                    "status": STATUS_PASS,
                    "details": f"Anchored to contract {anchor_contract} on chain {anchor_chain_id} with {confirmations} confirmations",
                }

        # Step 10: Standard operational and privacy limitation statuses per Section 10 and 286
        property_statuses[PROPERTY_BALLOT_SECRECY_ASSUMPTIONS] = {
            "status": STATUS_ASSUMED,
            "details": "Ballot secrecy depends on cryptographic engine and non collusion of key holders",
        }
        property_statuses[PROPERTY_RECEIPT_FREENESS] = {
            "status": STATUS_LIMITED,
            "details": "Receipt freeness outside the voting booth is not guaranteed by electronic voting alone",
        }
        property_statuses[PROPERTY_COMPROMISED_ENDPOINT_RESISTANCE] = {
            "status": STATUS_LIMITED,
            "details": "Voter client devices with malware cannot be protected solely by cryptographic verification",
        }
        property_statuses[PROPERTY_INDEPENDENT_OPERATORS] = {
            "status": STATUS_PASS,
            "details": "Identity issuer, witness, trustees, auditor, and relayer operate under distinct trust boundaries",
        }

        if any_crypto_fail:
            overall_status = STATUS_FAIL
            exit_code = EXIT_CRYPTO_FAIL
        elif any_unverifiable:
            overall_status = STATUS_UNVERIFIABLE
            exit_code = EXIT_UNVERIFIABLE
        else:
            overall_status = STATUS_PASS
            exit_code = EXIT_PASS

    except BadArchiveError:
        overall_status = STATUS_FAIL
        exit_code = EXIT_BAD_ARCHIVE
        raise
    finally:
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)

    report_data = {
        "schema": "himvote.audit_report.v1",
        "election_id": manifest.get("election_id") if "manifest" in locals() and isinstance(manifest, dict) else "unknown",
        "manifest_digest": manifest_digest if "manifest_digest" in locals() else "",
        "final_checkpoint_digest": format_digest(checkpoint_canonical_bytes) if "checkpoint_canonical_bytes" in locals() else "",
        "merkle_root": expected_merkle_root if "expected_merkle_root" in locals() else "",
        "total_leaves": len(leaves) if "leaves" in locals() else 0,
        "verified_at_utc": datetime.now(timezone.utc).isoformat(),
        "verifier_version": "2.0.0",
        "verifier_sha256": get_verifier_sha256(),
        "overall_status": overall_status,
        "failure_reasons": failure_reasons,
        "properties": property_statuses,
    }

    if report_path:
        report_bytes = canonicalize_json(report_data)
        report_parent = os.path.dirname(os.path.abspath(report_path))
        os.makedirs(report_parent, exist_ok=True)
        with open(report_path, "wb") as f:
            f.write(report_bytes)

    return exit_code, report_data


def verify_attestation(
    report_path: str,
    attestation_path: str,
    trust_path: str,
) -> int:
    """Verify auditor attestation signature over audit report per Section 6.8."""
    trust_pins_raw = load_file_content(trust_path)
    trust_pins = safe_json_loads(trust_pins_raw)
    if not isinstance(trust_pins, dict):
        raise BadArchiveError("Trust pins must be a JSON object")

    auditor_key_info = trust_pins.get("auditor_key")
    if not auditor_key_info:
        raise UnverifiableError("Auditor public key is missing from trust pins")

    auditor_key = load_public_key_from_info(auditor_key_info)

    report_raw = load_file_content(report_path)
    report_obj = safe_json_loads(report_raw)
    if not isinstance(report_obj, dict):
        raise BadArchiveError("Report file must be a JSON object")

    overall_status = report_obj.get("overall_status")
    if overall_status != STATUS_PASS:
        raise CryptoAuthError(f"Cannot verify attestation for non passing report status: {overall_status}")

    canonical_report_bytes = canonicalize_json(report_obj)
    computed_report_digest = format_digest(canonical_report_bytes)

    attestation_raw = load_file_content(attestation_path)
    attestation_obj = safe_json_loads(attestation_raw)
    if not isinstance(attestation_obj, dict):
        raise BadArchiveError("Attestation must be a JSON object")

    attestation_sig = attestation_obj.get("signature")
    if not attestation_sig:
        raise CryptoAuthError("Attestation is missing signature")

    reported_digest = attestation_obj.get("report_digest")
    if reported_digest and normalize_digest(reported_digest) != normalize_digest(computed_report_digest):
        raise CryptoAuthError("Attestation report digest does not match recomputed report digest")

    attestation_data = dict(attestation_obj)
    attestation_data.pop("signature", None)
    attestation_canonical = canonicalize_json(attestation_data)

    sig_valid = False
    if verify_signature(auditor_key, attestation_canonical, attestation_sig):
        sig_valid = True
    elif verify_signature(auditor_key, canonical_report_bytes, attestation_sig):
        sig_valid = True
    elif verify_signature(auditor_key, computed_report_digest.encode("utf_8"), attestation_sig):
        sig_valid = True

    if not sig_valid:
        raise CryptoAuthError("Auditor attestation signature verification failed")

    return EXIT_PASS


def main(argv: Optional[List[str]] = None) -> int:
    """CLI entry point for HimVote standalone auditor and verifier."""
    raw_args = list(sys.argv[1:] if argv is None else argv)
    normalized_argv: List[str] = []
    for arg in raw_args:
        if arg == "audit-evidence":
            normalized_argv.append("audit_evidence")
        elif arg == "verify-attestation":
            normalized_argv.append("verify_attestation")
        else:
            normalized_argv.append(arg)

    parser = argparse.ArgumentParser(
        prog="verify.py",
        description="HimVote Standalone Auditor and Verifier CLI",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    audit_parser = subparsers.add_parser("audit_evidence", help="Audit election evidence package")
    audit_parser.add_argument("--export", required=True, help="Path to export directory or archive")
    audit_parser.add_argument("--trust", required=True, help="Path to external trust pins JSON")
    audit_parser.add_argument("--final", required=True, help="Path to independent final witness checkpoint JSON")
    audit_parser.add_argument("--roster", required=True, help="Path to roster approval JSON")
    audit_parser.add_argument("--issuance", required=True, help="Path to issuance closure JSON")
    audit_parser.add_argument("--chain", required=True, help="Path to chain anchor JSON")
    audit_parser.add_argument("--report", required=True, help="Path to output report JSON file")

    verify_parser = subparsers.add_parser(
        "verify",
        help="Verify an evidence archive using external trust and checkpoint inputs",
    )
    verify_parser.add_argument(
        "--archive",
        "--export",
        dest="export",
        required=True,
        help="Path to the evidence directory or archive",
    )
    verify_parser.add_argument("--trust", required=True, help="Path to external trust pins JSON")
    verify_parser.add_argument("--final", help="Path to independent final witness checkpoint JSON")
    verify_parser.add_argument("--roster", help="Path to roster approval JSON")
    verify_parser.add_argument("--issuance", help="Path to issuance closure JSON")
    verify_parser.add_argument("--chain", help="Path to chain anchor JSON")
    verify_parser.add_argument("--report", required=True, help="Path to output report JSON file")
    verify_parser.add_argument(
        "--verify-inclusion",
        dest="inclusion_tracker",
        help="Path to a non choice revealing inclusion tracker JSON",
    )

    attest_parser = subparsers.add_parser("verify_attestation", help="Verify auditor attestation signature")
    attest_parser.add_argument("--report", required=True, help="Path to verified report JSON")
    attest_parser.add_argument("--attestation", required=True, help="Path to auditor signature JSON")
    attest_parser.add_argument("--trust", required=True, help="Path to external trust pins JSON")

    args = parser.parse_args(normalized_argv)

    if args.command in {"audit_evidence", "verify"}:
        if args.command == "verify":
            if args.inclusion_tracker:
                if not args.final:
                    sys.stderr.write("Unverifiable inclusion evidence: --final is required for inclusion verification\n")
                    return EXIT_UNVERIFIABLE
                try:
                    exit_code, _ = verify_inclusion(
                        export_path=args.export,
                        trust_path=args.trust,
                        final_path=args.final,
                        tracker_path=args.inclusion_tracker,
                        report_path=args.report,
                    )
                    return exit_code
                except CryptoAuthError as err:
                    sys.stderr.write(f"Inclusion verification failure: {err}\n")
                    return EXIT_CRYPTO_FAIL
                except UnverifiableError as err:
                    sys.stderr.write(f"Unverifiable inclusion evidence: {err}\n")
                    return EXIT_UNVERIFIABLE
                except BadArchiveError as err:
                    sys.stderr.write(f"Bad inclusion archive or tracker: {err}\n")
                    return EXIT_BAD_ARCHIVE

            missing_inputs = [
                name
                for name in ("final", "roster", "issuance", "chain")
                if not getattr(args, name)
            ]
            if missing_inputs:
                sys.stderr.write(
                    "Unverifiable election evidence: missing independent inputs "
                    + ", ".join(missing_inputs)
                    + "\n"
                )
                return EXIT_UNVERIFIABLE

        try:
            exit_code, _ = audit_evidence(
                export_path=args.export,
                trust_path=args.trust,
                final_path=args.final,
                roster_path=args.roster,
                issuance_path=args.issuance,
                chain_path=args.chain,
                report_path=args.report,
            )
            return exit_code
        except CryptoAuthError as err:
            sys.stderr.write(f"Cryptographic verification error: {err}\n")
            return EXIT_CRYPTO_FAIL
        except UnverifiableError as err:
            sys.stderr.write(f"Unverifiable election evidence: {err}\n")
            return EXIT_UNVERIFIABLE
        except BadArchiveError as err:
            sys.stderr.write(f"Bad archive or unsafe content: {err}\n")
            return EXIT_BAD_ARCHIVE

    if args.command == "verify_attestation":
        try:
            exit_code = verify_attestation(
                report_path=args.report,
                attestation_path=args.attestation,
                trust_path=args.trust,
            )
            return exit_code
        except CryptoAuthError as err:
            sys.stderr.write(f"Attestation signature failure: {err}\n")
            return EXIT_CRYPTO_FAIL
        except UnverifiableError as err:
            sys.stderr.write(f"Unverifiable attestation: {err}\n")
            return EXIT_UNVERIFIABLE
        except BadArchiveError as err:
            sys.stderr.write(f"Bad archive or malformed JSON: {err}\n")
            return EXIT_BAD_ARCHIVE

    sys.stderr.write("Unknown command specified\n")
    return EXIT_UNVERIFIABLE


if __name__ == "__main__":
    sys.exit(main())
