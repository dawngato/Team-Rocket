# HimVote Native iOS Application

HimVote iOS is an institutional election mobile application built with Swift 6 and SwiftUI. The application provides cryptographic voting capabilities for university students, faculty members, and authorized election administrators.

## Core Architectural Principles

* Swift 6 concurrency using modern async await patterns and strict actor boundary isolation.
* SwiftUI user interface driven by Observation framework Observable view models.
* Zero plaintext ballot visibility on mobile device per Section 0.1 Rule 3. Voting choices occur inside an isolated web booth sandbox.
* Dual network origin architecture strictly partitioning student identity services from anonymous ballot casting endpoints.
* Hardware backed enclave security utilizing Apple Keychain with kSecAttrAccessibleWhenUnlockedThisDeviceOnly.
* Universal Links and ASWebAuthenticationSession integration with cryptographic anti CSRF state verification.
* URLSession network transport enforcing public key certificate pinning.

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
│   │   ├── LoginView.swift
│   │   ├── ElectionsView.swift
│   │   ├── CandidateListView.swift
│   │   ├── CredentialIssueView.swift
│   │   ├── VotingBoothView.swift
│   │   ├── ReceiptView.swift
│   │   ├── VerificationView.swift
│   │   └── ResultsView.swift
│   ├── Services/
│   │   ├── ApiClient.swift
│   │   ├── KeychainService.swift
│   │   └── BoothSessionHandler.swift
│   └── DesignSystem/
│       ├── ColorTokens.swift
│       ├── Typography.swift
│       └── StateBadges.swift
└── HimVoteTests/
    ├── MockApiClient.swift
    ├── KeychainServiceTests.swift
    ├── ApiClientTests.swift
    ├── AuthViewModelTests.swift
    ├── CredentialViewModelTests.swift
    ├── VotingViewModelTests.swift
    ├── ReceiptViewModelTests.swift
    └── AuditorViewModelTests.swift
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
