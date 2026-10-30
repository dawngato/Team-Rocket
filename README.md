# HimVote Platform

HimVote is an educational institutional election security prototype for synthetic data. It is not approved for real campus elections. Its current evidence demonstrates service boundaries, integrity checks, audit fixtures, and client flows. It does not prove complete anonymity, coercion resistance, production engine suitability, or independent operation.

The current cryptographic engine is Profile VEEM, a local development adapter. The SecureVote external engine gate remains blocked until a maintained engine with an independently usable verifier is supplied, integrated, and reviewed. No production secret ballot claim is enabled.

## Core architectural behaviors exercised in development

* Identity and Ballot Separation: Identity records and cast ballots reside in two physically isolated PostgreSQL clusters with distinct network boundaries, credentials, and operators. No table, log, or database view joins a student identity to a cast ballot.
* Standardized Cryptography: Employs RFC 9474 RSA blind signatures for credential issuance, RFC 9162 Merkle tree structures for ordered audit logs, RFC 8785 canonical JSON for deterministic representations, and Argon2id for password security.
* Server Authoritative Lifecycle: The server is the sole authority for eligibility verification, window timings, and one vote enforcement. Clients never determine election rules.
* Multi Layer Auditability: Ballots are submitted, witnessed by independent third parties, anchored to an EVM blockchain, and validated by a standalone auditor tool.

## Client Applications

HimVote delivers native client software across four distinct computing platforms:

### 1. Web Application (apps/web)
* Framework: Next.js 15, React 19, TypeScript, TanStack Query.
* Rendering: Server rendered public informational routes and client side authenticated interfaces.
* Security: Strict Content Security Policy without inline scripts, HttpOnly and Secure session cookies restricted solely to the identity origin, Subresource Integrity validation.
* Accessibility and Localization: Full WCAG 2.2 AA contrast compliance, screen reader support, keyboard navigability, and localized strings for English and Hindi.
* Testing: Vitest for component unit tests and Playwright for browser flows.

### 2. Android Mobile Application (apps/android)
* Framework: Kotlin, Jetpack Compose, Material 3, Navigation Compose, ViewModel with StateFlow, Hilt dependency injection.
* Network and Storage: OkHttp client with certificate pinning, session tokens and credentials secured in Android Keystore backed encrypted storage excluded from cloud backups.
* Casting Booth: Cryptographic booth handoff executed via Custom Tabs with verified App Links and state validation.
* Accessibility: Full TalkBack labeling, dynamic text scaling, and high contrast styling.

### 3. iOS Mobile Application (apps/ios)
* Framework: Swift 6, SwiftUI, NavigationStack, async await patterns, observable view models.
* Storage and Network: Apple Keychain with device unlocked protection for session persistence, URLSession network requests with certificate pinning.
* Booth Interaction: Secure authentication sessions via ASWebAuthenticationSession or SFSafariViewController with Universal Links callback handling.
* Accessibility: Native VoiceOver support, Dynamic Type text sizing, and reduced motion responsiveness.

### 4. Windows Desktop Application (apps/desktop)
* Framework: C#, .NET 8, WinUI 3, Windows App SDK, CommunityToolkit MVVM, MSIX deployment packaging.
* Storage: Windows Data Protection API (DPAPI) and Windows Credential Locker for secure session storage.
* Offline Audit Explorer: Standalone verification station capable of inspecting evidence archives offline without server network connectivity.
* Safe Archive Extraction: Strict validation against directory traversal and symlink attacks with size limits.
* Embedded Verifier: Executes the verified Python auditor executable, validating its SHA256 digest before invocation, and displaying granular cryptographic properties.

### 5. Linux Desktop Demonstration (apps/linux)
* Framework: Native Python Tkinter and ttk desktop application.
* Operation: Runs on Linux without a browser wrapper and clearly labels local demo mode when the API is unavailable.
* Audit: Provides receipt lookup and offline verifier handoff through the shared API and verifier boundary.
* Scope: This is the current Linux demonstration client. It does not implement ballot encryption and does not replace the required cross platform native release review.

## Backend Microservices

All backend services are implemented in Python 3.12 utilizing FastAPI, SQLAlchemy 2, Alembic, and Pydantic v2:

### 1. Identity Issuer Service (services/identity_issuer)
* Port: 8081 (Identity Origin)
* Responsibilities: Student and staff authentication, Argon2id credential checks, institutional roster imports, single sign on federation (OIDC and SAML), and multi factor authentication.
* Credential Issuance: Executes RFC 9474 RSA blind signing for eligible roster members during the designated issuance window. The issuer never observes unblinded voter secrets or serial numbers.
* Bootstrap Protocol: One time initial invitation mechanism for Super Administrator setup, automatically revoked immediately after activation.

### 2. Casting Service (services/casting)
* Port: 8082 (Casting Origin)
* Isolation: Operates on a distinct origin. Edge gateways strip all identity cookies, authorization headers, and tracing metadata before requests reach this service.
* Ingestion: Accepts anonymous encrypted ballots, validates cryptographic proofs and election bindings, derives unique credential nullifiers, and enforces the single ballot constraint.
* Outbox Architecture: Persists committed ballots atomically and registers them in the sequential checkpoint outbox.

### 3. Admin API Service (services/admin_api)
* Port: 8083
* Responsibilities: Administrative management, election lifecycle state transitions, candidate registries, roster snapshot signing, and audit log exploration.
* Publication Gate: Verifies independent auditor cryptographic signatures against pinned public keys before releasing published election results.

### 4. Election Engine Adapter (services/election_engine)
* Port: 8084
* Responsibilities: Interface adapter connecting HimVote to the chosen vetted cryptographic voting engine.
* Functions: Validates ballot encryption proofs, verifies credentials, computes verifiable tallies, and exports proofs.

### 5. Checkpoint Worker Service (services/checkpoint_worker)
* Port: 8085
* Responsibilities: Single writer per election reading outbox rows in strict leaf index order.
* Merkle Log Generation: Constructs the RFC 9162 Merkle tree, produces periodic incremental checkpoints and the final tree digest, and dispatches them to the witness.

### 6. Anchor Relayer Service (services/anchor_relayer)
* Port: 8087
* Responsibilities: Pulls witnessed final checkpoints and submits immutable transactions to the EVM blockchain anchor contract.
* Finality Reconciliation: Tracks block confirmations, guards against chain reorganizations, and records transaction receipts.

## Independent Witness Service (witness)

* Port: 8086
* Operational Model: Operated by an independent external organization with isolated infrastructure, keys, and access controls.
* Verification: Validates manifest digests, monotonic tree growth, and consistency proofs before returning append only cosignatures.

## Blockchain Smart Contracts (chain)

* Contract: HimVoteAnchor.sol (Solidity 0.8.x)
* Node Port: 8545 (Anvil local development node)
* Architecture: Utilizes OpenZeppelin AccessControl. Restricts checkpoint anchoring to authorized relayer accounts.
* Immutability: Guarantees that checkpoint sequence numbers increase monotonically and that final commitments cannot be overwritten or altered.

## Standalone Verifier CLI (verifier)

* Technology: Independent Python CLI located in verifier directory.
* Workflow:
  1. Loads trusted authority pins from a location outside the untrusted election export package.
  2. Verifies manifest integrity, roster approvals, and issuance closure.
  3. Obtains final witness signatures directly from independent storage.
  4. Recomputes RFC 8785 canonical JSON bytes and RFC 9162 Merkle tree roots.
  5. Verifies cryptographic nullifier uniqueness and ballot encryption proofs.
  6. Validates blockchain transaction inclusion and block finality.
  7. Produces comprehensive audit reports with status evaluations across all cryptographic properties.

## Network Ports and Service Matrix

* Port 3000: Web Frontend Client (apps/web)
* Port 8080: Gateway and Reverse Proxy (infrastructure/nginx)
* Port 8081: Identity Issuer Microservice (services/identity_issuer)
* Port 8082: Casting Microservice (services/casting)
* Port 8083: Admin API Microservice (services/admin_api)
* Port 8084: Election Engine Adapter (services/election_engine)
* Port 8085: Checkpoint Worker Service (services/checkpoint_worker)
* Port 8086: Independent Witness Service (witness)
* Port 8087: Blockchain Anchor Relayer (services/anchor_relayer)
* Port 8545: EVM Blockchain Node (Anvil Foundry)
* Port 6379: Redis Cache and Queue
* Port 5432: Identity PostgreSQL Cluster (internal container and host mapping)
* Port 5433: Casting PostgreSQL Cluster (dev host mapping to avoid local port collisions)

## Developer Tooling and Build Orchestration

HimVote provides root level developer automation through both GNU Make and npm:

### Available Commands
* make help: Displays complete command overview.
* make setup: Installs dependencies and prepares workspace.
* make verify_env: Validates active environment against .env.example rules.
* make generate_env: Creates a pre configured local developer .env file.
* make verify_integrations: Runs the automated cross service integration and port checker.
* make test_tools: Runs developer tool unit test suites.
* make test_all: Runs the full automated security and integration test suite.
* make dev_up: Launches the containerized development stack.
* make dev_down: Gracefully terminates the container stack.
* make clean: Removes temporary cache files and python bytecode artifacts.

### Automated Verification Tools
* tools/env_loader.py: Validates variable definitions, port bounds, URL structures, and detects unconfigured placeholder tokens.
* tools/verify_integrations.py: Confirms directory layouts, test vector structures, cross service communication endpoints, and database isolation invariants.

## Campus Vault Monolithic Integration

In addition to the multi service microservice architecture, this repository integrates the Campus Vault standalone educational implementation by Abhishek:

* Strict Identity Decoupling with AcceptedBallot records containing no student identifiers
* Ed25519 digitally signed checkpoints and standalone Python 3 verification script at scripts/verify_election.py
* In browser voter inclusion verification and receipt checking
* Automated security test suite runner at scripts/run-security-tests.mjs
