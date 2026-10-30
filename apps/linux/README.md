# HimVote Linux Native Desktop Client & Standalone Auditor

The HimVote Linux client is an institutional desktop application and headless CLI engine delivering verifiable election browsing, cryptographic receipt tracking, offline election archive inspection, and reproducible audit verification conforming to RFC 9162, RFC 8785, and Section 6.8 specifications.

It strictly adheres to **Rule 0.1(3)**: native desktop clients never implement ballot encryption directly; voting is handed off securely to the vetted booth API contract.

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
   - Persistent `ReceiptWallet` drawer complying with FreeDesktop XDG standards (`$XDG_DATA_HOME/himvote/receipts.json`).
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

6. **Session & Institutional Identity Portal (`Ctrl+6`)**:
   - Institutional SSO authentication with email, password, and optional MFA token.
   - Quick demo sign-in profiles for disconnected evaluation:
     - Student Voter (Alice Chen)
     - Lead Auditor (Dr. Robert Vance)
     - Election Administrator (Dean Carol Sterling)
   - Live authenticated session status card displaying user role, verified student roster eligibility, and blind token issuance state.

7. **System Settings & Origin Endpoints (`Ctrl+7`)**:
   - Independent origin configuration for Identity Origin, Anonymous Casting Origin, and Independent Witness Origin.
   - Diagnostic round-trip latency ping check for each origin.
   - Cryptographic Trust Pin Store manager (Witness Ed25519, Issuer RSA, EVM Smart Contract) with one-click institutional default restore.
   - Persistent configuration stored in `$XDG_CONFIG_HOME/himvote/settings.json`.

8. **Administrative Audit Trail & Evidence Explorer (`Ctrl+8`)**:
   - Append-only administrative event log viewer with search/filter (`GET /v1/admin/audit_events`).
   - Two-person rule trustee freeze authorization inspection.
   - Manifest sealing and external witness cosignature validation.

---

## Keyboard Navigation

| Shortcut | Action |
|---|---|
| `Ctrl+1` / `Alt+1` | Navigate to Elections Portal |
| `Ctrl+2` / `Alt+2` | Navigate to Receipt Status Verifier |
| `Ctrl+3` / `Alt+3` | Navigate to Offline Election Archive Audit Explorer |
| `Ctrl+4` / `Alt+4` | Navigate to Verification Architecture Explainer |
| `Ctrl+5` / `Alt+5` | Navigate to Security Limits & Institutional Trust Model |
| `Ctrl+6` / `Alt+6` | Navigate to Session & Identity Portal |
| `Ctrl+7` / `Alt+7` | Navigate to System Settings & Origin Endpoints |
| `Ctrl+8` / `Alt+8` | Navigate to Administrative Audit Trail Logs |
| `Ctrl+O` | Open Election Archive File (`.zip`, `.tar.gz`) |
| `Ctrl+D` | Load Bundled Demo Simulation Archive |
| `Ctrl+R` / `F5` | Refresh Current View or Recompute Proof |
| `Ctrl+P` | Recompute / Animate Merkle Proof |
| `Ctrl+H` | Toggle WCAG 2.1 AAA High Contrast Accessibility Theme |
| `Ctrl+K` / `F1` | Open Keyboard Shortcuts Cheat Sheet |
| `Esc` | Dismiss Open Modal Dialog |

---

## CLI & Headless Verification Engine

The application includes a fully featured command-line interface capable of running in headless CI/CD and server environments without an active X11 or Wayland display server:

```bash
# Run headless archive audit:
python3 apps/linux/himvote_linux.py --headless --archive fixtures/simulation_run/export

# Verify a specific receipt handle within the archive:
python3 apps/linux/himvote_linux.py --headless --archive fixtures/simulation_run/export --verify-receipt "0"

# Export reproducible audit reports directly to disk:
python3 apps/linux/himvote_linux.py --headless --archive fixtures/simulation_run/export --export-md report.md --export-json report.json

# Test connectivity to institutional service origins:
python3 apps/linux/himvote_linux.py --check-origins
```

---

## FreeDesktop Packaging & Integration

- **Desktop Entry**: [`apps/linux/desktop/himvote.desktop`](file:///D:/TeamRocket%20Hackathon/Rocket_code_03/Team-Rocket/apps/linux/desktop/himvote.desktop) with desktop actions (`AuditArchive`, `VerifyReceipt`, `Settings`, `Session`).
- **AppStream Metainfo**: [`apps/linux/desktop/io.himvote.HimVote.metainfo.xml`](file:///D:/TeamRocket%20Hackathon/Rocket_code_03/Team-Rocket/apps/linux/desktop/io.himvote.HimVote.metainfo.xml).
- **Bash Shell Completion**: [`apps/linux/desktop/himvote-completion.bash`](file:///D:/TeamRocket%20Hackathon/Rocket_code_03/Team-Rocket/apps/linux/desktop/himvote-completion.bash).
- **Linux Manual Page**: [`apps/linux/desktop/himvote.1`](file:///D:/TeamRocket%20Hackathon/Rocket_code_03/Team-Rocket/apps/linux/desktop/himvote.1).
- **Standalone AppDir / AppImage Builder**: [`apps/linux/desktop/build_standalone.py`](file:///D:/TeamRocket%20Hackathon/Rocket_code_03/Team-Rocket/apps/linux/desktop/build_standalone.py).

---

## Automated Testing

Run the full suite of unit, integration, and UI tests:

```bash
python3 -m pytest apps/linux/tests -v
```

On headless Linux machines or CI runners:

```bash
xvfb-run -a python3 -m pytest apps/linux/tests -v
```
