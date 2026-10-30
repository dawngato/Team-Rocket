# Cryptographic engine review

## Current decision

Status: BLOCKED for production secret ballot use.

The repository contains Profile VEEM under `services/election_engine`. It is an original development adapter used to exercise evidence serialization, credential shaped data, Merkle logging, tamper detection, and service integration tests. Its local test suite is not an independent review and does not establish that it is a vetted election protocol.

The requested Helios, Belenios, ElectChain, and external audit inputs were not present in the workspace. Their versions, licenses, APIs, tests, and security findings therefore were not inspected. The repository does not claim to have selected or integrated any of them.

## Required engine gate

Before any secret ballot claim can be enabled, an approved engine must pass all of the following with saved evidence:

1. A synthetic election creates and casts a native encrypted ballot.
2. Native proof artifacts are exported.
3. The official or independently usable engine verifier passes outside the HimVote service.
4. A one byte mutation fails verification.
5. The engine and the surrounding protocol enforce one accepted cast without relying on a hidden user interface control.
6. A supported booth or documented client boundary is available.
7. The license, immutable version, maintenance status, and operational trust model are recorded.

The current local adapter tests cover development behavior only. They do not satisfy these requirements because no external engine verifier or source review is bound to the adapter.

## One accepted cast policy

HimVote currently enforces one accepted credential nullifier in its casting test harness. That database behavior is separate from proving that a selected external engine cannot replace or revoke a prior cast. The external engine must be evaluated for its native revoting semantics before this requirement can be marked passed.

## Alternatives

Helios and Belenios are named as candidates in the supplied prompt, but the referenced source archives were not supplied. ElectionGuard is also not pinned or installed in this workspace. No comparative selection claim is made.

## Release consequence

Until this review is completed, the release mode is an educational integrity and protocol demonstration using synthetic data. If an approved engine cannot be integrated, the release must carry a permanent notice that individual ballot secrecy is not provided.

