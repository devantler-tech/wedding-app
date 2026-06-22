# Bryllup — Aimée & Nikolai Emil

Wedding website for Aimée & Nikolai Emil, 16. maj 2027 at Gl. Brydegaard, Helnæsvej 4, 5683 Brydegård.

Guests log in with a unique invitation code to access the site, confirm attendance, request a room booking, and view practical information.

## Features

- **Invitation code login** — 14 guest pairs, each with a unique 6-character code
- **RSVP** — per-person attendance confirmation with dietary notes
- **Room booking** — request overnight accommodation through the couple
- **Program** — full day schedule with timeline
- **Photo gallery** — chronological journey gallery with captions
- **Wishlist** — link to Ønskeskyen
- **Practical info** — dress code, child-free evening, accommodation & venue address
- **Countdown timer** — live countdown to the wedding date

## Tech stack

- [SvelteKit](https://kit.svelte.dev) + TypeScript
- [TailwindCSS v4](https://tailwindcss.com)
- [Drizzle ORM](https://orm.drizzle.team) + PostgreSQL
- [Playwright](https://playwright.dev) for E2E tests
- Deployed to Kubernetes via [CloudNativePG](https://cloudnative-pg.io) + [Longhorn](https://longhorn.io)

## Running locally

### Prerequisites

- Node.js ≥ 22
- npm

### Install dependencies

```bash
npm install
```

### Development (no database required)

Set `DEV_SKIP_AUTH=true` to bypass authentication and run without a PostgreSQL instance. RSVP and booking form submissions return mock success responses and do not persist changes.

```bash
DEV_SKIP_AUTH=true npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and log in with:

| Code | View |
|------|------|
| `MOCK1` | Guest view (mock data for Charlotte og Orla) |
| `ADMIN` | Admin overview |

### Development (with database)

1. Start a PostgreSQL instance and set the connection string:

   ```bash
   export DATABASE_URL="postgresql://user:password@localhost:5432/wedding"
   ```

2. Run migrations and seed guest data:

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

   The seed script prints each guest pair's generated code, e.g.:

   ```
   ✅ Charlotte og Orla → AB3K7Q
   ```

3. Start the dev server:

   ```bash
   npm run dev
   ```

## Other commands

| Command | Description |
|---|---|
| `npm run build` | Production build |
| `npm run preview` | Preview the production build locally |
| `npm run check` | Type-check with `svelte-check` |
| `npm run test` | Run Vitest unit tests |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run lint` | Lint with ESLint |
| `npm run db:generate` | Generate Drizzle migration files |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Seed guest pairs and codes |

## Kubernetes deployment

Manifests are in `deploy/`. The app consumes two secrets, both delivered in-cluster — neither is committed to this repo (there is no SOPS in this repo):

- **`wedding-db-app`** — the PostgreSQL connection string (`uri` key), created automatically by the CloudNativePG operator from `deploy/cluster.yaml`.
- **`wedding-app-admin-code`** — the admin login code (`ADMIN_CODE`), materialised by External Secrets from OpenBao through the namespaced `openbao` `SecretStore` (`deploy/secretstore.yaml` + `deploy/admin-code-externalsecret.yaml`).

In the cluster, Flux applies `deploy/` as an OCI Kustomize app and External Secrets fetches the admin code from OpenBao automatically. For manual deployment against a cluster that already has the CloudNativePG operator and the External Secrets Operator (with the OpenBao backend) installed:

```bash
kubectl apply -k deploy/
```

### Database backup & restore

`wedding-db` is backed up to Cloudflare R2 (daily base backup at 03:00 UTC plus
continuous WAL archiving, 30-day point-in-time recovery) via the CloudNativePG
Barman Cloud Plugin. The restore path — bootstrapping an isolated recovery cluster
from those backups and verifying the RSVP/booking data is intact — is documented
in [`deploy/RESTORE-RUNBOOK.md`](deploy/RESTORE-RUNBOOK.md).

