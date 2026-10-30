# UI QA evidence

Run date: 2026-10-31.

## Commands and actual results

| Command | Result |
|---|---|
| `cd apps/web && npm test` | PASS, 90 tests in 15 files |
| `cd apps/web && npm run build` | PASS, Next.js 15.5.7 production build |
| `cd apps/web && ... with_server.py ... tests/browser_smoke.py` | PASS, public desktop/mobile smoke and protected-route gate |
| `python3 -m pytest -q services/identity_issuer/tests/test_auth_flow.py services/identity_issuer/tests/test_admin_and_approvals.py` | PASS, 8 tests |
| `python3 tools/run_all_tests.py` | PASS, 302 tests across 11 suites |

## Browser checks

- Public home loads with no console/page errors.
- 390px public capture has no horizontal overflow and the mobile menu opens/closes.
- Reduced-motion capture disables the ballot-paper animation and 3D transform.
- Guest `/student/elections/.../cast`, `/student/receipts/.../inclusion`, and `/officer` routes show the identity-service gate; fixture ballot data is not rendered.
- No public role chooser remains in the production header.

## Known limitations

The repository does not provide a configured production identity/election endpoint in this test environment, so authenticated browser journeys are tested as protected unauthenticated gates rather than as claims of a live election. Native iOS, Windows and Linux toolchains remain separate release tracks. This is an educational prototype using synthetic data.
