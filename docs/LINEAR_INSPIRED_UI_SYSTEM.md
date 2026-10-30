# SecureVote UI system

SecureVote uses the visual discipline of calm, compact product workspaces as inspiration while keeping its own HimVote brand and election-specific content. No Linear source, logo, font, illustration or proprietary asset is shipped.

## Tokens

The semantic tokens live in `apps/web/src/app/globals.css`: `--sv-bg`, `--sv-sidebar`, `--sv-surface`, `--sv-border`, `--sv-text`, `--sv-text-secondary`, `--sv-accent`, `--sv-success`, `--sv-warning`, `--sv-danger`, and `--sv-focus`. The dark workspace is the default internal surface; light mode remains available through the existing theme provider.

## Layout rules

- Public pages use a separate branded header and footer.
- Authenticated pages use a fixed 244px sidebar, a 54px command header, compact row navigation, and a readable content column.
- Student voting and proof pages remain content-first; decorative 3D is confined to public presentation components.
- Mobile collapses navigation into a drawer and keeps action targets at least 44px.
- `prefers-reduced-motion` removes loading and decorative animation.

## Status language

Green is reserved for a state supported by actual service evidence. Pending, unavailable, limited and failed states remain text-labelled and are never inferred from a local click. The educational-prototype banner remains visible on public and workspace surfaces.
