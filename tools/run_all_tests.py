"""
HimVote unified test runner.
Discovers and executes all test suites across the platform cleanly.
"""

from __future__ import annotations

import os
import re
import sys
import time
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
PARENT = ROOT.parent

SERVICE_DIRS = [
    ROOT,
    PARENT,
    ROOT / "packages" / "himvote_crypto",
    ROOT / "packages" / "test_vectors",
    ROOT / "services" / "identity_issuer",
    ROOT / "services" / "casting",
    ROOT / "services" / "admin_api",
    ROOT / "services" / "election_engine",
    ROOT / "services" / "checkpoint_worker",
    ROOT / "witness",
    ROOT / "services" / "anchor_relayer",
    ROOT / "verifier",
    ROOT / "tests",
]

for directory in SERVICE_DIRS:
    rendered = str(directory)
    if rendered not in sys.path:
        sys.path.insert(0, rendered)


SUITES = [
    ("packages/himvote_crypto", ROOT / "packages" / "himvote_crypto"),
    ("packages/test_vectors", ROOT / "packages" / "test_vectors"),
    ("services/identity_issuer", ROOT / "services" / "identity_issuer"),
    ("services/casting", ROOT / "services" / "casting"),
    ("services/admin_api", ROOT / "services" / "admin_api"),
    ("services/election_engine", ROOT / "services" / "election_engine"),
    ("services/checkpoint_worker", ROOT / "services" / "checkpoint_worker"),
    ("witness", ROOT / "witness"),
    ("services/anchor_relayer", ROOT / "services" / "anchor_relayer"),
    ("verifier", ROOT / "verifier"),
    ("tests", ROOT / "tests"),
]


def parse_pytest_output(output: str) -> tuple[int, int, int]:
    """
    Parse passed, failed, and skipped counts from pytest output.
    """
    passed = 0
    failed = 0
    skipped = 0

    m_passed = re.search(r"(\d+)\s+passed", output)
    if m_passed:
        passed = int(m_passed.group(1))

    m_failed = re.search(r"(\d+)\s+failed", output)
    if m_failed:
        failed = int(m_failed.group(1))

    m_error = re.search(r"(\d+)\s+error", output)
    if m_error:
        failed += int(m_error.group(1))

    m_skipped = re.search(r"(\d+)\s+skipped", output)
    if m_skipped:
        skipped = int(m_skipped.group(1))

    return passed, failed, skipped


def run_suite(name: str, path: Path) -> dict:
    """
    Execute a single test suite using pytest in isolated subprocess.
    """
    suite_dir = str(path)
    base_paths = [
        suite_dir,
        str(ROOT),
        str(PARENT),
        str(ROOT / "services" / "checkpoint_worker"),
        str(ROOT / "packages" / "himvote_crypto"),
        str(ROOT / "witness"),
        str(ROOT / "verifier"),
    ]

    pypath = os.pathsep.join(base_paths)
    env = os.environ.copy()
    env["PYTHONPATH"] = pypath

    start_time = time.time()
    cmd = [sys.executable, "-m", "pytest", str(path), "-q"]
    proc = subprocess.run(
        cmd,
        cwd=str(ROOT),
        env=env,
        capture_output=True,
        text=True,
    )
    elapsed = time.time() - start_time

    output = proc.stdout + "\n" + proc.stderr
    passed, failed, skipped = parse_pytest_output(output)

    success = (proc.returncode == 0)
    if not success and failed == 0:
        failed = 1

    return {
        "name": name,
        "success": success,
        "returncode": proc.returncode,
        "passed": passed,
        "failed": failed,
        "skipped": skipped,
        "elapsed": elapsed,
        "output": output,
    }


def main() -> int:
    """
    Run all suites and present unified summary report.
    """
    print("=" * 76)
    print("HimVote Platform Unified Test Suite Runner")
    print("=" * 76)

    results = []
    total_passed = 0
    total_failed = 0
    total_skipped = 0
    total_time = 0.0
    all_passed = True

    for name, path in SUITES:
        print(f"Running suite: {name} ...", flush=True)
        res = run_suite(name, path)
        results.append(res)

        total_passed += res["passed"]
        total_failed += res["failed"]
        total_skipped += res["skipped"]
        total_time += res["elapsed"]

        if not res["success"]:
            all_passed = False
            print(f"  FAILED with exit code {res['returncode']}")
            print(res["output"])
        else:
            print(f"  PASS in {res['elapsed']:.2f}s ({res['passed']} passed)")

    print("\n" + "=" * 76)
    print("Execution Summary Table")
    print("=" * 76)
    header = f"{'SUITE':<32} {'STATUS':<8} {'PASSED':>8} {'FAILED':>8} {'SKIPPED':>8} {'TIME':>8}"
    print(header)
    print("_" * 76)

    for res in results:
        status_str = "PASS" if res["success"] else "FAIL"
        time_str = f"{res['elapsed']:.2f}s"
        row = f"{res['name']:<32} {status_str:<8} {res['passed']:>8} {res['failed']:>8} {res['skipped']:>8} {time_str:>8}"
        print(row)

    print("=" * 76)
    tot_status = "PASS" if all_passed else "FAIL"
    tot_time_str = f"{total_time:.2f}s"
    tot_row = f"{'TOTAL':<32} {tot_status:<8} {total_passed:>8} {total_failed:>8} {total_skipped:>8} {tot_time_str:>8}"
    print(tot_row)
    print("=" * 76)

    if all_passed:
        print("\nALL TEST SUITES PASSED SUCCESSFULLY")
        return 0
    else:
        print("\nTEST SUITE ENCOUNTERED FAILURES")
        return 1


if __name__ == "__main__":
    sys.exit(main())
