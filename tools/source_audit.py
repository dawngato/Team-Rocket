"""Inventory SecureVote source inputs without executing untrusted archives."""

from __future__ import annotations

import argparse
import hashlib
import json
import zipfile
from pathlib import Path
from typing import Any


EXPECTED_DOCUMENTS = [
    "architecture.md",
    "design.md",
    "feature.md",
    "work.md",
    "SecureVote_Three_Repository_Security_Audit.md",
]

EXPECTED_ARCHIVES = [
    "helios-server-master.zip",
    "belenios-master.zip",
    "voting_system_app-main.zip",
]

EXPECTED_CODE_AREAS = [
    "apps/web",
    "apps/android",
    "apps/ios",
    "apps/desktop",
    "apps/linux",
    "services",
    "chain",
    "verifier",
    "tests",
]


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def inspect_archive(path: Path) -> dict[str, Any]:
    """Read archive metadata only. Archive members are never extracted or run."""
    try:
        with zipfile.ZipFile(path) as archive:
            members = archive.infolist()
            names = [member.filename for member in members]
            license_names = [
                name for name in names
                if Path(name).name.lower().startswith(("license", "copying", "notice"))
            ]
            return {
                "present": True,
                "sha256": sha256_file(path),
                "member_count": len(members),
                "sample_members": names[:20],
                "license_candidates": license_names[:20],
                "executed": False,
            }
    except zipfile.BadZipFile as exc:
        return {"present": True, "error": f"invalid zip archive: {exc}", "executed": False}


def build_report(root: Path) -> dict[str, Any]:
    documents = {
        name: {"present": (root / name).is_file(), "sha256": sha256_file(root / name) if (root / name).is_file() else None}
        for name in EXPECTED_DOCUMENTS
    }
    archives = {
        name: inspect_archive(root / name) if (root / name).is_file() else {"present": False, "executed": False}
        for name in EXPECTED_ARCHIVES
    }
    code_areas = {area: (root / area).is_dir() for area in EXPECTED_CODE_AREAS}
    return {
        "tool": "securevote-source-audit",
        "root": str(root),
        "documents": documents,
        "archives": archives,
        "code_areas": code_areas,
        "input_status": "COMPLETE" if all(item["present"] for item in documents.values()) and all(item["present"] for item in archives.values()) else "INCOMPLETE",
        "limitations": [
            "Missing specifications and archives cannot be treated as inspected.",
            "Archive metadata is read without extraction or execution.",
            "A file inventory does not establish protocol correctness or license compatibility.",
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Inventory SecureVote inputs without executing archives")
    parser.add_argument("--root", default=".", help="Repository root")
    parser.add_argument("--output", help="Optional JSON report path")
    args = parser.parse_args()
    report = build_report(Path(args.root).resolve())
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    if args.output:
        Path(args.output).write_text(encoded, encoding="utf-8")
    else:
        print(encoded, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
