# HimVote iOS Source Package

This directory contains Swift and SwiftUI source for the HimVote iOS client, a Swift Package Manager manifest, unit-test sources, preview assets, and a packaging script. This README distinguishes those source files from a complete, signed, installable iOS application.

HimVote is a prototype for local development and controlled demonstrations. Source presence and an IPA filename are not evidence of an installable app or readiness for a real election. Read the [repository overview](../../README.md) and its platform release limitations before making release or security claims.

## Contents

- [Current iOS build status](#current-ios-build-status)
- [Capabilities represented in source](#capabilities-represented-in-source)
- [Architecture](#architecture)
- [Directory map](#directory-map)
- [Requirements](#requirements)
- [Swift package commands](#swift-package-commands)
- [App target and simulator setup](#app-target-and-simulator-setup)
- [Service configuration](#service-configuration)
- [Authentication and prototype data](#authentication-and-prototype-data)
- [Booth handoff and callback handling](#booth-handoff-and-callback-handling)
- [Storage and transport security](#storage-and-transport-security)
- [Tests](#tests)
- [IPA packaging script](#ipa-packaging-script)
- [Accessibility and interface](#accessibility-and-interface)
- [Troubleshooting](#troubleshooting)
- [Work required before distribution](#work-required-before-distribution)
- [Related documentation](#related-documentation)

## Current iOS build status

Package.swift declares a package named HimVote with a HimVoteKit library target rooted at HimVote and a HimVoteTests test target rooted at HimVoteTests. It declares iOS 17 and macOS 14 platform minimums and uses Swift tools version 6.0.

The repository does not include an Xcode project or workspace. The source tree contains a SwiftUI @main app declaration, but the package product is a library, not an Xcode application target. Therefore this checkout does not currently provide a documented, supported simulator launch, archive, signing, or App Store distribution workflow.

The existing build_ipa.sh script creates a ZIP-shaped placeholder package and writes a small generated Mach-O header stub as the executable. It does not compile the Swift sources, invoke xcodebuild, create a signed application, or produce a supported installable iOS app. Do not distribute or install the resulting file as an application.

## Capabilities represented in source

The Swift source includes interfaces and models for:

- Public election browsing and election details.
- Login, account profile, and role presentation.
- Candidate lists and candidate detail sheets.
- Blind credential request and credential state.
- A browser authentication-session handoff to an external booth.
- Receipt status and Merkle inclusion verification.
- Published result presentation.
- Evidence and audit exploration screens.
- Administrator and super-administrator presentation views.
- Security explanations and election guidance.

These are source-level feature areas. A screen existing in the package does not prove that the associated production service, callback domain, certificate configuration, authentication lifecycle, or election protocol has been integrated.

## Architecture

The source uses SwiftUI views and Observation-based view models. The major layers are:

1. **Views** render login, elections, candidates, credentials, voting handoff, receipts, results, profiles, security guidance, and audit information.
2. **ViewModels** maintain view state and coordinate asynchronous client operations.
3. **Models** describe users, elections, candidates, credentials, receipts, and checkpoints.
4. **Services** provide HTTP operations, Keychain storage, booth callbacks, and Merkle proof checks.
5. **DesignSystem** centralizes color, typography, state badges, motion, haptics, materials, and visualizers.

The ApiClient accepts separate identity and casting base URLs. Its default initializer currently uses http://localhost:8080 for both. View models default to constructing ApiClient without overriding these values. This is a local development default, not an iPhone or production endpoint.

## Directory map

Paths are relative to this directory.

| Path | Contents |
| --- | --- |
| Package.swift | Swift Package Manager platforms, library product, and test target. |
| HimVote/HimVoteApp.swift | SwiftUI app and root content view source. |
| HimVote/Models | User, election, candidate, credential, receipt, and checkpoint models. |
| HimVote/ViewModels | Authentication, election, credential, voting, receipt, auditor, and profile state. |
| HimVote/Services/ApiClient.swift | Typed HTTP operations and response handling. |
| HimVote/Services/KeychainService.swift | Keychain access abstraction. |
| HimVote/Services/BoothSessionHandler.swift | External browser session and callback handling. |
| HimVote/Services/MerkleProofVerifier.swift | Local Merkle inclusion-path verification. |
| HimVote/Views | SwiftUI screens and detail sheets. |
| HimVote/DesignSystem | Shared tokens, badges, materials, animations, haptics, and visualizer components. |
| HimVote/Info.plist | Application metadata source file; it is not part of a checked-in Xcode project. |
| HimVoteTests | Swift Package test target source. |
| preview | Static HTML preview and preview artifacts. |
| build_ipa.sh | Placeholder packaging script; not an Xcode build script. |

## Requirements

For Swift package development and tests:

- macOS 14 or newer.
- Swift 6 toolchain, normally installed with a compatible Xcode version.
- Xcode command-line tools selected with xcode-select.

For an actual iOS application and simulator workflow, a supported Xcode installation and iOS Simulator are required, but an Xcode project/workspace and app target must first be added and configured. Swift Package Manager test success on macOS does not prove that an iOS simulator build or device install works.

## Swift package commands

Run commands from apps/ios:

    swift package describe
    swift build
    swift test

The test command runs the Swift Package test target on the selected host platform. Some source imports Apple frameworks such as SwiftUI, Security, and CryptoKit, so Linux is not a supported build environment for this package.

To open the directory in Xcode for inspection:

    open Package.swift

Opening Package.swift can expose the package source in Xcode. It does not create the missing app target, code-signing configuration, simulator launch scheme, provisioning profile, or associated-domain entitlement.

## App target and simulator setup

To make this a runnable iOS app, the project needs a real Xcode application target or an equivalent supported build configuration. That work must define and review:

- Bundle identifier, team, signing identity, and provisioning.
- Deployment target and supported device families.
- App entry point and target membership for the SwiftUI source.
- App transport security policy and production service origins.
- Universal Link Associated Domains entitlement and association file.
- Custom URL scheme ownership and callback collision handling.
- App icon, launch behavior, privacy usage descriptions, and export compliance.
- Simulator and physical-device build configurations.
- CI build, test, signing, artifact retention, and provenance.

Do not infer these items from the checked-in Info.plist or the placeholder IPA.

## Service configuration

ApiClient initializer parameters allow callers to supply identityBaseUrl, castingBaseUrl, pinnedPublicKeyHashes, and a testing-only self-signed-certificate option. Current default URLs are localhost on port 8080; the normal view-model initializers use the defaults.

There is no checked-in .xcconfig, Xcode scheme, or documented environment-variable loader for service origins. For local simulator work, configure the client construction path to use a host reachable from the simulator. An iOS simulator's localhost refers to the simulated device, not automatically to the development host. A physical iPhone's localhost refers to that phone.

Before connecting to real services:

1. Use HTTPS origins controlled by the deployment.
2. Configure identity and casting origins separately.
3. Confirm that the API paths and response models match the active server contract.
4. Supply reviewed certificate pin values if pinning is part of the release design.
5. Keep private keys, credentials, ballot content, and tokens out of URL parameters and logs.

## Authentication and prototype data

The source includes local prototype/demo authentication and hard-coded demo super-user credential constants in AuthViewModel.swift. Those constants are included in source and must not be treated as valid institutional credentials. Remove the demo credential path and any prototype identities before a real release; never reuse prototype passwords.

The view model also contains local role and roster state. Local presentation state is not a source of authority for production roles, student eligibility, or administrator privileges. Those must be confirmed by the identity and administration services.

## Booth handoff and callback handling

BoothSessionHandler uses Apple browser authentication/session APIs for external booth navigation. HimVoteApp.swift observes incoming URLs and posts a notification when it recognizes the configured custom scheme or a specific example host. This is callback handling source, not a verified Universal Link deployment.

The checked-in package does not include an Xcode entitlement file, Associated Domains configuration, or an apple-app-site-association deployment artifact. Until these exist and are verified, an HTTPS Universal Link return cannot be assumed to open the application.

A callback proves only that the browser returned control to the app. The casting service must independently authenticate the receipt and report its state. The app must validate the callback state, election binding, and receipt handle before displaying any accepted, witnessed, or anchored status.

## Storage and transport security

KeychainService wraps Apple Keychain operations. The intended accessibility policy is device-local and available while unlocked, but production use still requires a threat review of every stored value, access group, migration path, error case, and backup behavior.

CertificatePinningDelegate currently accepts an optional set of SHA-256 certificate-data hashes. An empty set falls back to normal platform trust evaluation; it does not enforce a nonempty pin list. The implementation should not be described as SPKI pinning unless its hashing input is changed to the public-key representation and independently tested. The self-signed testing option must remain limited to controlled tests and must never be enabled in production.

Do not store raw ballot choices or secret credential material in ordinary preferences, screenshots, analytics, crash reports, or callback URLs. Apply appropriate screen, clipboard, logging, and background snapshot protections after the app target exists.

## Tests

The test target includes tests for API request behavior, authentication, election and candidate state, credentials, voting, receipts, Keychain storage, callback handling, Merkle verification, profile state, auditor workflows, and design tokens.

Run:

    swift test

Tests use mocks in multiple areas and do not by themselves prove that the app talks to a deployed identity, casting, witness, or engine service. Add an iOS simulator build and device-level smoke suite after adding the Xcode app target.

## IPA packaging script

The current script can be inspected with:

    sed -n '1,240p' build_ipa.sh

It removes and recreates its local build directory, copies the static preview page, writes metadata and icons, emits a small Mach-O header stub, and zips those files into HimVote.ipa. It does not compile the Swift target or invoke Apple's application packaging toolchain. Treat its output as a packaging demonstration only; it is not suitable for installation, TestFlight, or App Store submission.

Do not use this script as a release step. Replace it with an Xcode archive and signing pipeline after the real application target and entitlements are configured.

## Accessibility and interface

The SwiftUI source contains semantic accessibility labels, dynamic text usage, light/dark theme tokens, reduced-motion checks, haptic helpers, and custom state badges. These are implementation features, not a completed accessibility certification.

Review with VoiceOver, Dynamic Type, increased contrast, Reduce Motion, external keyboard, and supported iPhone/iPad form factors. Verify that status is communicated by text and iconography as well as color.

## Troubleshooting

| Symptom | Checks |
| --- | --- |
| Swift is unavailable | Install Xcode or Swift 6 on macOS and select the command-line tools with xcode-select. |
| Package cannot compile on Linux | This source uses Apple-only frameworks; use macOS and a compatible Apple SDK. |
| API calls target the wrong machine | The default is localhost:8080. Inject the reachable simulator or device service URL. |
| TLS trust failure | Confirm HTTPS certificate validity and whether a nonempty certificate pin set was configured for the exact service. |
| App does not open after booth return | Confirm an app target, URL scheme, Associated Domains entitlement, domain association file, callback state, and installed signing profile. |
| IPA appears to build but cannot install | The checked-in script produces a placeholder archive, not a compiled iOS app. |
| Demo user appears authenticated | Remove demo authentication and local role paths before any deployment; do not treat them as server-validated sessions. |

## Work required before distribution

1. Create and review an Xcode app target and scheme.
2. Remove hard-coded demo credentials and local privilege shortcuts.
3. Add environment-specific identity and casting configuration.
4. Review certificate validation and implement the approved pinning design, if required.
5. Configure app links, URL schemes, and callback validation with the deployment domain.
6. Complete simulator, device, accessibility, and API contract testing.
7. Add controlled code signing and artifact provenance in CI.
8. Replace the placeholder IPA script with xcodebuild archive/export steps.
9. Close the repository-level established-engine and independent-witness gates.

## Related documentation

- [Repository overview and platform status](../../README.md)
- [Swift package manifest](Package.swift)
- [iOS services](HimVote/Services)
- [iOS tests](HimVoteTests)
