# UI component catalog

## Shared components

| Component | Source | Responsibility |
|---|---|---|
| Public header | `apps/web/src/components/Navbar.tsx` | Public routes, sign-in entry, theme toggle and mobile menu |
| App frame | `apps/web/src/components/shell/AppFrame.tsx` | Public/protected route split and session gate |
| Workspace shell | `apps/web/src/components/shell/AppShell.tsx` | Authenticated column composition and sign-out |
| Workspace sidebar | `apps/web/src/components/shell/WorkspaceSidebar.tsx` | Server-role-filtered groups and responsive drawer |
| Workspace header | `apps/web/src/components/shell/WorkspaceHeader.tsx` | Breadcrumb, search entry, help and session indicator |
| Command search | `apps/web/src/components/shell/CommandSearch.tsx` | Ctrl/Cmd+K route navigation constrained to visible capabilities |
| State badge | `apps/web/src/components/StateBadge.tsx` | Election state labels with descriptive text |
| Dialog and tabs | `apps/web/src/components/AccessibleDialog.tsx`, `AccessibleTabs.tsx` | Keyboard-safe primitives reused by domain pages |
| 3D public presentation | `BallotBoxHero.tsx`, `EvidenceOrbit.tsx` | Decorative conceptual visuals only; no security result source |

All icons use named `lucide-react` imports. Critical controls are real buttons or links, not clickable containers.
