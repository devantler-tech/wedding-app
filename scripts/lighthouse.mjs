#!/usr/bin/env node
// Non-required Lighthouse CI lane (issue #100). Warn-only: gauges real Core Web
// Vitals (LCP/CLS/TBT/FCP/Performance) on the two pages guests actually see —
// the public login page and the authenticated program page — against the built
// app served by `vite preview`, with DEV_SKIP_AUTH=true.
//
// Why `vite preview` and not the @sveltejs/adapter-node server (`node build/index.js`):
// the adapter-node server intermittently — and, on the current build, deterministically —
// exits early with code 13 ("unsettled top-level await" during `await server.init(...)`)
// when started DB-free in CI, so it never binds the port and the lane reds out. The e2e
// lane already serves the same production build via `vite preview` under DEV_SKIP_AUTH
// reliably; reusing it here gives a stable server without changing what guests' browsers
// load. (The adapter-node cold-start hang is tracked separately.)
//
// Budget misses are reported as warnings (see lighthouserc.json) and never fail
// the job; only an infrastructure error (server/Chrome) does. That is deliberate:
// this lane is NOT in `CI - Required Checks`, so it cannot wedge a merge, and its
// red/green over ~10 runs is the flakiness signal we use to decide whether these
// budgets are stable enough to ever promote into the required gate.
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

function startServer() {
  // `vite preview` serves the production build (built in the preceding CI step)
  // on PORT; --strictPort makes a busy port fail fast so a retry can free it
  // rather than silently binding elsewhere.
  return spawn('npm', ['run', 'preview', '--', '--port', String(PORT), '--strictPort'], {
    env: { ...process.env, DEV_SKIP_AUTH: 'true', PORT: String(PORT) },
    stdio: 'inherit'
  });
}

// Poll until the built app answers, but abort the moment the server process exits
// early — otherwise a cold-start crash leaves us polling a dead port for the full
// timeout before reporting (the original behaviour that redded this lane).
async function waitForReady(proc, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let exited = null;
  proc.once('exit', (code, signal) => {
    exited = code ?? signal ?? 0;
  });
  while (Date.now() < deadline) {
    if (exited !== null) {
      throw new Error(`adapter-node server exited early (${exited}) before becoming ready`);
    }
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

// Guard against residual cold-start / port-bind jitter (the deferral reason in
// #95/#100): if the preview server exits early or never answers, retry the launch
// a few times before treating a non-ready server as a genuine infrastructure
// failure. waitForReady aborts the moment the process exits, so a bad attempt
// fails fast instead of burning the whole readiness timeout.
const MAX_SERVER_ATTEMPTS = 3;
const READY_TIMEOUT_MS = 30_000;

let server;
for (let attempt = 1; attempt <= MAX_SERVER_ATTEMPTS; attempt += 1) {
  server = startServer();
  try {
    await waitForReady(server, READY_TIMEOUT_MS);
    break;
  } catch (err) {
    console.error(`Server start attempt ${attempt}/${MAX_SERVER_ATTEMPTS} failed: ${err.message}`);
    server.kill('SIGTERM');
    if (attempt === MAX_SERVER_ATTEMPTS) {
      throw new Error(`adapter-node server never became ready after ${MAX_SERVER_ATTEMPTS} attempts`);
    }
    await sleep(1000); // let the port free before retrying
  }
}

let status = 0;
try {

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
