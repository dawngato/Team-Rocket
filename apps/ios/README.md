# HimVote Native iOS Application — TailAdmin & iOS Glassmorphic Edition

HimVote iOS is an institutional campus election mobile application built with Swift 6 and SwiftUI. The application provides cryptographic voting capabilities for university students, faculty members, and authorized election administrators, styled with the **TailAdmin** dashboard theme and modern **iOS translucent glassmorphism** aesthetic.

## Core Architectural & Visual Principles

* **TailAdmin Design System**: Clean typography, Tailwind-inspired color tokens (Brand `#465FFF`, Dark Slate `#0F172A`, Slate Cards `#1E293B`, Crisp Borders, Success Emerald `#10B981`, Warning Amber `#F59E0B`, Danger Rose `#EF4444`, Info Sky `#0EA5E9`), 4-metric dashboard stat cards with percentage growth chips, and structured tabular views.
* **iOS Translucent Glassmorphism**: Translucent floating bottom navigation bar (floating dock) and slide-out side menu built with iOS `.ultraThinMaterial` / `.thinMaterial`, frosted blur backgrounds, subtle specular white borders, and ambient drop shadows.
* **Swift 6 Concurrency**: Modern async/await patterns and strict actor boundary isolation.
* **SwiftUI + Observation**: Observable architecture with clean state management across `AuthViewModel`, `ElectionsViewModel`, `CredentialViewModel`, `VotingViewModel`, `ReceiptViewModel`, and `AuditorViewModel`.
* **Zero Plaintext Ballot Visibility**: Voting choices occur strictly inside the isolated web booth sandbox with cryptographic proofs.
* **Dual Network Origin**: Identity and voting records are kept strictly separate. Identity sessions never leak into ballot casting endpoints.
* **Five Mandated Q7 Adversarial Checks**: Interactive verification of duplicate submission rejection, unauthorized insertion detection, deletion detection, ciphertext modification detection, and ZK tally proof mismatch detection.
* **Hardware-Backed Enclave**: Apple Keychain (`kSecAttrAccessibleWhenUnlockedThisDeviceOnly`) for session tokens and blinded credential nonces.
* **EVM Blockchain Anchors**: Independent display and verification of Anvil local EVM checkpoints, transaction hashes, block heights, and Merkle tree roots.

## Directory Structure

```text
apps/ios/
├── Package.swift
├── README.md
├── HimVote/
│   ├── HimVoteApp.swift
│   ├── Info.plist
│   ├── Models/
│   │   ├── Election.swift
│   │   ├── Candidate.swift
│   │   ├── Credential.swift
│   │   ├── Receipt.swift
│   │   ├── Checkpoint.swift
│   │   └── User.swift
│   ├── ViewModels/
│   │   ├── AuthViewModel.swift
│   │   ├── ElectionsViewModel.swift
│   │   ├── CredentialViewModel.swift
│   │   ├── VotingViewModel.swift
│   │   ├── ReceiptViewModel.swift
│   │   └── AuditorViewModel.swift
│   ├── Views/
│   │   ├── MainTabView.swift               # Translucent Navigation Shell & Tab Coordinator
│   │   ├── FloatingBottomBar.swift         # Translucent Floating Bottom Menu (iOS Glass Dock)
│   │   ├── TranslucentSideMenu.swift       # Translucent Slide-Out Menu Drawer (TailAdmin Sidebar)
│   │   ├── TailAdminDashboardView.swift    # 4-Card Metric Grid, Turnout Chart, Checkpoints Table
│   │   ├── VoterBoothPortalView.swift      # Blind Credential Request & Voting Booth Portal
│   │   ├── AuditExplorerView.swift         # Merkle Tree Visualizer, EVM Anchor & 5 Q7 Demos
│   │   ├── RolesProfileView.swift          # Live Role Switcher & Hardware Keychain Vault
│   │   ├── LoginView.swift                 # TailAdmin styled Login View
│   │   ├── ElectionsView.swift             # Election Catalog & Status Filter Pills
│   │   ├── CandidateListView.swift         # Candidate Nominees & Manifest SHA256 Inspector
│   │   ├── CredentialIssueView.swift       # RFC 9474 Blind Token Reservation
│   │   ├── VotingBoothView.swift           # Ephemeral Booth Session Launcher
│   │   ├── ReceiptView.swift               # Inclusion Tracker & Merkle Proof Detail
│   │   ├── VerificationView.swift          # Standalone Evidence Package Verifier
│   │   ├── ResultsView.swift               # Verifiable Results & Candidate Tallies
│   │   ├── MerkleAuditDetailSheet.swift    # Cryptographic Checkpoint Inspector Sheet
│   │   ├── ManifestInspectorSheet.swift    # Signed Election Manifest Inspector Sheet
│   │   ├── MerkleProofSheet.swift          # JSON Inclusion Proof Inspector Sheet
│   │   ├── CandidateDetailSheet.swift      # Candidate Manifesto & Policy Sheet
│   │   ├── ElectionGuidelinesSheet.swift   # Campus Voting Guidelines Sheet
│   │   └── InstitutionalSecuritySheet.swift# Cryptographic Security Architecture Sheet
│   ├── Services/
│   │   ├── ApiClient.swift
│   │   ├── KeychainService.swift
│   │   └── BoothSessionHandler.swift
│   └── DesignSystem/
│       ├── ColorTokens.swift               # TailAdmin Brand & State Color Tokens
│       ├── Typography.swift                # Institutional & Monospaced Digest Typography
│       ├── GlassModifiers.swift            # Ultra-Thin Material & Specular Border Modifiers
│       ├── StateBadges.swift               # Election, Receipt & Credential Status Badges
│       ├── MerkleVisualizer.swift          # Interactive Node Tree Visualizer
│       ├── SpringAnimations.swift          # Apple Fluid Spring Timing Tokens
│       └── HapticFeedback.swift            # UIImpactFeedbackGenerator Tactile Engine
└── HimVoteTests/
    ├── MockApiClient.swift
    ├── KeychainServiceTests.swift
    ├── ApiClientTests.swift
    ├── AuthViewModelTests.swift
    ├── CredentialViewModelTests.swift
    ├── VotingViewModelTests.swift
    ├── ReceiptViewModelTests.swift
    ├── AuditorViewModelTests.swift
    ├── BoothSessionHandlerTests.swift
    ├── ElectionsViewModelTests.swift
    └── DesignSystemTests.swift             # Token, Floating Menu & Glass Component Tests
```

## Security Implementation Details

### Keychain Storage
All sensitive authentication session tokens, voter credential secrets, and cryptographic receipts are persisted via KeychainService using kSecAttrAccessibleWhenUnlockedThisDeviceOnly. This policy guarantees that keys:
* Are decrypted only while the user device is unlocked.
* Are excluded from iCloud backups.
* Cannot migrate across devices during backup restoration or device transfer.

### Network Transport and Certificate Pinning
ApiClient enforces transport security by pinning Subject Public Key Info SHA256 hashes inside CertificatePinningDelegate. Untrusted certificates or unauthorized proxies immediately trigger transport abortion. Identity requests route to the identity origin while cast submissions route exclusively to the casting origin.

### Blind Credential Protocol
CredentialViewModel implements RFC 9474 blinded signature flows. The application generates 256 bits of cryptographically secure random blinding entropy on device, requests an issuer signature over the blinded message, and unblinds the result locally. The identity issuer never learns the ballot authorization token.

### Isolated Booth Session and Universal Links
BoothSessionHandler initiates voting through ASWebAuthenticationSession or SFSafariViewController. The application constructs an ephemeral browsing context passing the election identifier, blinded credential proof, and an unpredictable state token. Once the voter submits their encrypted ballot inside the verified engine booth, the session redirects back via universal link or the custom scheme himvote://booth_return. BoothSessionHandler verifies state equality before submitting the ballot payload to the casting origin outbox.

### Receipt Verification Lifecycle
ReceiptViewModel continuously polls the Merkle tree status of newly submitted ballots:
1. COMMITTED_PENDING_WITNESS: Ballot ciphertext recorded by casting origin.
2. WITNESSED: Independent witness signed Merkle leaf inclusion.
3. ANCHORED: Final root anchored to Ethereum smart contract.

## Accessibility and Inclusivity

* VoiceOver semantic accessibility labels and accessibility hints across all interactive controls.
* Full Dynamic Type font scaling adaptation using system typography definitions.
* High contrast institutional color tokens supporting Light Mode and Dark Mode.
* Environment accessibilityReduceMotion detection to honor user motion sensitivity preferences.

## Build and Test Verification

### Prerequisites
* macOS 14 Sonoma or macOS 15 Sequoia
* Xcode 16 or newer with Swift 6 toolchain
* iOS 17.0 or iOS 18.0 deployment target

### Running Automated Test Suite
From the apps/ios directory, execute the XCTest suite using the Swift Package Manager CLI:
```bash
swift test
```
Or open the package directly in Xcode:
```bash
open Package.swift
```
Select Product > Test (Command + U) to execute all unit and integration test assertions.

### Distribution
Distribution adheres to Section 8.6 guidelines:
* Staged beta distribution via Apple TestFlight.
* Final deployment via App Store phased rollout.
