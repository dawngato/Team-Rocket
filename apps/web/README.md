# HimVote Web Application

This README is the platform guide for the Next.js application in this directory. It covers local setup, project layout, environment configuration, browser workflows, development commands, and the limits developers need to keep in view while changing the web client.

HimVote is an institutional election platform prototype for development, synthetic data, and controlled demonstrations. A running web page or a successful local test does not establish that the platform is ready to run a real election. Read the [repository overview](../../README.md), especially its current status and limitations, before making deployment or election-security claims.

## Contents

- [Current platform status](#current-platform-status)
- [What the web client contains](#what-the-web-client-contains)
- [Architecture](#architecture)
- [Repository layout](#repository-layout)
- [Requirements](#requirements)
- [Local development](#local-development)
- [Environment configuration](#environment-configuration)
- [Available commands](#available-commands)
- [Routes and role workspaces](#routes-and-role-workspaces)
- [API and data boundaries](#api-and-data-boundaries)
- [Visual system and accessibility](#visual-system-and-accessibility)
- [Docker usage](#docker-usage)
- [Security and privacy notes](#security-and-privacy-notes)
- [Troubleshooting](#troubleshooting)
- [Release checklist](#release-checklist)
- [Related documentation](#related-documentation)

## Current platform status

The application is built with Next.js 15, React 19, TypeScript, and Tailwind CSS 3.4. It has public pages and role-specific workspaces for students, teachers, election officers, campus administrators, super administrators, and auditors. The source includes API clients, server-side route middleware, local development fallbacks for selected administrative views, and Vitest and Playwright configuration.

The current engine implementation is Profile VEEM, a custom development adapter. It is not an independently reviewed election protocol. Local witness and chain services also do not demonstrate independent custody when operated by one team. These are project-level release limitations, not issues that a web UI can solve. See the root README for the current release gates.

## What the web client contains

The web application includes the following route groups:

| Route group | Purpose |
| --- | --- |
| Public pages | Home, elections, results, accessibility, privacy, terms, security limits, and an explanation of the verification workflow. |
| Authentication | Login, signup and registration, account verification, invitation acceptance, and account recovery flows. |
| Student workspace | Election eligibility, candidate information, credential requests, voting handoff, receipts, inclusion proofs, results, and help. |
| Teacher workspace | Class and student verification queues, roster corrections, and assigned elections. |
| Election officer workspace | Election creation, candidate administration, roster review, lifecycle operations, and publication workflow. |
| Campus administrator workspace | Student and faculty administration, invitations, approvals, assignments, roster imports, and audit activity. |
| Super administrator workspace | Institutions, departments, administrators, role requests and assignments, policies, security, and system audit pages. |
| Auditor workspace | Evidence, witness checkpoints, trusted pins, verification, signatures, and chain information. |

The list describes routes and interface areas present in the source. Whether a workflow can complete depends on the relevant backend services, account permissions, configuration, and data. A rendered button is not proof that an operation has been accepted by a service.

## Architecture

The client uses a Next.js App Router structure. React components render route content; TypeScript API clients isolate HTTP request and response handling; the shared shell provides role-aware navigation, account controls, keyboard search, and theme selection.

The main trust boundaries represented in the client are:

1. **Identity and eligibility** are handled through identity APIs and authenticated sessions.
2. **Election administration** is handled through administration or election APIs and must be authorized by the backend.
3. **Ballot casting** is sent to casting APIs using a separately named client and payload contract.
4. **Evidence and witnessing** are displayed through witness, receipt, verifier, and chain-related interfaces.

These are software boundaries, not a guarantee that every deployment has independent infrastructure. The browser must not be treated as an authority for role membership, eligibility, election state, or result validity. Backend services must repeat authorization and validation for each protected operation.

The Next.js middleware performs session and workspace checks for protected routes. This improves request handling and reduces accidental rendering of private pages, but it does not replace API authorization. The service remains the authority for every protected read or mutation.

## Repository layout

The paths below are relative to this directory.

| Path | Contents |
| --- | --- |
| package.json | Scripts and pinned direct dependencies for the web client. |
| package-lock.json | npm dependency lockfile used by the Dockerfile and npm ci. |
| next.config.ts | Next.js options and application response headers. |
| tailwind.config.js and tailwind.config.ts | Tailwind configuration files. Confirm which one is active before changing configuration. |
| src/app | App Router pages, route layouts, and global CSS. |
| src/app/globals.css | Global design tokens, workspace shell, responsive styles, and shared page styling. |
| src/components | Shared navigation, shell, dialogs, accessibility, and interface components. |
| src/components/shell | Authenticated workspace header, sidebar, app frame, and command search. |
| src/lib | API clients, session helpers, route configuration, types, query setup, and local fallback data. |
| public | Static files served from the application root. |
| tests | Web client tests and test configuration. |

## Requirements

- Node.js 20 is the repository's container baseline. Use a current Node.js LTS release compatible with Next.js 15 for local development.
- npm, included with Node.js.
- Access to the repository's package lockfile.
- For service-backed flows, a reachable HimVote gateway or the specific API services that the client is configured to call.
- Docker Engine and Docker Compose v2 only if using the root local service topology.
- Playwright browser binaries only if running browser tests and they are not already installed.

The web client can start without all services, but service-backed pages may show unavailable or empty states. Some administrative pages have explicitly labeled demonstration fallback data in development. Do not interpret fallback data as a server response.

## Local development

Run commands from this directory:

    npm ci
    npm run dev

Open http://localhost:3000 in a browser. To stop the development server, press Ctrl+C in the terminal where it is running.

For a fresh clone, the first npm ci downloads dependencies described by package-lock.json. Use npm ci for repeatable installs; avoid changing package versions without updating and reviewing the lockfile.

To expose the development server to a local network or a container, use Next.js's hostname option only when needed:

    npm run dev -- --hostname 0.0.0.0

Binding to all interfaces can make the development server reachable from other machines on the network. Use it only on a trusted development network and stop the server when finished.

## Environment configuration

Next.js loads local environment files from this directory. Create apps/web/.env.local for local-only values; do not commit that file. The repository root also has an [.env.example](../../.env.example) for service and Compose configuration. That file is not a substitute for reviewing the web client's own public variable names.

The web client recognizes these variables:

| Variable | Used for |
| --- | --- |
| NEXT_PUBLIC_API_BASE | General browser API base used when a service-specific base is not supplied. |
| NEXT_PUBLIC_IDENTITY_API_BASE | Preferred identity API base. |
| NEXT_PUBLIC_IDENTITY_BASE | Compatibility alias for the identity API base. |
| NEXT_PUBLIC_ADMIN_API_BASE | Election and administration API base. |
| NEXT_PUBLIC_CASTING_BASE | Casting API base. |
| NEXT_PUBLIC_ELECTION_ENGINE_BASE | Election engine API base. |
| NEXT_PUBLIC_WITNESS_BASE | Witness API base. |
| NEXT_PUBLIC_WITNESS_PUBLIC_KEY | Public key material used by witness-related client verification paths. This is public data, not a private signing key. |
| IDENTITY_SERVICE_URL | Server-side identity service URL used by middleware when configured. |
| NEXT_PUBLIC_IDENTITY_SERVICE_URL | Fallback identity service URL used by middleware configuration. |
| REQUIRE_AUTH | Server-side development setting used by middleware to require authentication checks. Do not weaken production authentication behavior. |
| DEMO_MODE | Enables or disables selected development fallback behavior. Set to false when exercising real service responses. |

In a non-production build, middleware can deliberately allow a protected route without a session when REQUIRE_AUTH is unset; it supplies mock development roles for demonstration. Set REQUIRE_AUTH=true while validating login and protected-route behavior. This development path is not production authentication and must never be used to grant production access.

For a local Compose stack whose gateway is reachable from the browser at port 8080, a minimal local file can use:

    NEXT_PUBLIC_API_BASE=http://localhost:8080
    IDENTITY_SERVICE_URL=http://localhost:8080
    DEMO_MODE=false

Service-specific variables override the general API base. Set them only when the browser can reach those origins and the services allow the web origin through their CORS configuration. A container hostname such as identity_issuer is normally resolvable by another container, not by a browser on the host.

If the API is served on the same origin as the app in production, leave service-specific variables unset only after confirming that the reverse proxy routes the relevant API paths to the correct services. The client has logic to avoid sending a public browser to its own localhost when a configured service base uses a loopback hostname.

Values prefixed with NEXT_PUBLIC are exposed to browser code and are normally incorporated at build time. Never place passwords, signing keys, private credentials, database secrets, or session secrets in a NEXT_PUBLIC variable.

## Available commands

Run these commands from apps/web:

| Command | Purpose |
| --- | --- |
| npm run dev | Start the Next.js development server. |
| npm run build | Create a production Next.js build. |
| npm run start | Serve a previously built production bundle. |
| npm run typecheck | Generate Next.js route types, then run TypeScript without emitting output. |
| npm run lint | Run ESLint across the web package. |
| npm run lint:fix | Apply ESLint automatic fixes. Review the resulting diff before keeping it. |
| npm test | Run the Vitest suite once. |
| npm run test:e2e | Run the Playwright suite. |

Before running browser tests on a machine without installed Playwright browsers:

    npx playwright install chromium

The project may use a locally installed browser or a CI-provided browser image. Follow the Playwright error output if a different browser is required.

## Routes and role workspaces

The App Router source lives under src/app. Representative paths include:

- /elections and /results for public election information.
- /auth/login, /auth/signup, /auth/register, /auth/verify, /auth/recover, and /auth/invitation for account flows.
- /student for student-facing routes.
- /teacher for faculty verification and class routes.
- /officer for election setup and lifecycle routes.
- /admin for campus administration.
- /super-admin for platform-level governance.
- /auditor for evidence and independent review screens.
- /security-limits and /accessibility for public disclosures.

The shared workspace navigation is generated from role configuration in src/lib/routes. When adding a private route, update both route-level protection and the navigation configuration as appropriate. A hidden navigation item is not an authorization control. Add or update server-side permission checks in the service that owns the operation.

## API and data boundaries

API client modules live in src/lib. The identity, election/admin, casting, engine, and witness clients have separate configuration paths because they serve different responsibilities. Prefer the typed client that owns a request rather than adding ad hoc fetch calls to a page.

When changing an API call:

1. Confirm the service and trust boundary that owns the endpoint.
2. Keep request and response types aligned with the service contract.
3. Do not send a ballot selection, credential secret, password, or private key in a URL.
4. Avoid adding identity fields to casting payloads or casting data to identity requests.
5. Handle loading, empty, offline, unauthorized, validation, and service-error states explicitly.
6. Do not report a cryptographic result as verified unless the relevant verifier actually checked the required evidence.

The client may persist limited local user-interface state. Browser storage is not a secure vault. Do not use localStorage or sessionStorage for private keys, blinded credential secrets, raw ballots, or other data that requires hardware-backed protection.

## Visual system and accessibility

The current shared light palette uses a cool near-white workspace canvas, white surfaces, institutional navy headings, and restrained blue interaction accents. Global tokens and workspace shell styles are defined in src/app/globals.css. Reuse semantic tokens and shared components instead of introducing a new unrelated color set on each route.

The existing interface includes responsive layouts, semantic labels, keyboard controls, focus styles, reduced-motion handling, and status labels paired with text or icons. These implementation details do not amount to a completed WCAG conformance audit. Any accessibility statement or release claim must be supported by testing on the actual target browsers and assistive technologies.

When changing a screen, verify at minimum:

- Keyboard access to navigation, dialogs, forms, tables, and command search.
- Visible focus and a logical focus order.
- Screen-reader names for icon-only controls and status changes.
- Text zoom and narrow viewport behavior.
- Reduced-motion behavior for animated elements.
- Contrast for text, borders, focus rings, status badges, and disabled controls.

## Docker usage

The Dockerfile in this directory builds the Next.js application using Node 20, npm ci, and npm run build. From the repository root:

    docker build -t himvote-web:local apps/web
    docker run --rm -p 3000:3000 himvote-web:local

This starts the app container but does not start identity, casting, election, or witness services. Configure browser-visible API origins and the service topology separately. NEXT_PUBLIC values used by the client must be available during the build when the resulting client bundle needs them; runtime container variables do not necessarily rewrite already-built browser JavaScript.

For a complete local backend topology, follow the Compose instructions in the [root README](../../README.md). Review port bindings and use loopback-only development bindings.

## Security and privacy notes

- Authentication identifies a session; backend authorization decides whether a request is allowed.
- Role labels and client-side route guards are not permission enforcement.
- The browser is not a trusted ballot-encryption enclave.
- Do not put secrets in browser environment variables, URLs, analytics, console output, or client error reports.
- Avoid storing bearer tokens beyond the intended session mechanism.
- Ensure production deployment uses HTTPS and exact origin/CORS settings.
- Confirm the gateway's route mapping, cookies, secure attributes, same-site policy, and CSRF protections in the deployed configuration.
- Public pages should show a clear unavailable state when authoritative data cannot be retrieved; they should not silently substitute a fabricated election or result.
- A development build, local test, or green dashboard badge does not independently prove the election system secure.

## Troubleshooting

| Symptom | Checks |
| --- | --- |
| npm ci fails | Confirm the Node/npm versions, network access to the package registry, disk space, and that package-lock.json has not been modified independently of package.json. |
| Port 3000 is in use | Stop the other process or start Next.js on another port with npm run dev -- --port 3001. |
| API requests hit localhost on a visitor's machine | Remove loopback API URLs from production configuration and use the deployed gateway origin. |
| Browser reports CORS errors | Check the API service's allowed origins and the exact scheme, hostname, and port used by the browser. |
| Protected page returns to login | Confirm the identity service URL, session cookie domain/path/security settings, middleware configuration, clock correctness, and that the session is still valid. |
| Page displays demonstration data | Check the page's offline/demo indicator, backend availability, configured API base, and DEMO_MODE. Do not treat demonstration records as live data. |
| Production build has stale API host values | Review NEXT_PUBLIC variables at build time, rebuild the image, and verify the generated deployment configuration. |
| Playwright cannot find a browser | Install the required browser with the Playwright CLI or use the project's configured CI browser image. |

## Release checklist

Before a production web deployment:

1. Read the root release status and identify blockers that apply to this build.
2. Build with reviewed production API origins and no demo fallback.
3. Confirm the gateway routes identity, election/admin, casting, and witness endpoints as intended.
4. Confirm HTTPS, cookie attributes, CORS, CSRF controls, CSP strategy, proxy headers, and rate limits.
5. Verify the app's public pages fail closed when authoritative services are unavailable.
6. Verify role and institution scopes in the backend, not only in the UI.
7. Review logs and telemetry so they do not contain credentials, ballot contents, or correlating identifiers.
8. Run the required type, lint, unit, browser, accessibility, and API contract checks in the release pipeline.
9. Retain build provenance and deployment evidence.

Passing this checklist for the web client alone does not satisfy the repository's established-engine or independent-witness release gates.

## Related documentation

- [Repository README](../../README.md)
- [Web API clients](src/lib)
- [Web route tree](src/app)
- [Root environment template](../../.env.example)
