# Isolated fidelity validation

The runtime fixture kit lives only in fidelity-work/sidebar-demo and uses
server48710/daemon48711. Source fidelity-work/sidebar-env.sh before its bbx,
start.sh or stop.sh commands. It pins the read-only Boat producer source at
002d00f into the demo's own plugin-copy. Its monitor is disabled in that
copy only, with no queued messages or provider turns. No owner instance is
used. Fixture rows are real backend BB/Boat records, never product-side rows.

`npm run typecheck`, `npm test`, `npm run build` validate the distribution.
`python3 fidelity-work/run-paper-matrix.py` stops/seeds/starts only that demo,
captures the31 source-derived cases through CDP, and calls the shared compare
helper. Source row matrix comes from read-only cached Paper JSX and computed
phone styles. This script expects the supplied fixture kit/base snapshots;
it does not create a production service or real sandbox.

Paper operations serialize the shared paper.lock. Use the guarded
fidelity-work/export-lossless-matrix.py with optional artboard IDs for
read-only1xPNG exports. It checks each expected Downloads path under the lock
and skips unowned existing files. Original JPEG captures, original P3 PNG
exports, receipts and ICC-managed sRGB copies remain separately available.
The root shared compare helper is now ICC-aware. No source image is resized.

`make-details.py` crops the actual runtime and Paper rows at1x, then uses
nearest-neighbor4x for the required needs-you/review/selected-level2 pairs.
`make-contact-sheets.py` makes inspection thumbnails only. Individual compares
are the acceptance artifacts, always Demo left/Paper right at identical scale.

`seed-scroll.py` extends a stopped source-shaped demo with actual native BB
children and a real Boat decision. `capture-scroll.mjs workbench` (optionally
--mobile) captures top/middle/next-group handoff; disabling Workbench in that
same isolated instance supplies the native BB series. `compare-scroll.py`
labels the1x pairs Workbench left/Native BB right. No overlays or browser
style changes are used. Standard reduced-motion emulation holds ring arcs
still for pixel comparison; product animation remains enabled normally.

`runtime-smoke.mjs` checks actual SDK rename/archive/Undo, native context menu
and held-command shortcut pills using disposable fixture rows. The nav font
control enables/disables Workbench only on the private demo; computed styles,
actual CDP platform font and pixel-identical header crops prove no host leak.

Acceptance is gated on the parent's batched design review and required fixes.
See fidelity-work/sidebar-report.md for current status and exact artifacts.
