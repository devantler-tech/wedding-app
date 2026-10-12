# Contributing to Wedding App

A useful first contribution is a focused wording, layout, accessibility or mock-test improvement.
Discuss substantial changes in an [issue](https://github.com/devantler-tech/wedding-app/issues)
before implementation. Follow the inherited
[Code of Conduct](https://github.com/devantler-tech/.github/blob/main/.github/CODE_OF_CONDUCT.md).

Keep guest records, invitation codes, personal information, credentials and private operational
details out of public issues, PRs and commits. Use the inherited
[security policy](https://github.com/devantler-tech/.github/blob/main/.github/SECURITY.md) for sensitive
reports. If private reporting is unavailable, request a private channel without including the
sensitive details and wait for it before sharing them.

## Prepare your own copy

Install Git, Bash, Node.js 26, npm 11, `jq` and Mike Farah's `yq` v4. The JSON/YAML tools are
needed by the repository's local contract checks; a different tool also named `yq` is not a
substitute. Check `.node-version` and `package.json` for the declared toolchain.

Fork the repository on GitHub. Replace `YOUR-GITHUB-LOGIN` below with your own login, then run
from the directory where you want the checkout:

```sh
git clone https://github.com/YOUR-GITHUB-LOGIN/wedding-app.git
cd wedding-app
git switch -c docs/my-first-change
npm ci
```

Read [AGENTS.md](AGENTS.md), the canonical contract, before editing. Use a separate checkout or
isolated worktree if another session is working on the repository; do not share or discard its
changes. You need no production invitation, database, cluster or release credentials for the
mock contribution path.

Keep this mock checkout free of `.env` files and leave `DATABASE_URL` and `ADMIN_CODE` unset.
Merely setting a database URL starts background migration/seeding at server startup, including
in mock mode; do not let a shell's inherited connection select a real database.

## Make a small change

Correct wording or an accessible label in an existing component under `src/lib/components/`,
or improve a unit/browser assertion under `tests/`. Keep the app's Danish wording and design
consistent. Do not change the real event roster, photographs or invitation data just to create
a test. Never put a private example into a screenshot or public review record.

Use the [README's local mock preview](README.md#run-a-local-mock-preview) to check your change.
Login with a documented mock code, exercise the affected interaction, then stop the server
with Ctrl+C. Form success in mock mode is non-persistent and does not test real database behavior.
The authentication bypass belongs only in local tests and development, never production.

Do not hand-edit `build/`, `.svelte-kit/`, generated migration metadata or dependency lockfiles.
Use the corresponding generator/package manager for intentional changes. Database/authentication
work has additional constraints in [AGENTS.md](AGENTS.md); never substitute a production database
for a local fixture or blindly run the roster seed.

## Validate from the repository root

After `npm ci`, run the basic source checks:

```sh
npm run lint
npm run check
npm test
```

Lint and type checks must exit zero; Vitest must pass. Browser tests additionally need the
Playwright Chromium download:

```sh
npx playwright install chromium
env -u DATABASE_URL -u ADMIN_CODE CI=true DEV_SKIP_AUTH=true npm run test:e2e
```

The install downloads a browser into Playwright's cache. Linux may also need the platform's
documented browser OS dependencies; CI installs them on its disposable runner. Do not silently
change host-wide settings or use a different existing server to hide missing prerequisites.
Stop your own preview first and confirm port 4173 is free. `CI=true` prevents Playwright from
reusing an unrelated listener; its configured command builds and starts the mock preview, runs
the browser assertions and stops its owned server. It needs no PostgreSQL.

Check the built output, the required bundle budget and the actual adapter-node entry point too:

```sh
npm run build
npm run bundlesize
env -u DATABASE_URL -u ADMIN_CODE HOST=127.0.0.1 PORT=3000 npm run boot-smoke
```

Confirm port 3000 is free first, or set `PORT` to another free port you own. The smoke test starts
the built server in mock mode, must report that `/login` answered successfully, and requests
shutdown afterward. Confirm the owned process and listener are gone; never kill somebody else's
server. This proves local startup, not production authentication or a deployed database.

Run the local wiring fixtures as well:

```sh
bash scripts/retired-repo-links.test.sh
sh scripts/workflow-caller-pin-contract.test.sh
sh scripts/homepage-group.test.sh
sh scripts/readonly-rootfs.test.sh
sh scripts/publish-pin-approved.test.sh
NODE_TOOLCHAIN_LIVE=1 sh scripts/node-toolchain-contract.test.sh
git diff --check
```

Every command must exit zero. The retired-link fixture checks consumer wiring locally; CI also
runs the released validator against the clean documentation, a seeded bad link and missing
configuration. CI additionally exercises the built container's read-only filesystem behavior and
required aggregate. Local fixture success does not replace those native checks.

`npm run lhci` is the separate non-required, warn-only Lighthouse lane described in
[AGENTS.md](AGENTS.md). It is not a substitute for the required bundle budget, browser or boot
checks. Record any unavailable checks honestly; do not disable a check to make a PR green.

## Preserve the tenant's guides

This repository consumes the platform-tenant template. `.templatesyncignore` protects the
tenant-owned README, contribution guide and other declared files. Merge an ownership entry
**before starting a later template synchronization**; an entry added only in the same generated
proposal cannot protect that run. For a proposal already open, restore the tailored guide before
merging it. Do not edit the template's generated synchronization output or shared workflow pins
by hand; follow their owning-source procedure.

## Submit a focused draft

Set up commit signing, stage only your deliberate changes and make a signed commit. For a
README-only contribution, for example:

```sh
git add README.md
git commit -S -m "docs: clarify the mock preview"
```

Push to your fork and open a **draft** PR against `main` with the supplied template. Use a
Conventional Commit title, explain the problem and reader-facing outcome, and link the issue.
Record the local checks and user interactions actually tried, including failures and limitations;
never imply that a local mock or source merge is deployed verification. Disclose AI assistance
when used; Agentic Engineer artifacts use the repository's disclosure line.

Address review feedback with evidence tied to the current head. Promotion and squash merge
require the repository's complete current-head review and CI gates. Do not bypass them or request
Copilot review. This guide grants no new source license, production access or permission to
publish or change live data.
