# Workbench sidebar

A standalone, complete fork of BB 0.48.1's thread-list plugin, with the g2 + B4
provider rings, title-line attention dots, second lines and Boat work trees.
The exclusive thread-list slot activates when enabled. Install only on an
isolated demo during development. This local repository has no remote.

See [upstream and feature inventory](docs/upstream.md),
[Boat contract](docs/boat-sidebar-contract.md), and
[fidelity report](fidelity-work/sidebar-report.md).

```
npm ci
npm run typecheck
npm test
npm run build
```

The backend retains the complete upstream preference store and CLI under
`bb workbench-sidebar prefs …`. Section organization and order, drafts,
shortcuts, split gestures, menus, keyboard targets and compact layout remain.
Boat is optional and read-only. No fake rows are included in the product.
