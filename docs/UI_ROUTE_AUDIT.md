# SecureVote UI route audit

Audit date: 2026-10-31. This register is based on the checked-out Next.js route tree, not on prompt claims.

## Shared shell

| Area | Source | Current behavior | Status |
|---|---|---|---|
| Public shell | `apps/web/src/components/Navbar.tsx`, `apps/web/src/components/Footer.tsx` | Public-only links, theme control, mobile navigation, prototype disclosure; no production role chooser | TESTED_PASS |
| Authenticated shell | `apps/web/src/components/shell/AppFrame.tsx`, `AppShell.tsx` | Requests `/v1/auth/me`, withholds protected children until session confirmation, and renders session-scoped navigation | TESTED_PASS |
| Command search | `apps/web/src/components/shell/CommandSearch.tsx` | Searches only server-role-filtered route destinations; no private resource suggestions | IMPLEMENTED_UNTESTED |
| Mobile navigation | `apps/web/src/components/shell/WorkspaceSidebar.tsx`, `globals.css` | Drawer, scrim, Escape handling through shell, responsive 390px layout | TESTED_PASS |
| Design system | `apps/web/src/app/globals.css` | Semantic `--sv-*` light/dark tokens, compact borders, focus indicators, reduced motion, responsive workspace styles | IMPLEMENTED_UNTESTED |

## Route families

| Route family | Access boundary | Data source / interaction | Status |
|---|---|---|---|
| `/`, `/elections`, `/how-it-works`, `/results`, `/audit`, `/security-limits` | Public-safe content only | Election and evidence clients where applicable | TESTED_PASS |
| `/auth/*` | Public auth flow | Identity service login, registration, recovery and verification clients | IMPLEMENTED_UNTESTED |
| `/student/*` | Server session plus student-scoped APIs | Identity, election, credential, casting and receipt clients | IMPLEMENTED_UNTESTED |
| `/teacher/*` | Server session plus teacher scope | Identity roster APIs | IMPLEMENTED_UNTESTED |
| `/officer/*` | Server session plus election scope | Election/admin APIs and lifecycle state checks | IMPLEMENTED_UNTESTED |
| `/admin/*` | Server session plus admin scope | Identity/admin APIs; approval page fails closed when list contract is absent | TESTED_PASS |
| `/super-admin/*` | Server session plus super-admin role | Identity governance APIs | IMPLEMENTED_UNTESTED |
| `/auditor/*` | Server session plus auditor role | Evidence and verifier clients | IMPLEMENTED_UNTESTED |

Protected-route browser evidence: `apps/web/tests/browser_smoke.py` verifies that an unauthenticated browser receives the identity-service gate instead of fixture election data or a cast form.
