# HimVote Desktop Clients

HimVote contains a shared C#/.NET 8 Core plus two desktop shells:

* `HimVote.Linux` is an Avalonia client for Linux.
* `HimVote.Windows` contains the Windows WinUI path and a non-Windows source/test compatibility path.

This is a synthetic-data educational prototype. Source presence is not evidence of a native build, a signed MSIX package, an independently operated witness, or suitability for a real election. The local witness and Anvil-style chain flows are demonstrations unless independently operated and externally pinned.

## Architecture and Structure

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
* `AuditExplorerViewModel`: Execution orchestrator for the checked verifier process, side by side comparisons, and reporting.
* `SettingsViewModel`: Update status queries and configuration settings.

### Services

Located in `HimVote.Windows/Services`:
* `ApiClient`: Typed HTTP client communicating with identity, admin, and casting endpoints.
* `SecureStore`: Windows Data Protection API (DPAPI) and Credential Locker integration for session tokens.
* `VerifierRunner`: Child process runner executing the Python verifier CLI with SHA256 verification before every run. It is a separate process, not an OS-level network sandbox.
* `TrustPinStore`: Storage and validator for trust pins chosen from a user selected external file.
* `EvidenceImporter`: Defensive ZIP extractor with path traversal defenses, symlink rejection, and file count and byte limits.
* `ReportExporter`: Deterministic JSON and human readable text export engine.
* `UpdateService`: Version/channel status abstraction; packaging or signed update evidence is not implied by this source.

## Offline Audit Explorer Security Controls

The audit explorer can operate on local evidence without the election API. The client does not itself provide OS-level network isolation; the verifier must be independently reviewed for offline behavior and the operator must treat local process execution accordingly.

1. Safe ZIP Extraction:
* Prevents directory traversal attacks by validating destination boundaries for every file entry.
* Rejects symbolic links and Windows reparse points.
* Enforces limits on maximum file count, maximum entry size, and total uncompressed bytes to guard against archive bombs.

2. Isolated Trust Pins:
* Requires trust pins to be selected by the user from an external file.
* Strictly rejects reading trust pins located inside the imported evidence directory.

3. Checked Verifier Invocation:
* Inspects the SHA256 checksum of the verifier executable or script prior to execution.
* Aborts immediately if the expected checksum does not match the actual file digest.
* Clears common proxy environment variables and sets `NO_PROXY=*`; this is a best-effort environment hygiene measure, not a firewall or process sandbox.

4. Evaluated Verification Properties:
* `RECORD_INTEGRITY`: Verification of Merkle tree history and ballot evidence leaves.
* `CREDENTIAL_UNIQUENESS`: Evaluation of blind credential signatures and nullifier commitments.
* `ROSTER_ATTESTATION`: Verification of authorized institutional registrar roster signatures.
* `TALLY_PROOF`: Verification of native cryptographic ballot tally proofs.
* `ANCHOR_FINALITY`: Validation of the configured checkpoint/chain evidence. A local development chain does not establish independent consensus finality.
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

Build evidence is environment-specific. A Windows WinUI/MSIX build requires the Windows SDK and Windows toolchain; a Linux build exercises the Avalonia project. These commands must be run on the corresponding toolchain and their output retained. In the current development environment, `dotnet` is not on `PATH`, so no native build or test pass is claimed here.
