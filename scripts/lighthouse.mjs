#!/usr/bin/env node
// Non-required Lighthouse CI lane (issue #100). Warn-only: gauges real Core Web
// Vitals (LCP/CLS/TBT/FCP/Performance) on the two pages guests actually see —
// the public login page and the authenticated program page — against the built
// app served by the @sveltejs/adapter-node server, with DEV_SKIP_AUTH=true.
//
// Budget misses are reported as warnings (see lighthouserc.json) and never fail
// the job; only an infrastructure error (server/Chrome) does. That is deliberate:
// this lane is NOT in `CI - Required Checks`, so it cannot wedge a merge, and its
// red/green over ~10 runs is the flakiness signal we use to decide whether the
// Node-adapter server (port binding + cold-start jitter) is stable enough to ever
// promote these budgets into the required gate.
//
// Why a wrapper instead of plain `lhci autorun`: the program page ("/") requires a
// `session` cookie even under DEV_SKIP_AUTH (the layout skips the DB lookup, not
// the cookie gate), while the login page must be scanned WITHOUT one — a session
// cookie redirects /login -> /. A single global `extraHeaders` cannot express that
// per-page difference, so each page is collected with exactly the cookie it needs.
import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = Number(process.env.PORT ?? 3000);
const BASE = `http://localhost:${PORT}`;

// `session=dev-session` is the dev cookie the login form sets for a guest (see
// src/lib/server/cookies.ts); any non-empty value satisfies the program page's
// cookie gate under DEV_SKIP_AUTH.
const PAGES = [
  { url: `${BASE}/login`, cookie: null },
  { url: `${BASE}/`, cookie: 'session=dev-session' }
];

// Headless Chrome flags that make Lighthouse reliable on CI runners.
const CHROME_FLAGS = '--no-sandbox --headless=new --disable-gpu --disable-dev-shm-usage';
const RUNS = 3;

async function waitForServer(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/login`);
      if (res.ok) return;
    } catch {
      // server not up yet
    }
    await sleep(500);
  }
  throw new Error(`Server did not become ready on ${BASE} within ${timeoutMs}ms`);
}

function lhci(args) {
  const res = spawnSync('npx', ['lhci', ...args], { stdio: 'inherit' });
  if (res.error) throw res.error;
  return res.status ?? 1;
}

const server = spawn('node', ['build/index.js'], {
  env: { ...process.env, DEV_SKIP_AUTH: 'true', PORT: String(PORT) },
  stdio: 'inherit'
});
server.on('exit', (code) => {
  if (code && code !== 0) {
    console.error(`adapter-node server exited early with code ${code}`);
    process.exitCode = 1;
  }
});

let status = 0;
try {
  await waitForServer(30_000);

  // Collect + assert each page with the cookie it needs. A fresh `lhci collect`
  // clears .lighthouseci/, so each page is asserted right after its own collect
  // rather than accumulating. Assertions are warn-level (lighthouserc.json) so
  // assert prints the CWV report and exits 0 even when a budget is exceeded —
  // informational while we gauge stability.
  for (const { url, cookie } of PAGES) {
    const args = [
      'collect',
      `--url=${url}`,
      `--numberOfRuns=${RUNS}`,
      `--settings.chromeFlags=${CHROME_FLAGS}`
    ];
    if (cookie) args.push(`--settings.extraHeaders={"Cookie":"${cookie}"}`);

    const collectCode = lhci(args);
    if (collectCode !== 0) {
      status = collectCode;
      console.error(`lhci collect failed for ${url} (exit ${collectCode})`);
      continue;
    }
    console.log(`\nCore Web Vitals budgets for ${url}:`);
    const assertCode = lhci(['assert']);
    if (assertCode !== 0) status = assertCode;
  }
} finally {
  server.kill('SIGTERM');
}

process.exit(status);
