# Access control UI matrix

Navigation is a convenience layer, not authorization. The browser receives protected content only after `GET /v1/auth/me` validates the session. Every domain API continues to enforce its own role and scope checks.

| Actor | Visible workspace groups after session | Representative routes | Prohibited client assumption |
|---|---|---|---|
| Guest | Public header only | `/`, `/elections`, `/results`, `/audit` | A hidden link is not an access control |
| Student | Student routes and shared election/receipt destinations | `/student/*` | Cannot see another student's receipt or choice |
| Teacher | Teaching routes returned for `teacher` assignment | `/teacher/*` | Cannot use navigation to cross departments |
| Election officer | Election operations | `/officer/*` | Cannot bypass lifecycle state or freeze rules |
| Administrator | Administration | `/admin/*` | Cannot approve its own grant or access trustee keys |
| Super administrator | Governance and bounded administration | `/super-admin/*` | Does not inherit auditor or trustee custody |
| Auditor | Independent review | `/auditor/*` | Archive-supplied keys are not trusted pins |

The production role chooser was removed from `Navbar.tsx`. A session profile is informational for navigation; API responses and server dependencies are authoritative.
