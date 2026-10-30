# HimVote Linux Desktop Client

The Linux client is a native Tkinter and ttk desktop application delivering institutional election browsing, cryptographic receipt tracking, offline election archive inspection, and reproducible audit verification.

It strictly adheres to **Rule 0.1(3)**: native desktop clients never implement ballot encryption; voting is handed off securely to the vetted booth API contract.

---

## Capabilities & Views

1. **Elections & Candidates Portal (`Ctrl+1`)**:
   - Filter by status (*All*, *Active / Open*, *Upcoming*).
   - Real-time search query filtering by election title, ID, candidate name, or slate.
   - Interactive Candidate Profile Modals displaying platform manifestos, slate affiliations, and verified cryptographic identifiers.
   - Specification Rule 0.1(3) hand-off notice.

2. **Cryptographic Receipt Verification (`Ctrl+2`)**:
   - 4-stage pipeline visualization: `1. SUBMITTED` ➔ `2. ACCEPTED` ➔ `3. WITNESSED` ➔ `4. ANCHORED`.
   - Inspection of server commitments (RFC 8785 canonical hashes) and witness co-signed checkpoints.
   - Interactive Certificate Modal with one-click cryptographic inspection.

3. **Offline Election Audit Explorer (`Ctrl+3`)**:
   - Multi-format archive loading: directory, `.zip`, `.tar.gz`, or bundled simulation fixtures.
   - **Archive Overview**: Participatory counts, manifest verification, leaf sequence continuity, and nullifier uniqueness checks.
   - **Reproducible Report Exporter**: One-click generation of signed verification reports in **Markdown (`.md`)** and **JSON (`.json`)**.
   - **RFC 9162 Merkle Visualizer**: Dynamic canvas rendering with step-by-step leaf-to-root highlight animations and sibling inspection.
   - **Candidate Tally Charts**: Proportional bar charts with percentage calculations, leading winner badges, and tie detection.
   - **Standalone Verifier Process**: Embedded execution runner for the external `verifier/verify.py` audit CLI.

4. **Verification Architecture Explainer (`Ctrl+4`)**:
   - Educational breakdown of the 4 independent trust tiers:
     - Tier 1: Student Voter Booth (RFC 9474 Blind Signatures)
     - Tier 2: Tamper-Evident Merkle Log (RFC 8785 JCS & RFC 9162 Append-Only Log)
     - Tier 3: Independent Witness Co-signing (Ed25519 Checkpoints)
     - Tier 4: Immutable Blockchain Anchor (EVM Smart Contract Consensus)

5. **Institutional Trust Model & Security Limits (`Ctrl+5`)**:
   - Strict Section 0.1(7) compliance: transparent disclosure of mathematical guarantees (Cast-as-intended, Recorded-as-cast, Tallied-as-recorded) alongside honest witness assumptions and physical device boundaries.

---

## Keyboard Navigation

| Shortcut | Action |
|---|---|
| `Ctrl+1` / `Alt+1` | Navigate to Elections View |
| `Ctrl+2` / `Alt+2` | Navigate to Receipt Status View |
| `Ctrl+3` / `Alt+3` | Navigate to Offline Audit View |
| `Ctrl+4` / `Alt+4` | Navigate to Verification Architecture |
| `Ctrl+5` / `Alt+5` | Navigate to Security Limits & Trust Model |
| `Ctrl+O` | Open Election Archive File (`.zip`, `.tar.gz`) |
| `Ctrl+D` | Load Bundled Demo Archive |
| `Ctrl+R` / `F5` | Refresh Current View or Recompute Proof |
| `Ctrl+P` | Recompute / Animate Merkle Proof |
| `Ctrl+H` | Toggle High Contrast Accessibility Theme |
| `Ctrl+K` / `F1` | Open Keyboard Shortcuts Cheat Sheet |
| `Esc` | Dismiss Open Modal Dialog |

---

## Run Locally

From the repository root:

```bash
python3 apps/linux/himvote_linux.py
```

To connect to a running institutional API:

```bash
python3 apps/linux/himvote_linux.py --api-base http://localhost:8080
```

Without an `--api-base`, the client boots in local demo mode with sample records and verification fixtures.

---

## Automated Testing

```bash
python3 -m pytest apps/linux/tests -v
```

On a headless Linux machine:

```bash
xvfb-run -a python3 -m pytest apps/linux/tests -v
```
