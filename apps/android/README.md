# HimVote Native Android Application

Institutional election client engineered with Kotlin and Jetpack Compose for Himachal Pradesh Technical University.

## Architecture Overview

HimVote Android follows modern Android development standards with single activity architecture, Jetpack Compose Material 3 UI, ViewModel with StateFlow, and Hilt dependency injection.

### Core Modules

* data/models: OpenAPI contract data structures for authentication, elections, candidates, credentials, ballot receipts, and results
* data/storage: Hardware Keystore encrypted storage backed by AES256 GCM to secure sessions and unblinded credentials
* data/network: OkHttp client configured with strict certificate pinning, security interceptors, and an explicit debug host alias
* data/repository: Repositories managing authentication state, ballot roster, blind credential issuance, and Merkle inclusion proofs
* di: Hilt modules injecting encrypted storage, network services, and application repositories
* ui/theme: Design system color palettes, typography, and light plus dark themes
* ui/components: Accessible UI components with 44 point touch target minimums and TalkBack semantics
* ui/navigation: Jetpack Compose NavHost managing routing and App Link deep link returns
* ui/screens: Student authentication, election browsing, candidate manifesto review, issuer-backed blind credentials, voting booth handoff, receipt verification, Merkle inclusion audit, and published election results
* util: Design system tokens, Section 8.2 visible state badges, TalkBack accessibility helpers, and single cast enforcement

## Security Architecture

### Hardware Keystore Storage
User authentication sessions, cryptographic voting credentials, and cast ballot receipts are stored using Android Keystore encrypted preferences. Keystore assets are excluded from cloud backups and device transfers via custom backup rules.

### Certificate Pinning
OkHttp is configured with production certificate pins for both the identity origin and casting origin:
* api.himvote.example.in
* cast.himvote.example.in

In release builds, cleartext HTTP is strictly rejected. In local debug builds, developers can connect to the host alias 10.0.2.2.

### Booth Handoff and Single Cast Rule
Per Section 8.5, ballot casting takes place inside an isolated Chrome Custom Tab session to prevent DOM interception of secret votes. In app WebViews are prohibited. When casting concludes, an authenticated App Link returns the voter to HimVote with their receipt handle and ballot hash.

The SingleCastChecker enforces single ballot submission. Once a ballot receipt is committed to the local hardware Keystore, further submissions for that election are permanently locked.

### Merkle Inclusion Proof
Voters can verify their ballot inclusion directly from the receipt screen. The client recomputes the cryptographic hash path from the voter leaf hash up through witness siblings to confirm a match with the published Merkle root.

## Visible State Badges

Per Section 8.2, election states display unambiguous badges paired with distinct icons so color is never used alone:
* DRAFT: Initial preparation
* FROZEN: Manifest locked and signed
* OPEN: Active voting window
* PENDING_WITNESS: Awaiting witness checkpoint
* WITNESSED: Cryptographically attested by independent witness
* ANCHOR_PENDING: Relaying root to public chain
* ANCHOR_FINALIZED: Confirmed on chain
* AUDIT_PASSED: Mathematical proof verified
* AUDITOR_ATTESTED: Signed with auditor hardware key
* FAILED: Proof verification mismatch
* DISPUTED: Tally anomaly flagged

Green badges appear only when a property is cryptographically verified by the verifier.

## Running Unit Tests

Execute unit tests using the Gradle wrapper:

```bash
./gradlew test
```

Test coverage includes:
* SingleCastCheckerTest: Verifies that double voting is blocked and revoting prohibited
* CertificatePinningTest: Confirms required domain pins and emulator routing
* InclusionProofTest: Validates Merkle tree path computation and tamper rejection
* LoginViewModelTest: Tests credential validation and session state
* ElectionsViewModelTest: Tests summary loading and tab filtering
* VotingViewModelTest: Tests Custom Tabs handoff and App Link return recording
