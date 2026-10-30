# Screenshot and accessibility review

## Current evidence

The web client has semantic buttons/links, skip navigation, accessible dialogs,
tabs, status labels, reduced-motion CSS, explicit icon labels/hidden decorative
icons, and responsive tokenized surfaces. `npm test` passes; web typecheck is
currently blocked by a generated route import for the modified auditor evidence
page. The
Android client contains Compose accessibility helpers, semantic status banners,
and touch-target-oriented components. The iOS client now has a contained native
SwiftUI `BallotBoxHero` with capped `rotation3DEffect` tilt, a reduced-motion
fallback, and an explicit decorative accessibility description. It is mounted
only in the login header and never in ballot controls or proof values.

## Pending capture matrix

Capture real screenshots and record viewport/toolchain for:

| Viewport | Required surfaces |
|---|---|
| 360 x 800 | student election, booth review, receipt, error |
| 768 x 1024 | public catalog, teacher queue, officer workspace |
| 1280 x 800 | admin, auditor evidence explorer, 3D hero |
| 1920 x 1080 | full desktop dashboard and proof detail |

Review keyboard focus, 200% zoom, long candidate names, empty/error/loading
states, `prefers-reduced-motion`, and contrast. Decorative 3D must never appear
inside candidate selection, password, proof-value, or error controls.

## Honest status

`TESTED_PASS` applies to automated web component tests and source-level review
of the iOS reduced-motion boundary. A full screenshot catalog, axe/Playwright
accessibility run, iOS XCTest run, and Android rendered-device review are
`IMPLEMENTED_UNTESTED`/`BLOCKED` until their tools execute successfully.
