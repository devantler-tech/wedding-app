#!/usr/bin/env node
// Non-required Lighthouse CI lane (issue #100). Warn-only: gauges real Core Web
// Vitals (LCP/CLS/TBT/FCP/Performance) on the two pages guests actually see —
// the public login page and the authenticated program page — against the built
// app served by the @sveltejs/adapter-node server, with DEV_SKIP_AUTH=true.
//
// This lane deliberately serves `node build/index.js` (NOT `vite preview`): it
// is the only CI lane that boots the adapter-node entrypoint prod runs, so it
// doubles as the boot-smoke canary. The "cold-start hang" that briefly made it
// use `vite preview` was the @sveltejs/adapter-node 5.5.5 regression (top-level
// `await server.init(...)` in the adapter's pre-bundled chunk never settles —
// Node exits 13 before binding the port), which shipped in v1.14.1 and
// CrashLoopBackOff'd prod. Serving the real adapter build here is what catches
// that class of breakage before a release does.
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
import { launchServerWithRetries } from './server-utils.mjs';
import { collectWithRetries } from './lhci-utils.mjs';

// The app is served through a compressing proxy so the lane measures the
// transport guests actually get (issue #176). Production is fronted by
// Cloudflare, which returns the document as `content-encoding: br`, while
// adapter-node returns a server-rendered document uncompressed — ~105 kB
// instead of ~12 kB on the program page. Scanning the bare server charged that
// ~8.7x transfer difference to the app and made the budgets unreachable for
// reasons no guest experiences. See scripts/edge-proxy.mjs.
const APP_PORT = Number(process.env.PORT ?? 3000);
const PORT = APP_PORT + 1;
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

/**
 * Run `lhci <args>` (Lighthouse CI) synchronously, inheriting stdio.
 * @param {string[]} args arguments passed through to the `lhci` CLI
 * @returns {number} the process exit status (1 if it could not be determined)
 */
function lhci(args) {
  const res = spawnSync('npx', ['lhci', ...args], { stdio: 'inherit' });
  if (res.error) throw res.error;
  return res.status ?? 1;
}

// Guard against residual cold-start / port-bind jitter (the deferral reason in
// #95/#100): if the server exits early or never answers, retry the launch
// a few times before treating a non-ready server as a genuine infrastructure
// failure. waitForReady aborts the moment the process exits, so a bad attempt
// fails fast instead of burning the whole readiness timeout.
const server = await launchServerWithRetries(`http://localhost:${APP_PORT}`, APP_PORT);

// The proxy runs as its own process on purpose: `lhci` below is driven through
// spawnSync, which blocks this event loop for the whole collection, so an
// in-process proxy would stop answering the moment Chrome started.
const proxy = spawn('node', ['scripts/edge-proxy.mjs', String(APP_PORT), String(PORT)], {
  stdio: 'inherit'
});
await waitForProxy();

/** Poll until the proxy accepts, so collection never races its bind. */
async function waitForProxy(timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (proxy.exitCode !== null) throw new Error(`edge-proxy exited (${proxy.exitCode})`);
    try {
      await fetch(`${BASE}/login`, { signal: AbortSignal.timeout(2000) });
      return;
    } catch {
      // not listening yet
    }
    await sleep(250);
  }
  throw new Error(`edge-proxy did not become ready on ${BASE} within ${timeoutMs}ms`);
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

    // Retry a failed collect: a hung headless Chrome (PROTOCOL_TIMEOUT / NO_FCP /
    // Target closed) is the lane's one measured flake mode, and it reddens a run
    // that has nothing wrong with it. See scripts/lhci-utils.mjs.
    const { code: collectCode, attempts: collectAttempts } = await collectWithRetries(() =>
      lhci(args)
    );
    if (collectCode !== 0) {
      status = collectCode;
      console.error(
        `lhci collect failed for ${url} (exit ${collectCode}) after ${collectAttempts} attempt(s)`
      );
      continue;
    }
    if (collectAttempts > 1) {
      console.log(`lhci collect for ${url} succeeded on attempt ${collectAttempts}`);
    }
    console.log(`\nCore Web Vitals budgets for ${url}:`);
    const assertCode = lhci(['assert']);
    if (assertCode !== 0) status = assertCode;
  }
} finally {
  proxy.kill('SIGTERM');
  server.kill('SIGTERM');
}

process.exit(status);
