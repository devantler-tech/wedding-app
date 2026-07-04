#!/usr/bin/env node
// Required boot-smoke lane (issue #153): verifies the built adapter-node
// entrypoint (`node build/index.js`) actually starts and serves /login.
//
// WHY THIS EXISTS: v1.14.1 shipped an app that could not start (the
// @sveltejs/adapter-node 5.5.5 regression — top-level `await server.init(...)`
// in the adapter's pre-bundled chunk never settles, Node exits 13 before
// binding the port) and CI stayed green, because no REQUIRED lane booted the
// real entrypoint: e2e serves the build via `vite preview`, and Lighthouse
// (which does boot it) is non-required. This lane is in `CI - Required
// Checks`, so a boot-dead build blocks the merge instead of CrashLooping prod.
//
// Cheap by design: build once (previous step), boot, assert /login answers 200
// within the readiness budget, exit. Launch retries guard port-bind jitter
// only — a deterministic boot failure fails all attempts and the lane.
import { launchServerWithRetries } from './server-utils.mjs';

const PORT = Number(process.env.PORT ?? 3000);
const BASE = `http://localhost:${PORT}`;

let server;
try {
  server = await launchServerWithRetries(BASE, PORT);
} catch (err) {
  console.error(`BOOT SMOKE FAILED: ${err.message}`);
  process.exit(1);
}

// Failures set process.exitCode instead of calling process.exit(): exit()
// fires immediately and skips the finally, leaving the booted server behind.
try {
  const res = await fetch(`${BASE}/login`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) {
    console.error(`BOOT SMOKE FAILED: /login answered ${res.status}`);
    process.exitCode = 1;
  } else {
    console.log(`Boot smoke OK: adapter-node server is up, /login answered ${res.status}`);
  }
} catch (err) {
  console.error(`BOOT SMOKE FAILED: /login probe errored after readiness: ${err.message}`);
  process.exitCode = 1;
} finally {
  server.kill('SIGTERM');
}
