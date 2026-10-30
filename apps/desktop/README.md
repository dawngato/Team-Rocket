# HimVote Desktop Client (Windows & Linux)

HimVote Desktop is the institutional thick client application supporting both Windows (WinUI 3 on .NET 8) and Linux (Avalonia UI on .NET 8).

## Projects and Architecture

* `HimVote.Core`: Shared, platform-agnostic models (`HimVote.Core.Models`), service interfaces (`HimVote.Core.Services`), and MVVM view models (`HimVote.Core.ViewModels`).
* `HimVote.Windows`: WinUI 3 desktop client targeting Windows 10/11 with DPAPI session protection.
* `HimVote.Linux`: Cross-platform Avalonia UI desktop client targeting modern Linux distributions with FreeDesktop Secret Service session protection.
* `HimVote.Windows.Tests`: xUnit unit tests verifying service and viewmodel contracts.

The client adopts the Model View ViewModel architecture utilizing CommunityToolkit.Mvvm for reactive state management.

### Views

Located in `HimVote.Windows/Views`:
* `LoginPage`: Sign in through institutional identity origin with DPAPI session protection.
* `ElectionsPage`: Overview of available elections with status indicators and booth launch action.
* `CandidatesPage`: Detailed slate of candidate nominations for contested races.
* `ReceiptPage`: Tracker for voter receipts with witness log confirmation status.
* `AdminPage`: Administrative lifecycle controls for roster freeze, election opening, closing, and publication.
* `EvidenceImportPage`: File import workspace with safe archive extraction and external trust pin loading.
* `AuditExplorerPage`: Offline audit interface displaying side by side cryptographic root and tally verification.
* `SettingsPage`: Diagnostic details, version information, and verifier checksum status.

### ViewModels

Located in `HimVote.Windows/ViewModels`:
* `LoginViewModel`: Authentication, session persistence, and credential lifecycle.
* `ElectionsViewModel`: Institutional contest retrieval, filtering, and system browser ballot booth handoff.
* `CandidatesViewModel`: Candidate listing and contest metadata loading.
* `ReceiptViewModel`: Ballot receipt querying against the witness inclusion ledger.
* `AdminViewModel`: Draft election creation, roster freeze commands, open and close operations, and publication requests.
* `EvidenceImportViewModel`: Archive extraction workflow and trust pin importer validations.
* `AuditExplorerViewModel`: Execution orchestrator for the sandboxed verifier, side by side comparisons, and reporting.
* `SettingsViewModel`: Update status queries and configuration settings.

### Services

Located in `HimVote.Windows/Services`:
* `ApiClient`: Typed HTTP client communicating with identity, admin, and casting endpoints.
* `SecureStore`: Windows Data Protection API (DPAPI) and Credential Locker integration for session tokens.
* `VerifierRunner`: Child process runner executing the Python verifier CLI inside an isolated sandbox with SHA256 verification before every run.
* `TrustPinStore`: Storage and validator for trust pins chosen from a user selected external file.
* `EvidenceImporter`: Defensive ZIP extractor with path traversal defenses, symlink rejection, and file count and byte limits.
* `ReportExporter`: Deterministic JSON and human readable text export engine.
* `UpdateService`: Version inspector and MSIX channel update supervisor.

## Offline Audit Explorer Security Controls

The offline audit explorer operates without network connectivity:

1. Safe ZIP Extraction:
* Prevents directory traversal attacks by validating destination boundaries for every file entry.
* Rejects symbolic links and Windows reparse points.
* Enforces limits on maximum file count, maximum entry size, and total uncompressed bytes to guard against archive bombs.

2. Isolated Trust Pins:
* Requires trust pins to be selected by the user from an external file.
* Strictly rejects reading trust pins located inside the imported evidence directory.

3. Sandboxed Verifier Invocation:
* Inspects the SHA256 checksum of the verifier executable or script prior to execution.
* Aborts immediately if the expected checksum does not match the actual file digest.
* Strips proxy environment variables to block outbound network requests.

4. Evaluated Verification Properties:
* `RECORD_INTEGRITY`: Verification of Merkle tree history and ballot evidence leaves.
* `CREDENTIAL_UNIQUENESS`: Evaluation of blind credential signatures and nullifier commitments.
* `ROSTER_ATTESTATION`: Verification of authorized institutional registrar roster signatures.
* `TALLY_PROOF`: Verification of native cryptographic ballot tally proofs.
* `ANCHOR_FINALITY`: Confirmation of consortium blockchain consensus finality.
Each property status is assigned one of: PASS, FAIL, LIMITED, ASSUMED, NOT_SUPPORTED, or UNVERIFIABLE.
Failure classifications include: BAD_SIGNATURE, TRUNCATED, WRONG_CHAIN, INVALID_TALLY, MISSING_FINAL, and STALE_CHECKPOINT.

5. Side by Side Cryptographic Comparison:
* Displays published Merkle root against computed Merkle root.
* Displays published candidate tally against computed candidate tally with discrepancy highlighting.

6. Deterministic Reports:
* Exports canonical JSON reports containing verifier SHA256 hash.
* Exports formatted text summaries for auditing records.

## Building and Testing

Solution file: `HimVote.Windows.sln`

To build the projects:
```bash
dotnet build HimVote.Windows.sln
```

To run the xUnit test suite:
```bash
dotnet test HimVote.Windows.sln
```
