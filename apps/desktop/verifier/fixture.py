"""Deterministic synthetic evidence generator used by tests and the demo CLI."""

from __future__ import annotations

import hashlib
import json
import zipfile
from pathlib import Path
from typing import Any

from .canonical import canonical_bytes, canonical_digest
from .core import leaf_hash, merkle_root
from .crypto import sign_rsa_pkcs1_sha256_for_fixture


E = 65537
MANIFEST_N = int(
    "c9064206400478a6033f4cab6646716bd1d74b137f9b23dcb3c6bdeef0289d7ca1a43a5381a41370862723f9c6fb2dfde6588720afd8d4df6d97c1219295c1c906450adb18dd4bc1f337dbdae8fe09dd4fa44467e4f86e4cdd49fb4ef30cd02cd76c591bd13f7f4026b8f15f97a9518b1b0339636b2e190a6d3f4d535e86b135",
    16,
)
MANIFEST_D = int(
    "83b631f45e658f975671570ec688493057e13433a65c43f70b63a076b9ac22e3d21504924a52f2d9bb4c51ea0a51f124769472951c2279f79a9adfd3db737befccc4f66b536979549c6b7d35a74de78bc9aec19c4a179de404c60a25f3629d8943e2f36815b81f3ba9c00cd14e6a021a27a24added0fd1d7285dfa88d5050d81",
    16,
)
WITNESS_N = int(
    "b0e34b2e1db4326df36a6dc677095d26cf34329e5dfcd8776868f9722565548f75edb8f40103bb55d8cec307e2ed78a5bf34c4ee21b6cb76f17fbcc8ceb5ee8b36eb9f4178914b1cd0f6025c0143cba972c52dd28a292102c29fe5bb6a9d2d30d0338a7a1cc4f8d636e3f976ce156f58630a727a5ad52da1d6db7d1aba154abd",
    16,
)
WITNESS_D = int(
    "204304663fd2aad3f4ee7761183ae3fb7d15271a4d481d6f01e30b83ef2021211d402358958ac9b3299ce4635ed73306ffedaef143c2e42f2872c4cad730c575deb391801b880aa302d1e683177021b778b7605940012c27ab974e002e227d3633a281f912c857c09087308fec1ad77693b8c7609558723822b86356e2197261",
    16,
)


def _sig(payload: dict[str, Any], key: str) -> dict[str, str]:
    if key == "manifest":
        key_id, n, d = "synthetic-manifest-key", MANIFEST_N, MANIFEST_D
    else:
        key_id, n, d = "synthetic-witness-key", WITNESS_N, WITNESS_D
    return {
        "algorithm": "RSA-PKCS1-v1_5-SHA256",
        "key_id": key_id,
        "value": sign_rsa_pkcs1_sha256_for_fixture(canonical_bytes(payload), n, d),
    }


def _digest_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _ballots(manifest_digest: str, count: int = 3) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for index in range(count):
        result.append(
            {
                "schema": "himvote.ballot-evidence.v1",
                "election_id": "synthetic-election-001",
                "manifest_digest": manifest_digest,
                "leaf_index": index,
                "ballot_id": f"opaque-ballot-{index}",
                "credential_nullifier": _digest_text(f"nullifier-{index}"),
                "credential_proof_digest": _digest_text(f"credential-proof-{index}"),
                "encrypted_ballot_digest": _digest_text(f"ciphertext-{index}"),
                "validity_proof_digest": _digest_text(f"validity-proof-{index}"),
                "engine_record_version": "synthetic-wrapper-1",
            }
        )
    return result


def _zip_write(path: Path, files: dict[str, bytes]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_STORED) as archive:
        for name in sorted(files):
            info = zipfile.ZipInfo(name, date_time=(2020, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_STORED
            info.create_system = 3
            archive.writestr(info, files[name])


def build_fixture(output_dir: str | Path, scenario: str = "valid") -> tuple[Path, Path]:
    """Write a deterministic archive and external trust pins for one scenario."""

    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)
    manifest_payload = {
        "schema": "himvote.manifest.v1",
        "election_id": "synthetic-election-001",
        "manifest_version": 1,
        "protocol_version": "synthetic-evidence-wrapper-1",
        "candidates": [
            {"id": "candidate-alice", "label": "Alice"},
            {"id": "candidate-bob", "label": "Bob"},
        ],
        "selection_limit": 1,
    }
    manifest_digest = canonical_digest(manifest_payload)
    ballots = _ballots(manifest_digest)
    tally_payload = {
        "schema": "himvote.announced-tally.v1",
        "election_id": "synthetic-election-001",
        "manifest_digest": manifest_digest,
        "accepted_ballots": 3,
        "results": [
            {"candidate_id": "candidate-alice", "votes": 2},
            {"candidate_id": "candidate-bob", "votes": 1},
        ],
    }

    base_ballots = [dict(ballot) for ballot in ballots]
    base_tally_payload = json.loads(json.dumps(tally_payload))

    if scenario == "duplicate":
        ballots[2]["credential_nullifier"] = ballots[1]["credential_nullifier"]
    elif scenario == "insertion":
        ballots.append({**ballots[-1], "leaf_index": 3, "ballot_id": "forged-ballot-3", "credential_nullifier": _digest_text("forged")})
    elif scenario == "deletion":
        ballots = ballots[:2]
    elif scenario == "modification":
        ballots[1]["encrypted_ballot_digest"] = _digest_text("modified-ciphertext")
    elif scenario == "tally":
        tally_payload["results"][0]["votes"] = 1
        tally_payload["results"][1]["votes"] = 2
    elif scenario not in {"valid", "trust-key", "stale-final"}:
        raise ValueError(f"unknown fixture scenario: {scenario}")

    # Attack fixtures mutate the exported evidence while retaining the
    # originally witnessed final checkpoint and its out-of-band digest pins.
    witnessed_ballots = base_ballots
    witnessed_tally_payload = base_tally_payload
    leaf_root = merkle_root([leaf_hash(ballot) for ballot in witnessed_ballots]).hex()
    tally_digest = canonical_digest(witnessed_tally_payload)
    checkpoint_payload = {
        "schema": "himvote.checkpoint.v1",
        "election_id": "synthetic-election-001",
        "manifest_digest": manifest_digest,
        "tree_size": len(witnessed_ballots),
        "merkle_root": leaf_root,
        "final": True,
        "checkpoint_kind": "FINAL",
        "final_sequence": 3,
        "announced_tally_digest": tally_digest,
        "previous_checkpoint_digest": "0" * 64,
    }

    if scenario == "stale-final":
        old_ballots = _ballots(manifest_digest, count=2)
        checkpoint_payload["tree_size"] = 2
        checkpoint_payload["merkle_root"] = merkle_root([leaf_hash(ballot) for ballot in old_ballots]).hex()
        checkpoint_payload["final_sequence"] = 2

    manifest_wrapper = {"payload": manifest_payload, "signature": _sig(manifest_payload, "manifest")}
    witness_wrapper = {"payload": checkpoint_payload, "signature": _sig(checkpoint_payload, "witness")}
    checkpoint_digest = canonical_digest(checkpoint_payload)
    trust = {
        "schema": "himvote.trust-pins.v1",
        "election_id": "synthetic-election-001",
        "manifest_digest": manifest_digest,
        "manifest_key": {
            "key_id": "synthetic-manifest-key",
            "algorithm": "RSA-PKCS1-v1_5-SHA256",
            "n": format(MANIFEST_N, "x"),
            "e": E,
        },
        "witness_key": {
            "key_id": "synthetic-witness-key",
            "algorithm": "RSA-PKCS1-v1_5-SHA256",
            "n": format(WITNESS_N, "x"),
            "e": E,
        },
        "final_checkpoint_digest": checkpoint_digest,
        "final_tree_size": 3,
        "final_sequence": 3,
        "trust_note": "Synthetic out-of-band pins for local tests; not independent operator custody.",
    }
    if scenario == "trust-key":
        trust["manifest_key"]["n"] = format(WITNESS_N, "x")

    files = {
        "manifest.json": canonical_bytes(manifest_wrapper),
        "ballots.jsonl": b"\n".join(canonical_bytes(ballot) for ballot in ballots) + b"\n",
        "tally.json": canonical_bytes({"payload": tally_payload}),
        "witness-final.json": canonical_bytes(witness_wrapper),
    }
    archive_path = output / f"{scenario}.zip"
    trust_path = output / f"{scenario}-trust.json"
    _zip_write(archive_path, files)
    trust_path.write_bytes(canonical_bytes(trust))
    return archive_path, trust_path
