#!/usr/bin/env node
// Client bundle-size budget gate (issue #95).
//
// A first-approximation performance gate: Lighthouse CI against the Node adapter
// proved flaky (port binding + cold-start jitter), so per the issue's sanctioned
// fallback we guard the transferred client bundle size instead. A guest's perceived
// load time is dominated by how many bytes their browser downloads, so a hard ceiling
// on the brotli-compressed client JS+CSS catches the regressions that matter (a heavy
// new dependency, an accidental import of a server-only module into the client) without
// the flake of a full Lighthouse run.
//
// Sizes are computed by brotli-compressing each asset in-process (zlib), NOT by reading
// the adapter's precompressed *.br files — so the gate is deterministic and independent
// of the `precompress` adapter setting. Budgets live in bundle-budget.json.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { brotliCompressSync, constants } from 'node:zlib';

const CLIENT_DIR = 'build/client/_app/immutable';
const BUDGET_FILE = 'bundle-budget.json';

function fail(msg) {
	console.error(`✗ ${msg}`);
	process.exit(1);
}

if (!existsSync(CLIENT_DIR)) {
	fail(`No built client assets at ${CLIENT_DIR}. Run \`npm run build\` first.`);
}

const budget = JSON.parse(readFileSync(BUDGET_FILE, 'utf8'));
const { totalBrotliBytes, maxChunkBrotliBytes } = budget;
if (typeof totalBrotliBytes !== 'number' || typeof maxChunkBrotliBytes !== 'number') {
	fail(`${BUDGET_FILE} must define numeric totalBrotliBytes and maxChunkBrotliBytes.`);
}

function walk(dir) {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const p = join(dir, entry.name);
		return entry.isDirectory() ? walk(p) : [p];
	});
}

const assets = walk(CLIENT_DIR).filter((f) => /\.(js|css)$/.test(f));
if (assets.length === 0) {
	fail(`Found no .js/.css assets under ${CLIENT_DIR} — did the build change its output layout?`);
}

const brotli = (buf) =>
	brotliCompressSync(buf, {
		params: { [constants.BROTLI_PARAM_QUALITY]: 11 }
	}).length;

let total = 0;
let largest = { file: '', bytes: 0 };
const rows = [];
for (const file of assets) {
	const bytes = brotli(readFileSync(file));
	total += bytes;
	rows.push({ file: file.replace(`${CLIENT_DIR}/`, ''), bytes });
	if (bytes > largest.bytes) largest = { file, bytes };
}

const kb = (b) => `${(b / 1024).toFixed(1)} KB`;

rows.sort((a, b) => b.bytes - a.bytes);
console.log(`Client bundle budget (brotli, ${assets.length} files under ${CLIENT_DIR}):`);
for (const r of rows.slice(0, 8)) {
	console.log(`  ${kb(r.bytes).padStart(9)}  ${r.file}`);
}
if (rows.length > 8) console.log(`  … and ${rows.length - 8} smaller file(s)`);
console.log(
	`  total: ${kb(total)} / ${kb(totalBrotliBytes)} budget` +
		`   largest chunk: ${kb(largest.bytes)} / ${kb(maxChunkBrotliBytes)} budget`
);

const violations = [];
if (total > totalBrotliBytes) {
	violations.push(`total client bundle ${kb(total)} exceeds ${kb(totalBrotliBytes)} budget`);
}
if (largest.bytes > maxChunkBrotliBytes) {
	violations.push(
		`chunk ${largest.file.replace(`${CLIENT_DIR}/`, '')} (${kb(largest.bytes)}) ` +
			`exceeds ${kb(maxChunkBrotliBytes)} per-chunk budget`
	);
}

if (violations.length > 0) {
	console.error('');
	for (const v of violations) console.error(`✗ ${v}`);
	console.error(
		'\nReduce the client bundle, or raise the budget in bundle-budget.json with a justification.'
	);
	process.exit(1);
}

console.log('✓ Client bundle within budget.');
