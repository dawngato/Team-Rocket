"""Command-line interface for offline HimVote evidence verification."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .canonical import canonical_bytes
from .core import EXIT_MALFORMED_ARCHIVE, EXIT_OK, inclusion_status, verify_archive
from .fixture import build_fixture


def _write_report(report: object, output: str | None) -> None:
    payload = report.as_dict()  # type: ignore[attr-defined]
    encoded = json.dumps(payload, indent=2, sort_keys=True) + "\n"
    if output:
        Path(output).parent.mkdir(parents=True, exist_ok=True)
        Path(output).write_text(encoded, encoding="utf-8")
    print(encoded, end="")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="himvote-verifier",
        description="Offline verifier for synthetic HimVote evidence bundles.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    verify = subparsers.add_parser("verify", help="verify an evidence archive against external trust pins")
    verify.add_argument("--archive", required=True, help="evidence directory or zip archive")
    verify.add_argument("--trust", required=True, help="out-of-band trust pins JSON")
    verify.add_argument("--report", help="write the machine-readable report to this path")

    inclusion = subparsers.add_parser("inclusion", help="verify an opaque ballot id is included")
    inclusion.add_argument("--archive", required=True)
    inclusion.add_argument("--trust", required=True)
    inclusion.add_argument("--ballot-id", required=True)
    inclusion.add_argument("--report")

    generate = subparsers.add_parser("generate-demo", help="generate deterministic synthetic evidence")
    generate.add_argument("--output", required=True, help="directory for the archive and trust pins")
    generate.add_argument(
        "--scenario",
        default="valid",
        choices=("valid", "duplicate", "insertion", "deletion", "modification", "tally", "trust-key", "stale-final"),
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.command == "generate-demo":
        archive, trust = build_fixture(args.output, args.scenario)
        print(f"archive={archive}")
        print(f"trust={trust}")
        return EXIT_OK
    if args.command == "verify":
        report = verify_archive(args.archive, args.trust)
        _write_report(report, args.report)
        return report.exit_code
    if args.command == "inclusion":
        report = inclusion_status(args.archive, args.trust, args.ballot_id)
        _write_report(report, args.report)
        return report.exit_code
    return EXIT_MALFORMED_ARCHIVE


if __name__ == "__main__":
    sys.exit(main())
