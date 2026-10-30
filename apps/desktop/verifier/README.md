# SecureVote offline verifier

This directory contains a standalone, standard-library-only verifier for a
small synthetic SecureVote evidence wrapper. It is intentionally separate from
the Avalonia desktop application.

The verifier checks:

- strict JSON with duplicate-key and non-finite-number rejection;
- safe directory/ZIP loading with path traversal, symlink, duplicate member,
  encryption, and size-limit checks;
- detached RSA-PKCS#1 v1.5 SHA-256 signatures over canonical manifest and final
  checkpoint payloads;
- election and manifest digest binding to trust pins supplied outside the
  evidence archive;
- contiguous ordered ballot evidence, unique opaque ballot/nullifier values,
  and absence of direct identity or plaintext-choice fields;
- an RFC 6962-style domain-separated Merkle root;
- an independently pinned final witness sequence, tree size, root, and digest;
- the announced tally's canonical digest and shape.

`ENGINE_NATIVE_TALLY` is always reported as `NOT_CHECKED` by this wrapper. It
does not verify Helios or Belenios native ballot validity, trustee decryption,
homomorphic tally proofs, cast-as-intended, coercion resistance, or real-world
eligibility. The synthetic witness keys are test keys under one local operator,
not independent organizational custody.

## Commands

From the desktop workspace:

```bash
python3 -m verifier generate-demo --output /tmp/securevote-verifier-demo
python3 -m verifier verify \
  --archive /tmp/securevote-verifier-demo/valid.zip \
  --trust /tmp/securevote-verifier-demo/valid-trust.json \
  --report /tmp/securevote-verifier-demo/report.json
pytest -q verifier/tests
```

Exit codes are `0` for all supported checks passing with explicit limitations,
`2` for cryptographic/evidence/integrity failure, `3` for unavailable trust
material, and `4` for malformed or unsafe archives.
