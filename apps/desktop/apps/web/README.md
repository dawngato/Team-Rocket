# HimVote web demo

This is an isolated Next.js/TypeScript portal for the HimVote educational prototype. It uses synthetic local browser state only and is intentionally labeled **integrity-only**.

## Run

```bash
npm install
npm test
npm run typecheck
npm run build
npm run dev
```

The UI lives in `app/page.tsx`. The documented adapter boundary is `lib/demo.ts`: the pure functions model create, open, cast, duplicate rejection, close, and integrity-only review. A future API adapter can implement the same state transitions without changing the receipt or audit language.

## Explicit non-claims

- No encrypted election engine is connected.
- No tally or decryption proof is implemented.
- No external witness, signed checkpoint, blockchain anchor, or independent auditor key is connected.
- The local receipt is not proof of secrecy, inclusion in a final election, or a counted vote.
- Candidate totals are never used as the source of truth.

All records shown by this package are synthetic and remain in the current browser profile.
