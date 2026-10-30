# SecureVote prompt reconciliation

## 2026 10 30

The active repository is named HimVote and already contains the implementation, tests, fixtures, and documentation for the institutional election prototype. The new SecureVote prompt requests a new repository name and references five Markdown specifications plus three source archives.

The referenced files are not present in the Team Rocket workspace. The repository therefore cannot truthfully claim that Helios, Belenios, ElectChain, or the external security audit were inspected. The missing inputs are recorded by `tools/source_audit.py`.

Decision: preserve HimVote as the active product namespace and apply the SecureVote prompt as a security and verification review until the missing source inputs are supplied. Do not duplicate the repository under a second name, do not import unverified cryptographic code, and do not claim an external engine integration.

Current engine status: Profile VEEM is a development and protocol integration stand in. The existing ADR states that secret ballot claims remain limited until an externally reviewed engine such as ElectionGuard or another approved engine is integrated through the adapter boundary.

This decision is reversible after the four specifications, the audit report, and the three archives are supplied and reviewed.
