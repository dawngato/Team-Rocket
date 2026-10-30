# Release Limitations and Educational Prototype Notice

Document Date: 30 October 2026
System: SecureVote / HimVote
Classification: Formal Operational Limitations and Security Boundary Disclosures

## Educational Prototype Warning

This system is an educational engineering prototype built for CodeForge 2.0 Question 07 using synthetic university data exclusively. It must not be deployed or operated in live campus elections without independent external cryptographic audits, professional penetration testing, and regulatory data protection sign off.

## Concrete System Limitations

1. Physical Coercion Outside the Voting Booth:
   * Electronic voting protocols cannot prevent physical coercion if an adversary observes the voter device directly during selection.
   * Cryptographic receipts prove ballot inclusion but cannot guarantee receipt freeness against an observer who watched the entropy generation.

2. Compromised Voter Devices:
   * If a voter phone or laptop is rooted, jailbroken, or infected with malicious software, screen grabbers can observe selections prior to encryption.
   * The system relies on operating system hardware storage (Android Keystore, Apple Keychain, Windows Credential Manager) but cannot defend against compromised OS kernels.

3. Small Cohort Deanonymization:
   * In contests with fewer than ten eligible voters or where voting is unanimous, the homomorphic tally mathematically reveals how individuals voted.
   * The platform marks such outcomes as PRIVACY_LIMITED in manifest metadata.

4. Localhost Operator Emulation:
   * When services, witness, and Anvil blockchain run within the same local Docker Compose environment, they share single host operator custody.
   * True cryptographic independence requires physically separate organizations, separate cloud tenants, and hardware security modules.

5. Upstream Reference Inputs:
   * Helios, Belenios, and ElectChain source archives were not present on local disk.
   * Architecture and findings (H01 through H16, B01 through B17, F01 through F20) were addressed based on verified specification requirements and standards.
