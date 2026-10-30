"""Independent tally verifier for HimVote Profile VEEM.
Can be executed as standalone module or integrated into verification pipelines.
"""

import argparse
import json
import sys
from typing import Any, Dict

if __package__ in (None, ""):
    import os
    import sys
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
    try:
        from services.election_engine.adapter import VotingEngineAdapter
    except ModuleNotFoundError:
        from HimVote.services.election_engine.adapter import VotingEngineAdapter
else:
    from .adapter import VotingEngineAdapter


def run_verification(
    manifest_path: str,
    export_path: str,
    tally_path: str,
    trustee_proofs_path: str,
) -> bool:
    """Run full independent tally and ballot proofs verification."""
    with open(manifest_path, "r", encoding="utf_8") as f:
        manifest = json.load(f)
    with open(export_path, "r", encoding="utf_8") as f:
        export_data = json.load(f)
    with open(tally_path, "r", encoding="utf_8") as f:
        tally_result = json.load(f)
    with open(trustee_proofs_path, "r", encoding="utf_8") as f:
        trustee_proofs = json.load(f)

    adapter = VotingEngineAdapter()
    return adapter.verify_tally(
        manifest=manifest,
        exported_ballots=export_data,
        tally_result=tally_result,
        trustee_proofs=trustee_proofs,
    )


def main() -> None:
    """CLI entrypoint for standalone verifier."""
    if len(sys.argv) == 5 and not sys.argv[1].startswith("-"):
        manifest_path = sys.argv[1]
        export_path = sys.argv[2]
        tally_path = sys.argv[3]
        trustee_proofs_path = sys.argv[4]
    else:
        parser = argparse.ArgumentParser(description="HimVote Independent Tally Verifier")
        parser.add_argument("--manifest", required=True, help="Path to manifest json file")
        parser.add_argument("--export", required=True, help="Path to exported ballots json file")
        parser.add_argument("--tally", required=True, help="Path to tally result json file")
        parser.add_argument("--trustees", required=True, help="Path to trustee proofs json file")
        args = parser.parse_args()
        manifest_path = args.manifest
        export_path = args.export
        tally_path = args.tally
        trustee_proofs_path = args.trustees

    try:
        success = run_verification(
            manifest_path=manifest_path,
            export_path=export_path,
            tally_path=tally_path,
            trustee_proofs_path=trustee_proofs_path,
        )
        if success:
            print("VERIFICATION_SUCCESS: All cryptographic proofs and tallies verified")
            sys.exit(0)
        else:
            print("VERIFICATION_FAILED: Verification returned false")
            sys.exit(2)
    except Exception as exc:
        print(f"VERIFICATION_ERROR: {exc}")
        sys.exit(2)


if __name__ == "__main__":
    main()
