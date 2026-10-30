# UI screen and button checklist

The authoritative full-featured target is `apps/web`; Android is a student-first
native client. Each action below must call an authorized endpoint or navigate to
a built screen. Fixture-only buttons are marked limited and must not display a
security success claim.

| Surface | Routes/source | Required states | Evidence/status |
|---|---|---|---|
| Public | `apps/web/src/app/page.tsx`, public election/results/verify routes | loading, empty, error, released-only | TESTED web unit; typecheck blocked by generated auditor route import; API-backed reads partial |
| Student | `apps/web/src/app/student/`, Android `ui/screens/` | eligibility, open/closed, accepted pending witness, witnessed, failed | LIMITED; Android handoff hardening implemented this iteration |
| Teacher | `apps/web/src/app/teacher/` | assigned scope, pending review, denied foreign department | LIMITED; fixture mutation remains |
| Officer | `apps/web/src/app/officer/`, `services/admin_api/` | draft/review/frozen/open/closed/audit gate | LIMITED; lifecycle service tests pass |
| Admin | `apps/web/src/app/admin/` | scoped directory/import/invitation/approval | LIMITED; fixture/localStorage paths remain |
| Super Admin | `apps/web/src/app/super-admin/` | MFA, two-person approval, policy history | LIMITED; no production session claim |
| Auditor | `apps/web/src/app/auditor/`, `verifier/`, desktop audit views, iOS `AuditorViewModel` | trust import, run, PASS/FAIL/LIMITED/NOT_CHECKED | TESTED locally; external custody and iOS XCTest limited |
| Android | `apps/android/app/src/main/java/com/himvote/` | skeleton/error handled per screen; no synthetic cast success | IMPLEMENTED_UNTESTED: Gradle environment termination |

## Shared component checklist

Existing web components include `Button`, `AccessibleDialog`, `AccessibleTabs`,
`StateBadge`, `EvidenceOrbit`, `SkipLink`, and `ErrorBoundary`. Existing Android
components include status banners, candidate/election cards, progress, and
accessibility helpers. Focus rings, semantic controls, `aria-live`, reduced
motion, and visible text/icon status must be preserved.

## Critical button truth table

| Button | Must do | Never do |
|---|---|---|
| Cast Ballot | submit engine-native payload once and recover idempotent status | animate success before commit or accept plaintext candidate ID |
| Verify Inclusion | recompute supplied proof against trusted checkpoint | label a fixture root as independently verified |
| Open/Close | call server lifecycle transition with state/approval gate | trust a client clock or role dropdown |
| Publish | require real verifier PASS and attestation | change totals manually or show fixed green status |
| Download Evidence | return released/untrusted archive with provenance | bundle the sole trust key used to validate it |
| Copy Receipt | copy opaque holder token only | include student ID or candidate choice |

## Accessibility review target

Controls use semantic buttons/links, keyboard focus, visible focus rings, 44px
touch targets where practical, text-plus-icon status, `Intl` date/number
formatting, long-text wrapping, and `prefers-reduced-motion`. Automated web
tests passed; a complete multi-viewport screenshot catalog remains pending.
