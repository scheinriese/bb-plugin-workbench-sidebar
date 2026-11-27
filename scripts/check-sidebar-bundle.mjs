import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
// origin/main c88fd56, same official bb 0.50.1 / SDK 0.6.104 build, measured
// independently in a clean worktree. No Team artwork is in the eager graph.
const baselineBytes = 511138;
const js = readFileSync(new URL('../dist/app.js', import.meta.url), 'utf8');
const eagerBytes = Buffer.byteLength(js);
assert.ok(eagerBytes <= baselineBytes, `Team-off eager JS ${eagerBytes} exceeds main ${baselineBytes}`);
assert.ok(!js.includes('face-scout-working-dark') && !js.includes('<linearGradient'), 'SVG table leaked into the eager artifact');
console.log(JSON.stringify({ baselineRevision: 'c88fd5691f207ec83e635d68203c77ae97a53e4a', baselineBytes, eagerBytes, artworkInEagerBundle: false, passes: true }, null, 2));
