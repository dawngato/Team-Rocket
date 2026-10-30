# ADR 0001 authoritative architecture

Date: 2026 10 30
Status: accepted for the educational prototype

## Conflict

Historical prompts describe SecureVote, while the repository product namespace is HimVote. Older material also mentions Flutter and WinUI only. The active code contains Next.js, Kotlin Compose, SwiftUI, WinUI, Avalonia Linux, FastAPI, two database domains, a local witness, and a development voting adapter.

## Decision

HimVote remains the active product name. The current repository code and executed tests define implemented behavior. The V9 architecture target is Next.js for web, Kotlin Compose for Android, SwiftUI for iOS, Avalonia for Windows and Linux, FastAPI services, separate identity and casting domains, an offline Python verifier, and optional chain anchoring.

The external encrypted voting engine gate has priority over feature polish. Profile VEEM remains a development adapter and cannot certify a real secret ballot. No production election claim is enabled until an established engine passes the native verifier gate.

The local witness and Anvil chain are simulation infrastructure. They are not independent operators or public consensus. Trust pins are supplied outside an evidence archive.

## Non goals

This repository does not approve live elections, establish coercion resistance, prove complete anonymity, or create a production independent witness. It does not merge Helios, Belenios, ElectionGuard, and Profile VEEM cryptographic formats.

## Migration impact

Existing web, Android, identity, casting, witness, verifier, and development engine tests remain the compatibility baseline. A future external engine must implement a narrow adapter boundary and add native evidence fixtures without changing historical Profile VEEM records.

## Compatibility risks

The current Windows source is WinUI 3 rather than Avalonia. iOS and Foundry require unavailable toolchains. The absent source archives prevent license and upstream finding reconciliation. These are recorded as blockers rather than silently resolved.
