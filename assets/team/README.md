# Team avatar sources

Copied unchanged from `scheinriese/bb-plugin-boat`, commit `659f604`,
`docs/team/design/avatars/`. H3 Orbit is the default; H2 is Calm faces.
The tile compositions are references; live orbit and dock membership come from
sidebar data. Both lead sets carry the Claude flag as specified in the handoff.
Run `node scripts/team-assets.mjs` after changing SVGs to refresh the server-only
artwork table. It is lazily served as bounded, inert SVG image URIs only when
Team is enabled; the table is never part of the eager app bundle.
