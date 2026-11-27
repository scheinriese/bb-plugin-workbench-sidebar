// Finish esbuild's safe minification. Only explicitly listed private sidebar
// properties may be shortened. Never mangle SDK, wire, quoted or DOM names.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { minify } from "terser";
const fields = JSON.parse(readFileSync(new URL('./sidebar-internal-properties.json', import.meta.url), 'utf8'));
const sdkRoot = new URL('../node_modules/@get-bb/plugin-sdk/bundled-types/', import.meta.url);
const sdk = readdirSync(sdkRoot).filter(name => name.endsWith('.d.ts')).map(name => readFileSync(new URL(name, sdkRoot), 'utf8')).join('\n');
const privateFields = fields.filter(name => !new RegExp(`\\b${name}\\b`).test(sdk));
const file = new URL('../dist/app.js', import.meta.url);
const source = readFileSync(file, 'utf8');
const result = await minify(source, {
  module: true, compress: { passes: 2 },
  mangle: { properties: { regex: new RegExp(`^(${privateFields.join('|')})$`), keep_quoted: true } },
  format: { comments: false },
});
if (!result.code) throw new Error('No sidebar artifact produced');
writeFileSync(file, result.code);
console.log(`Sidebar JS: ${Buffer.byteLength(source)} → ${Buffer.byteLength(result.code)} bytes (no public-property mangling)`);
