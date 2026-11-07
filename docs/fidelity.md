# Validation

The sidebar is checked against the supplied desktop and phone designs at
matching pixel dimensions. Lossless reference exports are converted to sRGB
without resizing. Rows are also compared at four times their original scale.

The validation covers provider activity, attention and unread signals, draft
markers, nested reviews, generic and Boat rollups, request replacement,
keyboard and pointer interactions, split drag, archive and Undo, and pinned
scroll hand-off between groups.

Disposable offline demo instances supply records through the same public SDK
and RPC contracts as production. No product-only fake rows, provider turns,
paid approvals or real cloud machines are used by these checks.

The source retains upstream tests and runs typecheck, build, a public-SDK
scan, secret scans and visible-text privacy checks. Local fixture databases,
recordings and design references are kept outside the publishable tree.
