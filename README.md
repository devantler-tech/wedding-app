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

Manifests are in `deploy/`. The app expects a `wedding-db-app` secret (created automatically by the CloudNativePG operator) with a `uri` key containing the PostgreSQL connection string.

The `deploy/secret.enc.yaml` file is SOPS-encrypted with an Age key. In the cluster, Flux handles decryption automatically. For manual deployment, decrypt first:

```bash
sops -d deploy/secret.enc.yaml | kubectl apply -f -
kubectl apply -k deploy/
```

