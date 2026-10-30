# Architecture Decision Record 0001 Authoritative Architecture

Title: Authoritative System Architecture and Trust Boundaries
Date: 30 October 2026
Status: Accepted

## Context

Question 07 of CodeForge 2.0 requires an institutional campus election platform providing strict single vote enforcement, voter privacy, append only verifiable logs, independent witness checkpoints, standalone verification, and multi platform client support.

## Decision

The platform adopts a segregated trust architecture:

1. Platform Technology Choices:
   * Web: Next.js 15 with React 19, TypeScript, Tailwind CSS, and shadcn design system.
   * Android: Kotlin with Jetpack Compose, Material 3, ViewModel, and Chrome Custom Tabs booth isolation.
   * iOS: Swift 6 with SwiftUI, async await, URLSession, and ASWebAuthenticationSession booth isolation.
   * Desktop: C# with Avalonia UI on Windows and Linux, accompanied by a Python Tkinter native Linux inspector.
   * Backend: Python 3.12 with FastAPI, SQLAlchemy 2, Pydantic v2, and Argon2id.

2. Trust Domains and Isolation:
   * Identity Issuer Domain: Handles student authentication, roster matching, and RFC 9474 RSA blind credential issuance.
   * Casting Gateway Domain: Separate network origin receiving anonymous credential proofs and encrypted ballots. Rejects bearer tokens and user identifiers.
   * Log Publisher and Merkle Tree: Builds RFC 9162 append only Merkle trees from canonical RFC 8785 JSON leaf records.
   * Independent Witness: Standalone authority maintaining write ahead log and signing monotonic checkpoint tree roots.
   * Standalone Offline Verifier: Independent Python CLI verifying complete evidence packages without live network access.
   * Supplementary Public Anchor: Ethereum Solidity contract recording monotonic checkpoints.

## Consequences

* Clear separation of duties prevents single point compromise.
* Public verifier can audit election integrity even if backend servers are compromised.
* Educational prototype status is clearly labeled with synthetic student data only.
