"""Run the HTTP ingestion API and optional durable outbox worker together."""

import os
import signal
import subprocess
import sys
import time


processes: list[subprocess.Popen] = []
stopping = False


def stop_processes() -> None:
    for process in processes:
        if process.poll() is None:
            process.terminate()
    for process in processes:
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            process.kill()


def handle_signal(*_signal_args: object) -> None:
    global stopping
    stopping = True


signal.signal(signal.SIGTERM, handle_signal)
signal.signal(signal.SIGINT, handle_signal)

processes.append(
    subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8087"]
    )
)

if os.getenv("ANCHOR_WORKER_ENABLED", "false").lower() in {"1", "true", "yes"}:
    processes.append(subprocess.Popen([sys.executable, "-m", "anchor_relayer.cli"]))

while True:
    if stopping:
        stop_processes()
        sys.exit(0)
    failed = next((process for process in processes if process.poll() is not None), None)
    if failed is not None:
        exit_code = failed.returncode or 0
        stop_processes()
        sys.exit(exit_code)
    time.sleep(0.25)
