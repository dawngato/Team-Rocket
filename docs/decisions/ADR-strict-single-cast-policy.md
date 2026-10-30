# ADR strict single cast policy

Status: limited until external engine selection

HimVote accepts at most one database record for a unique election bound spend commitment. The casting service locks the election row, checks state and time, uses database uniqueness, writes the ballot and outbox in one transaction, and returns an idempotent result for a safe retry.

This is not yet proof that an external engine has no replacement or revoting semantics. Helios and Belenios commonly support revoting. The accepted policy is therefore:

1. A credential issuance slot is unique in the identity domain.
2. A spent commitment is unique in the casting domain when the selected engine supports that evidence.
3. A retry with the same request returns the original outcome.
4. A different request with the same spend commitment is rejected.
5. Closing takes the same authoritative election lock and records the final tree size.
6. A production claim remains blocked until native engine semantics and verifier behavior match this policy.
