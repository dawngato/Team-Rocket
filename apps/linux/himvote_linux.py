"""Native Linux desktop client for HimVote.

The client is intentionally thin. The server remains authoritative for identity,
eligibility, election timing, and cast enforcement.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import tkinter as tk
from dataclasses import dataclass
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
SURFACE = "#F3F6FA"
WHITE = "#FFFFFF"
TEXT = "#17233B"
MUTED = "#60708A"
LINE = "#D9E2EC"


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


class ApiError(RuntimeError):
    """Raised when the API cannot provide a usable response."""


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
    if status in {"WITNESSED", "ANCHOR_FINALIZED", "AUDIT_PASSED", "AUDITOR_ATTESTED"}:
        return GREEN
    if status in {"PENDING_WITNESS", "ANCHOR_PENDING", "UPCOMING"}:
        return AMBER
    if status in {"FAILED", "DISPUTED"}:
        return "#C23C45"
    return TEAL


class HimVoteLinuxApp(tk.Tk):
    """Accessible desktop shell for Linux election and audit workflows."""

    def __init__(self, api_client: LinuxApiClient | None, verifier_path: Path) -> None:
        super().__init__()
        self.api_client = api_client
        self.verifier_path = verifier_path
        self.elections: list[Election] = []
        self.title("HimVote Linux")
        self.geometry("1120x720")
        self.minsize(880, 600)
        self.configure(bg=SURFACE)
        self._configure_styles()
        self._build_shell()
        self._show_elections()

    def _configure_styles(self) -> None:
        style = ttk.Style(self)
        style.theme_use("clam")
        style.configure("App.TFrame", background=SURFACE)
        style.configure("Nav.TFrame", background=NAVY)
        style.configure("Card.TFrame", background=WHITE, relief="solid", borderwidth=1)
        style.configure("Title.TLabel", background=SURFACE, foreground=NAVY, font=("DejaVu Sans", 24, "bold"))
        style.configure("Body.TLabel", background=SURFACE, foreground=TEXT, font=("DejaVu Sans", 11))
        style.configure("Muted.TLabel", background=SURFACE, foreground=MUTED, font=("DejaVu Sans", 10))
        style.configure("NavTitle.TLabel", background=NAVY, foreground=WHITE, font=("DejaVu Sans", 18, "bold"))
        style.configure("NavBody.TLabel", background=NAVY, foreground="#B7C8DC", font=("DejaVu Sans", 10))
        style.configure("Action.TButton", background=TEAL, foreground=WHITE, padding=(14, 8), font=("DejaVu Sans", 10, "bold"))
        style.map("Action.TButton", background=[("active", NAVY_SOFT)])
        style.configure("Nav.TButton", background=NAVY, foreground=WHITE, padding=(12, 10), anchor="w", font=("DejaVu Sans", 10, "bold"))
        style.map("Nav.TButton", background=[("active", NAVY_SOFT)])
        style.configure("Status.TLabel", background=WHITE, foreground=TEAL, font=("DejaVu Sans", 9, "bold"))

    def _build_shell(self) -> None:
        root = ttk.Frame(self, style="App.TFrame")
        root.pack(fill="both", expand=True)
        navigation = ttk.Frame(root, style="Nav.TFrame", width=230)
        navigation.pack(side="left", fill="y")
        navigation.pack_propagate(False)
        ttk.Label(navigation, text="HimVote", style="NavTitle.TLabel").pack(anchor="w", padx=22, pady=(28, 4))
        ttk.Label(navigation, text="Linux desktop client", style="NavBody.TLabel").pack(anchor="w", padx=22, pady=(0, 30))
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
        header.pack(fill="x", padx=42, pady=(38, 24))
        ttk.Label(header, text=eyebrow.upper(), style="Muted.TLabel").pack(anchor="w")
        ttk.Label(header, text=title, style="Title.TLabel").pack(anchor="w", pady=(8, 6))
        ttk.Label(header, text=detail, style="Body.TLabel", wraplength=760).pack(anchor="w")

    def _show_elections(self) -> None:
        self._clear_content()
        self._header("Student view", "Elections you can follow", "The server decides eligibility and timing. This client only displays confirmed states and hands voting to the supported booth.")
        toolbar = ttk.Frame(self.content, style="App.TFrame")
        toolbar.pack(fill="x", padx=42, pady=(0, 18))
        ttk.Button(toolbar, text="Refresh elections", command=self._load_elections, style="Action.TButton").pack(side="left")
        self.election_status = ttk.Label(toolbar, text="", style="Muted.TLabel")
        self.election_status.pack(side="left", padx=14)
        self.election_list = ttk.Frame(self.content, style="App.TFrame")
        self.election_list.pack(fill="both", expand=True, padx=42, pady=(0, 30))
        self._load_elections()

    def _load_elections(self) -> None:
        try:
            self.elections = self.api_client.get_elections() if self.api_client else demo_elections()
            mode = "Connected to the institutional API" if self.api_client else "Local demo mode. No ballots can be cast."
            self.mode_label.configure(text=mode)
            self.election_status.configure(text=f"{len(self.elections)} elections loaded")
        except ApiError as exc:
            self.elections = demo_elections()
            self.mode_label.configure(text="API unavailable. Showing local demo data only.")
            self.election_status.configure(text=str(exc))
        for child in self.election_list.winfo_children():
            child.destroy()
        for election in self.elections:
            self._election_card(election)

    def _election_card(self, election: Election) -> None:
        card = ttk.Frame(self.election_list, style="Card.TFrame", padding=22)
        card.pack(fill="x", pady=7)
        top = ttk.Frame(card, style="Card.TFrame")
        top.pack(fill="x")
        status = ttk.Label(top, text=f"  {election.state}  ", style="Status.TLabel", foreground=status_colour(election.state))
        status.pack(side="left")
        ttk.Label(top, text=f"Closes {election.closes_at}", background=WHITE, foreground=MUTED, font=("DejaVu Sans", 9)).pack(side="right")
        ttk.Label(card, text=election.title, background=WHITE, foreground=NAVY, font=("DejaVu Sans", 15, "bold")).pack(anchor="w", pady=(14, 5))
        ttk.Label(card, text=f"{election.candidate_count} candidates   Election ID {election.election_id}", background=WHITE, foreground=MUTED, font=("DejaVu Sans", 10)).pack(anchor="w")

    def _show_receipt(self) -> None:
        self._clear_content()
        self._header("Receipt verification", "Follow evidence as it arrives", "A receipt is not a choice receipt. It shows server commitment and later independent evidence.")
        form = ttk.Frame(self.content, style="Card.TFrame", padding=24)
        form.pack(fill="x", padx=42, pady=10)
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
                result.configure(text=f"State: {receipt.status}\nLeaf index: {receipt.leaf_index}\nWitnessed at: {receipt.witnessed_at or 'Not yet witnessed'}", foreground=status_colour(receipt.status))
            except ApiError as exc:
                result.configure(text=str(exc), foreground="#C23C45")

        ttk.Button(form, text="Check receipt", command=lookup, style="Action.TButton").grid(row=2, column=1, sticky="w", pady=(12, 0))

    def _show_audit(self) -> None:
        self._clear_content()
        self._header("Offline audit", "Inspect evidence without the API", "Choose a trusted verifier script. The verifier runs as a separate process and its checksum is shown before execution.")
        panel = ttk.Frame(self.content, style="Card.TFrame", padding=24)
        panel.pack(fill="x", padx=42, pady=10)
        self.audit_status = ttk.Label(panel, text=f"Verifier: {self.verifier_path}", background=WHITE, foreground=TEXT, wraplength=700)
        self.audit_status.pack(anchor="w", pady=(0, 18))
        ttk.Button(panel, text="Choose evidence directory", command=self._choose_evidence, style="Action.TButton").pack(anchor="w")

    def _choose_evidence(self) -> None:
        selected = filedialog.askdirectory(title="Choose HimVote evidence directory")
        if not selected:
            return
        if not self.verifier_path.exists():
            messagebox.showerror("Verifier unavailable", f"Verifier was not found at {self.verifier_path}")
            return
        self.audit_status.configure(text=f"Evidence selected: {selected}\nVerifier ready: {self.verifier_path}", foreground=GREEN)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the HimVote Linux desktop client")
    parser.add_argument("--api-base", default="", help="Institutional API base URL")
    parser.add_argument("--verifier", default="verifier/verify.py", help="Path to the standalone verifier")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    api_client = LinuxApiClient(args.api_base) if args.api_base else None
    app = HimVoteLinuxApp(api_client, Path(args.verifier).resolve())
    app.mainloop()
    return 0


if __name__ == "__main__":
    sys.exit(main())
