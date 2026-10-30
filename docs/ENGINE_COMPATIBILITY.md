# Voting Engine Compatibility Analysis

Document Date: 30 October 2026
System: SecureVote / HimVote
Classification: Cryptographic Engine Architecture and Integration Protocol

## 1. Engine Candidates Evaluation

<table>
<tr><th>Engine Candidate</th><th>Cryptographic Protocol</th><th>Native Revoting Support</th><th>Verifier Tooling</th><th>Integration Assessment</th></tr>
<tr><td>Helios Server</td><td>Homomorphic ElGamal with Schnorr proofs</td><td>Permits revoting by default; last ballot counted</td><td>Python verifier CLI</td><td>Requires custom wrapper to enforce strict one accepted cast rule; Python compatible</td></tr>
<tr><td>Belenios</td><td>Threshold ElGamal with Chaum Pedersen proofs</td><td>Permits revoting natively; credential authority separate</td><td>OCaml verifier toolchain</td><td>Strongest trustee separation; requires OCaml native toolchain in deployment container</td></tr>
<tr><td>ElectionGuard</td><td>Threshold ElGamal over discrete log or elliptic curves</td><td>Strict single cast with ballot chaining</td><td>Python / C SDK verifier</td><td>Modern JSON schemas; verifiable encryption and Chaum Pedersen proofs</td></tr>
<tr><td>Profile VEEM (Current Adapter)</td><td>Development Profile for Gate E1 verification</td><td>Enforces strict single cast via database nullifiers</td><td>Built in Python standalone verifier</td><td>Active development adapter; requires opt in flag for development fixtures</td></tr>
</table>

## 2. Gate E1 Decision and Constraints

1. Production Requirement:
   * Production deployment must interface with a compiled, vetted engine (such as Belenios or ElectionGuard) through the `ElectionEngineAdapter` interface.
   * Android, iOS, Web, and Desktop clients must never implement custom ballot encryption; they use the official booth or WebAssembly runtime of the vetted engine.

2. Single Submission Enforcement:
   * To prevent revoting in engines that natively support multiple casts, HimVote enforces nullifier uniqueness at the database layer before submission to the engine.
   * If a credential nullifier has already been recorded, subsequent submissions are rejected atomically.
