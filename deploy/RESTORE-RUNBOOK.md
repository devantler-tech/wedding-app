# `wedding-db` backup restore runbook

A repeatable procedure to **restore `wedding-db` from its R2 backups into an
isolated recovery cluster** and verify the RSVP / dietary / room-booking data is
intact — so the backup is proven, not merely hoped for.

The data this database holds (RSVP confirmations, dietary notes, room-booking
requests) is **irreplaceable**: there is no second source of truth, and it must
be intact on **16 May 2027**. An untested backup is a guess. This drill turns it
into evidence.

> **Drill-proven.** This procedure was executed against production on
> **2026-07-05** ([#133](https://github.com/devantler-tech/wedding-app/issues/133)):
> base backup + WAL pulled from R2, recovery cluster healthy in **~95 seconds**,
> all row counts identical to the live primary, and per-row content checksums of
> `guest_pairs` / `guests` / `room_bookings` **byte-identical**. The live cluster
> was never modified.

> **Scope & safety.** The recovery cluster runs **in the `wedding-app`
> namespace under a different name** (`wedding-db-drill`). CloudNativePG scopes
> every resource it creates per cluster name (pods, PVCs, secrets, and the
> `-rw`/`-ro`/`-r` services), and the app only ever connects to `wedding-db-rw`,
> so the drill cannot collide with the live database. The drill spec has **no
> WAL archiver** (`spec.plugins` omitted), so it reads the backup path via
> `externalClusters` and can never write into it. Teardown is a single
> `kubectl delete` of the drill `Cluster`, which cascades its pod and PVC.
>
> **Why not a scratch namespace?** An earlier version of this runbook restored
> into a throwaway `wedding-db-restore` namespace with copies of the
> `ObjectStore` and R2 `Secret`. On this platform that procedure **does not
> work as written**: Kyverno's `add-default-deny` policy generates a
> default-deny network policy into every new namespace, so the recovery job's
> egress to R2 is blocked and the restore hangs at the base-backup pull.
> Running in `wedding-app` avoids all of it — the namespace-wide `app`
> `CiliumNetworkPolicy` already allows egress to `*.r2.cloudflarestorage.com:443`
> plus the CNPG operator ingress, and the platform-shipped `ObjectStore
> wedding-db` and `wedding-db-backup-r2` secret are already present, so there is
> nothing to copy.

## What is backed up (verified live)

The backup chain is the CNPG **Barman Cloud Plugin**, not the deprecated in-tree
`spec.backup.barmanObjectStore`:

| Piece | Where | Value |
|---|---|---|
| Daily base backup | `deploy/db-scheduled-backup.yaml` (`ScheduledBackup wedding-db-daily`) | 03:00 UTC, `method: plugin` |
| Continuous WAL archiving | `deploy/cluster.yaml` (`spec.plugins[].isWALArchiver: true`) | routed through the plugin |
| Destination + creds + retention | platform-shipped `ObjectStore wedding-db` (`platform/k8s/bases/apps/wedding-app/db-object-store.yaml`) | `s3://<r2_bucket>/cnpg/wedding-db`, R2, **30-day** retention |
| R2 credentials | platform-shipped `ExternalSecret wedding-db-backup-r2` (from OpenBao `infrastructure/backup/r2`) | `ACCESS_KEY_ID` / `SECRET_ACCESS_KEY` / `REGION=auto` |

Together these give **point-in-time recovery** anywhere inside the 30-day window.
Before drilling, sanity-check the window is live:

```sh
kubectl --context admin@prod -n wedding-app get objectstore wedding-db \
  -o jsonpath='{.status.serverRecoveryWindow}'
# expect a recent lastSuccessfulBackupTime (daily 03:00 UTC)
```

## Prerequisites

- `kubectl` pointed at the prod cluster (`--context admin@prod`), which has the
  **CloudNativePG operator** and the **Barman Cloud Plugin** installed and can
  reach R2. The drill is isolated by cluster name, so running it on prod is safe.
- **Do not run during a storage incident.** The recovery provisions a PVC and
  pulls the full base backup + WAL from R2; run it only when Longhorn and the
  live cluster are healthy.

All commands below assume `--context admin@prod`; set it once:

```sh
CTX="--context admin@prod"
```

## Step 1 — record the live baseline

Counts plus an order-independent, schema-agnostic content checksum per core
table (run on the current primary — `kubectl $CTX -n wedding-app get cluster
wedding-db -o jsonpath='{.status.currentPrimary}'`):

```sh
PRIMARY=$(kubectl $CTX -n wedding-app get cluster wedding-db -o jsonpath='{.status.currentPrimary}')
live() { kubectl $CTX -n wedding-app exec "$PRIMARY" -c postgres -- psql -U postgres -d wedding -tAc "$1"; }

live "select 'guest_pairs', count(*) from guest_pairs union all
      select 'guests', count(*) from guests union all
      select 'room_bookings', count(*) from room_bookings"
for t in guest_pairs guests room_bookings; do
  echo -n "$t: "
  live "select md5(string_agg(h,'|')) from (select md5(t::text) h from $t t order by 1) s"
done
```

## Step 2 — bootstrap the recovery cluster

Apply the drill `Cluster`. Key details:

- **`serverName: wedding-db`** — the drill cluster has a different name, so
  without this the plugin would look under a non-existent path instead of the
  one the live cluster archives under.
- **No `spec.plugins`** — the drill must never archive into the live backup
  path; `externalClusters` gives read-only access.
- `imageName` pinned to the live cluster's image (WAL replay needs a matching
  or newer PostgreSQL major); check `deploy/cluster.yaml` if it has moved.
- Same storage size as live (`1Gi` today); bump if the live volume grows.

```sh
cat <<'EOF' | kubectl $CTX apply -f -
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: wedding-db-drill
  namespace: wedding-app
  labels:
    app.kubernetes.io/component: recovery-drill
  annotations:
    devantler.tech/purpose: "wedding-app#133 backup restore drill — throwaway, delete after verification"
spec:
  instances: 1
  imageName: ghcr.io/cloudnative-pg/postgresql:18.3-system-trixie
  enableSuperuserAccess: false
  enablePDB: false
  storage:
    size: 1Gi
    storageClass: longhorn-wffc
  bootstrap:
    recovery:
      source: wedding-db
      # For point-in-time recovery, pick a target inside the 30-day window
      # (omit to restore to the latest archived WAL):
      # recoveryTarget:
      #   targetTime: "2026-06-20 12:00:00+00"
  externalClusters:
    - name: wedding-db
      plugin:
        name: barman-cloud.cloudnative-pg.io
        parameters:
          barmanObjectName: wedding-db  # the platform-shipped ObjectStore, already in this namespace
          serverName: wedding-db        # the path the LIVE cluster archives under
EOF
```

Watch it bootstrap — the full-recovery job pulls the base backup, then the
instance replays WAL and promotes onto a **new timeline** (expected):

```sh
kubectl $CTX -n wedding-app get cluster wedding-db-drill -w
# 2026-07-05 drill: "Setting up primary" ~60s → "Cluster in healthy state" at ~95s
```

If it sticks in "Setting up primary", read the recovery job logs:

```sh
kubectl $CTX -n wedding-app logs -l cnpg.io/cluster=wedding-db-drill --all-containers --tail 50
```

## Step 3 — verify data integrity

Run the same counts + checksums as step 1 against the drill and compare:

```sh
drill() { kubectl $CTX -n wedding-app exec wedding-db-drill-1 -c postgres -- psql -U postgres -d wedding -tAc "$1"; }

drill "select 'guest_pairs', count(*) from guest_pairs union all
       select 'guests', count(*) from guests union all
       select 'room_bookings', count(*) from room_bookings"
for t in guest_pairs guests room_bookings; do
  echo -n "$t: "
  drill "select md5(string_agg(h,'|')) from (select md5(t::text) h from $t t order by 1) s"
done
```

**Pass criteria:** counts match and the three checksums are **identical** to the
live baseline (checksums are as-of the last archived WAL — `archive_timeout` is
5 min, so a write landing mid-drill can legitimately differ; re-check against a
fresh live baseline before calling it a failure). Optionally spot-check real
content presence (aggregates only — never paste raw guest rows into GitHub,
they are personal data):

```sh
drill "select count(*) from guests where attending is not null"
drill "select count(*) from guests where dietary_notes is not null and dietary_notes <> ''"
drill "select count(*) from room_bookings where requested"
```

## Step 4 — teardown

```sh
kubectl $CTX -n wedding-app delete cluster wedding-db-drill
```

This cascades the drill pod, PVC and per-cluster secrets/services. Confirm only
the live cluster remains:

```sh
kubectl $CTX -n wedding-app get cluster,pods,pvc
```

The live cluster and the R2 backups are untouched throughout.

## Recording the result

Post the counts + checksums comparison (no raw rows — PII) to
[issue #133](https://github.com/devantler-tech/wedding-app/issues/133) (first
drill) or the ops log, with the date it was run.

## Making it periodic

The 2026-07-05 drill proves the chain today. To keep the guarantee fresh, re-run
this on a cadence (e.g. quarterly, and again close to May 2027). A future
enhancement could wrap steps 2–4 as a scheduled `Job` that bootstraps the
recovery cluster, asserts counts/checksums are consistent, and tears itself
down — turning the manual drill into a continuous backup-restore check.
