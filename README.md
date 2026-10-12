# Wedding App

An invitation-only wedding website where guests use an invitation code to RSVP, request a
room booking and read the program and practical information. This repository contains the
SvelteKit application, not an invitation service for unrelated events. Guest records, invitation
codes, dietary notes and operational details must not be copied into public issues or examples.

Invited guests should use their existing invitation and site link. Contributors can run the
database-free local preview below without a real invitation, database or platform access.

## Run a local mock preview

Use Git, Bash, Node.js 26 (declared in `.node-version`) and npm 11 (`package.json` declares the
package-manager version). From the directory where you want your checkout:

```sh
git clone https://github.com/devantler-tech/wedding-app.git
cd wedding-app
npm ci
env -u DATABASE_URL -u ADMIN_CODE DEV_SKIP_AUTH=true npm run dev -- --host 127.0.0.1
```

Open the local address printed by Vite, normally `http://127.0.0.1:5173/`. The login page accepts
these **local mock codes**, not production invitations:

| Code | Local view |
|---|---|
| `MOCK1` | Bundled guest-pair view |
| `MOCK2` | Bundled single-guest view |
| `ADMIN` | Mock administration overview |

Use a fresh checkout without a local `.env` file; the command clears inherited database/admin
variables for this process. Try a guest view and a form submission. In this mode endpoints return mock
success without persisting changes. The bundled views are not a blank or fully fictional guest
database; keep their content local. Stop the dev server with Ctrl+C.

`DEV_SKIP_AUTH=true` bypasses authentication. Use it only for local development and tests,
never on a live deployment. A successful mock preview does not verify real invitation login,
database persistence or production availability.

## Contribute

Start with [CONTRIBUTING.md](CONTRIBUTING.md) for a first change, prerequisites, the complete
local check sequence and submission requirements. The app uses SvelteKit/Svelte, TypeScript,
TailwindCSS and Drizzle/PostgreSQL, with Vitest and Playwright tests.

Source ownership is relative to the repository root:

- `src/routes/` contains login, guest, administration and API routes.
- `src/lib/components/` contains the shared interface; `src/lib/server/` holds server-only
  authentication, database and validation logic.
- `tests/unit/` and `tests/e2e/` contain unit and browser tests.
- `drizzle/` contains generated migrations; generate from the schema, not by hand-editing metadata.
- `deploy/` is the platform's deployment configuration, not a local first-run prerequisite.

[AGENTS.md](AGENTS.md) is the canonical repository contract. The contribution guide distinguishes
the required production-build, bundle-budget and adapter-node boot checks from the optional
Lighthouse lane; a Vite preview alone does not prove the production server starts.

## Database and live operations are separate

Ordinary content, UI and test contributions need no database or publishing credentials.
Database work needs a separately authorized, owned disposable instance and fictional records.
Setting `DATABASE_URL` also starts background migration and seeding during server startup, even
when using the mock authentication flag; it is not a read-only connection test. The existing
`db:seed` script inserts the configured event roster; **do not run it against a
production database or use it as a generic fictional fixture**. It does not print invitation codes.

Changes to the schema are generated with `npm run db:generate` and reviewed with their migration
output. Applying migrations and seeding change data and are not part of the mock setup above.
Keep connection strings and codes out of commits, logs and public discussion.

Live publication is owned by the repository's release/CD workflows and platform reconciliation.
Do not manually apply deployment manifests to try the README. Authorized recovery operators
follow [the restore runbook](deploy/RESTORE-RUNBOOK.md); it is not contributor onboarding.

## Security and reuse

Follow the inherited [security policy](https://github.com/devantler-tech/.github/blob/main/.github/SECURITY.md)
for sensitive reports and [Code of Conduct](https://github.com/devantler-tech/.github/blob/main/.github/CODE_OF_CONDUCT.md)
for collaboration. Request a private reporting route without posting sensitive details if private
reporting is unavailable. This repository has no application-source license grant; public source
and dependency licenses do not grant unrestricted reuse of the code, event content or photographs.

