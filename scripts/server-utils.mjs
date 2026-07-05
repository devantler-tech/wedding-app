// Shared helpers for CI lanes that boot the built adapter-node server
// (`node build/index.js`) — the same entrypoint the production container runs.
// Used by scripts/boot-smoke.mjs (required lane, issue #153) and
// scripts/lighthouse.mjs (non-required CWV lane, issue #100).
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

/**
 * Spawn the adapter-node server (`node build/index.js`, built in the preceding
 * CI step) on the given port — the same entrypoint the production container
 * runs, so a boot regression in the adapter output fails CI instead of prod.
 * @param {number} port the port to serve on
 * @returns {import('node:child_process').ChildProcess} the server process
 */
export function startServer(port) {
  return spawn('node', ['build/index.js'], {
    env: { ...process.env, DEV_SKIP_AUTH: 'true', PORT: String(port) },
    stdio: 'inherit'
  });
}

/**
 * Poll until the built app answers `/login`, but abort the moment the server
 * process exits early — otherwise a crashed server leaves us polling a dead port
 * for the full timeout. Each probe is itself bounded (AbortSignal.timeout) so a
 * stalled response cannot hang the loop past the readiness budget.
 * @param {import('node:child_process').ChildProcess} proc the adapter-node server
 * @param {string} base the server's base URL (e.g. http://localhost:3000)
 * @param {number} timeoutMs total readiness budget in milliseconds
 */
export async function waitForReady(proc, base, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let exited = null;
  proc.once('exit', (code, signal) => {
    exited = code ?? signal ?? 0;
  });
  while (Date.now() < deadline) {
    if (exited !== null) {
      throw new Error(`server exited early (${exited}) before becoming ready`);
    }
    try {
      const res = await fetch(`${base}/login`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return;
    } catch {
      // server not up yet (connection refused, or this probe timed out)
    }
    await sleep(500);
  }
  throw new Error(`Server did not become ready on ${base} within ${timeoutMs}ms`);
}

/**
 * Wait for a killed server process to actually exit — SIGTERM only requests
 * shutdown, and the listening port is not released until the process is gone,
 * so retrying on a timer races EADDRINUSE. Escalates to SIGKILL if the process
 * ignores SIGTERM past the grace period.
 * @param {import('node:child_process').ChildProcess} proc the server process
 * @param {number} [graceMs] how long to wait before escalating to SIGKILL
 */
function waitForExit(proc, graceMs = 5000) {
  return new Promise((resolve) => {
    if (proc.exitCode !== null || proc.signalCode !== null) {
      resolve();
      return;
    }
    const timer = setTimeout(() => proc.kill('SIGKILL'), graceMs);
    proc.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

/**
 * Launch the server and wait for readiness, retrying the launch a few times to
 * guard against residual cold-start / port-bind jitter (the deferral reason in
 * #95/#100). waitForReady aborts the moment the process exits, so a bad attempt
 * fails fast instead of burning the whole readiness timeout. A deterministic
 * boot failure (e.g. the adapter-node 5.5.5 regression that shipped boot-dead
 * in v1.14.1) fails every attempt and still fails the lane.
 * @param {string} base the server's base URL
 * @param {number} port the port to serve on
 * @param {{attempts?: number, readyTimeoutMs?: number}} [opts]
 * @returns {Promise<import('node:child_process').ChildProcess>} the ready server
 */
export async function launchServerWithRetries(base, port, opts = {}) {
  const attempts = opts.attempts ?? 3;
  const readyTimeoutMs = opts.readyTimeoutMs ?? 30_000;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const server = startServer(port);
    try {
      await waitForReady(server, base, readyTimeoutMs);
      return server;
    } catch (err) {
      console.error(`Server start attempt ${attempt}/${attempts} failed: ${err.message}`);
      server.kill('SIGTERM');
      if (attempt === attempts) {
        throw new Error(`adapter-node server never became ready after ${attempts} attempts`);
      }
      await waitForExit(server); // port is only released once the process is gone
    }
  }
  throw new Error('unreachable');
}
