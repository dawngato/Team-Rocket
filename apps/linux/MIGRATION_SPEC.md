# Linux GUI Migration: tkinter -> Flutter (Material 3)

Goal: rewrite `apps/linux/himvote_linux.py`'s GUI layer in Flutter/Dart while
keeping the headless Python engine (`himvote_linux.py --headless` / `verifier/`)
unchanged. "Create the same Linux app with a modern UI."

## Hard rules
1. Keep `apps/linux` as a Flutter project. Reuse existing packaging:
   `desktop/himvote.desktop`, `desktop/io.himvote.HimVote.metainfo.xml`,
   `desktop/himvote.1`, `desktop/himvote-completion.bash`, `desktop/build_standalone.py`.
2. No ballot crypto in Dart. Rule 0.1(3): client hands votes to Casting Origin.
   Offline/audit verification calls the Python headless engine as-is.
3. Code against `apps/linux/API_CONTRACT.md` — never invent endpoints.
4. Use Material 3 theming, High-Contrast toggle (WCAG 2.1 AAA — the tkinter app
   already had `Ctrl+H` high-contrast). Theme default: classic LIGHT (white)
   with dark mode via the shell sun/moon toggle or Ctrl+T (user decision
   2026-10-31 — overrides the earlier "dark mode default" wording; see
   lib/design/himvote_theme.dart and AppSettings.themePreference).
5. Modern/3D/visual elements are OK (the app had isometric pipelines, 3D ballot
   box, animated Merkle proofs) — implement them with Flutter widgets/animations.

## Screens to port (from tkinter HimVoteLinuxApp, nav = Ctrl+1..8)
| # | Tkinter screen/class | Flutter equivalent |
|---|----------------------|--------------------|
| 1 | Elections portal (filter by status, search, candidate modals) | ElectionsPage + CandidateDetailModal |
| 2 | Receipt verifier (4-stage pipeline SUBMITTED->ACCEPTED->WITNESSED->ANCHORED) + ReceiptWallet drawer | ReceiptVerifyPage + stages |
| 3 | Offline audit explorer (archive zip/tar.gz, overview, Merkle visualizer, tally charts, report export) | AuditExplorerPage |
| 4 | Verification architecture explainer (Tier 1-4) | ExplainPage |
| 5 | Security limits / trust model (Section 0.1(7)) | TrustModelPage |
| 6 | Session & identity portal (SSO login, MFA, demo profiles) | SessionPage |
| 7 | System settings & origins (3 origins, latency ping, Trust Pin store) | SettingsPage |
| 8 | Admin audit trail (append-only log, trustee freeze, cosign) | AdminAuditPage |

## Key modals/widgets to port
- CandidateDetailModal, ReceiptInspectionModal, ResultsComparisonModal
  (split-view announced vs recomputed + DIFF chips), VotingBoothModal,
  CreateElectionModal, StudentRegistrationModal, KeyboardShortcutsModal.
- BallotBox3DCanvas, IsometricEvidencePipelineCanvas, MerkleTreeVisualizer,
  StatusChip, ToastNotification (all -> Flutter animations/custom painters).

## Data models (port the classes)
Election, Candidate, CandidateTally, Receipt, SavedReceipt, ReceiptWallet,
UserSession, TrustPin, TrustPinStore, AppSettings/AppSettingsStore, AuditEvent.

## Storage (IMPORTANT — keep the same paths so state is compatible)
- Receipts: `$XDG_DATA_HOME/himvote/receipts.json`
- Settings: `$XDG_CONFIG_HOME/himvote/settings.json`
- Flutter: use a local file store writing those same XDG paths (do NOT use
  shared_preferences default which would move them).

## API client
Port `LinuxApiClient` (API_CONTRACT.md): auth, elections, candidates, results,
cast, verify_inclusion, verify_tally, audit-events, health. Include the 3-origin
design (Identity/Casting/Witness) and per-origin base URL config.

## Testing
Keep tests that touch storage/engine (pytest, headless). Add Flutter widget tests
under `apps/linux/test/`. Run `flutter test` for UI, pytest for engine.

## Branch layout (parallel agents — do not edit shared files)
- feat/linux-flutter  (integration — scaffold + API client + models live here)
- feat/linux-elections      (ElectionsPage)
- feat/linux-receipt-audit  (ReceiptVerifyPage + AuditExplorerPage + Merkle)
- feat/linux-identity-settings (SessionPage + SettingsPage + admin audit)
- feat/linux-diagnostics    (ExplainPage + TrustModelPage + 3D/isometric visuals)
Shared files (only scaffold agent touches): lib/main.dart, lib/models/, lib/api/,
lib/screens/nav_shell.dart — merge new screens into them during integration.