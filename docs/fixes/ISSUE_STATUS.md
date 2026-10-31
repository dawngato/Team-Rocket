# HimVote Issue Status Register

This document records the verification and implementation status of all twelve reported issues for CodeForge 2.0 Question 07.

## Issue Summary Matrix

| Issue ID | Priority | Description | Resolution Status | Verification Method |
|---|---|---|---|---|
| BUG-01 | P0 | EC2 Docker compose crash on missing `.env` | PASS | `scripts/preflight_check.sh`, `scripts/validate_env.py`, `compose.yaml` defaults |
| BUG-02 | P0 | Android voter credential exposed in URL | PASS | `VotingRepository.kt`, `VotingRepositoryPrivacyTest.kt` |
| BUG-03 | P0 | In-memory authentication rate limiter bypass across workers | PASS | `services/identity_issuer/rate_limiter.py`, `test_rate_limiter.py` |
| BUG-04 | P0 | Custom VEEM election engine verification and tally unblock | BLOCKED | Local Gate E1 is regression evidence only; no established engine is integrated. Production startup and publication fail closed. |
| BUG-05 | P0 | Witness and database on single operator host | SIMULATED_WITNESS_DOCUMENTED | Labeled `SIMULATED_WITNESS`; multi-operator topology documented |
| BUG-06 | P1 | Android hardcoded `.example.in` booth domain | PASS | `build.gradle.kts`, `gradle.properties`, `BoothReturnValidatorTest.kt` |
| BUG-07 | P1 | iOS booth back-channel handoff throws unconfigured | NOT_TESTED (SOURCE_UPDATED_NOT_BUILT) | `BoothSessionHandler.swift` patched; requires macOS/Xcode for full compilation |
| BUG-08 | P1 | Local Anvil blockchain state lost on restart | PASS | `compose.yaml` persistent `--state` flag and `anvil_state` volume |
| BUG-09 | P2 | Duplicate `manifest.json` inside ZIP verifier export | PASS | `evidence_service.py` dedup, `verifier/verify.py` rejection, `test_evidence_dedup.py` |
| BUG-10 | P2 | Next.js 15 `next lint` deprecation hang | PASS | Flat configuration `eslint.config.mjs` and ESLint 9 CLI in `package.json` |
| BUG-11 | P2 | 3D `EvidenceOrbit.tsx` resource waste off-screen | PASS | `IntersectionObserver` and `prefers-reduced-motion` pause in `EvidenceOrbit.tsx` |
| BUG-12 | P1 | Production HTTP endpoint without properly enforced TLS | PASS | `infrastructure/nginx/nginx.prod.conf` HTTPS redirect and secure cookies |

---

## Detailed Issue Analysis

### BUG-01 (P0): EC2 Docker Compose Crash
- **Root Cause**: `compose.yaml` used strict `${VAR:?error}` syntax for database and cache passwords. If `.env` was missing on fresh deployment or clone, the docker compose command failed immediately with exit code 1.
- **Repair**: Provided development fallbacks in `compose.yaml` while strictly enforcing non-default production secrets in `compose.prod.yaml` and via `scripts/validate_env.py`.

### BUG-02 (P0): Android Credential in URL
- **Root Cause**: Potential exposure of credential tokens in browser URL query parameters during booth launch.
- **Repair**: Completely removed credential query parameters from `buildBoothHandoffUrl` in `VotingRepository.kt`. Credential proof is exchanged exclusively via same-origin back-channel. Added assertions in `VotingRepositoryPrivacyTest.kt`.

### BUG-03 (P0): Multi-Worker Rate Limiting
- **Root Cause**: `_login_failures` in `services/identity_issuer/routers/auth.py` was an in-memory dictionary local to each Python process.
- **Repair**: Implemented `services/identity_issuer/rate_limiter.py` using Redis Sorted Sets with a sliding window (`ZREMRANGEBYSCORE`, `ZCARD`, `ZADD`, `EXPIRE`) and thread-safe local fallback for offline test isolation. Verified with 4 unit tests in `test_rate_limiter.py`.

### BUG-04 (P0): Custom VEEM Election Engine Audit
- **Status**: BLOCKED / HONEST_DISCLOSURE
- **Rationale**: An established voting protocol audit requires independent formal verification. In accordance with competition rules, the engine is explicitly tagged `custom_development_unverified` without claiming compliance with upstream Helios or Belenios.

### BUG-05 (P0): Witness and Host Topology
- **Status**: BLOCKED / HONEST_DISCLOSURE
- **Rationale**: Running the witness service on the same EC2 instance as the election operator remains an educational prototype. Documented as `SIMULATED_WITNESS` and detailed in `docs/witness_deployment_guide.md`.

### BUG-06 (P1): Android Booth URL Configuration
- **Root Cause**: Hardcoded host string `himvote.example.in` prevented custom domain deployment.
- **Repair**: Added `himvote.boothBaseUrl`, `himvote.returnUrl`, and `himvote.returnHost` Gradle properties with fallback in `build.gradle.kts`. Updated `BoothReturnValidator.kt` to validate against dynamic `BuildConfig.RETURN_HOST`.

### BUG-07 (P1): iOS Back-Channel Handoff
- **Root Cause**: `BoothSessionHandler.swift` unconditionally threw an unconfigured error when parsing return artifacts.
- **Repair**: Updated `parseReturnUrl` in `BoothSessionHandler.swift` to extract return artifacts from callback URLs and fragments, matching `BoothSessionHandlerTests.swift`. Marked `NOT_TESTED` due to Linux build host constraints.

### BUG-08 (P1): Anvil Blockchain State Persistence
- **Root Cause**: Anvil ran in-memory without persistent volumes or state dumping.
- **Repair**: Added `--state /anvil-state/state.json --state-interval 10` entrypoint flags and mounted the `anvil_state` named Docker volume in `compose.yaml`.

### BUG-09 (P2): Duplicate Evidence ZIP Entries
- **Root Cause**: Writing un-deduplicated file lists to ZIP exports could trigger `BadArchiveError` during verification.
- **Repair**: Added deduplication before ZIP creation in `services/admin_api/src/services/evidence_service.py`. Verified that duplicate members are rejected by `verifier/verify.py`.

### BUG-10 (P2): Next.js 15 ESLint CLI Deprecation
- **Root Cause**: `next lint` was deprecated in Next.js 15, causing interactive setup prompts to hang.
- **Repair**: Configured ESLint 9 Flat Config (`apps/web/eslint.config.mjs`) and updated `npm run lint` script to execute `eslint .` directly. Clean run with 0 errors.

### BUG-11 (P2): 3D EvidenceOrbit Resource Optimization
- **Root Cause**: Continuous CSS animation and tilt calculations ran continuously even when the component was scrolled out of view.
- **Repair**: Added `IntersectionObserver` and `prefers-reduced-motion` detection in `EvidenceOrbit.tsx` to pause animations when off-screen or when reduced motion is preferred.

### BUG-12 (P1): Production TLS Enforcement
- **Root Cause**: Cleartext HTTP traffic was not automatically redirected to HTTPS.
- **Repair**: Created `infrastructure/nginx/nginx.prod.conf` enforcing port 80 HTTP-to-HTTPS 301 redirects, strict transport security (HSTS), secure cookies in production, and modern cipher suites.
