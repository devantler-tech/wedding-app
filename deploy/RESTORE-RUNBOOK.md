# `wedding-db` backup restore runbook

A repeatable procedure to **restore `wedding-db` from its R2 backups into an
isolated recovery cluster** and verify the RSVP / dietary / room-booking data is
intact — so the backup is proven, not merely hoped for.

The data this database holds (RSVP confirmations, dietary notes, room-booking
requests) is **irreplaceable**: there is no second source of truth, and it must
be intact on **16 May 2027**. An untested backup is a guess. This drill turns it
into evidence.

> **Scope & safety.** Every step runs in a throwaway `wedding-db-restore`
> namespace and reads the R2 backups **read-only** via `externalClusters`. The
> live `wedding-app` / `wedding-db` is **never** touched, and the recovery
> cluster runs **no WAL archiver**, so it can never write into the live backup
> path. Teardown deletes the scratch namespace and everything in it.

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

The destination, credentials and retention are **platform-owned** (the tenant's
namespaced `SecretStore` cannot reach the shared backup creds, and
`barmancloud.cnpg.io` is outside the tenant's RBAC) — the tenant `Cluster` only
references the `ObjectStore` by name. The drill below therefore **copies** the
live `ObjectStore` and its credential `Secret` into the scratch namespace rather
than hardcoding the R2 endpoint/bucket here (those are Flux-substituted platform
values and may rotate).

## Prerequisites

- `kubectl` pointed at a cluster that has the **CloudNativePG operator** and the
  **Barman Cloud Plugin** installed and that can reach R2 — i.e. the prod cluster
  (`--context admin@prod`). The drill is isolated, so running it on prod is safe.
- Optional but convenient: the [`kubectl cnpg`](https://cloudnative-pg.io/documentation/current/kubectl-plugin/)
  plugin for `psql` access and status.
- **Do not run during a storage incident.** A recovery cluster provisions a PVC
  and pulls the full base backup + WAL from R2; run it only when Longhorn and the
  live cluster are healthy.

All commands below assume `--context admin@prod`; set it once:

```sh
CTX="--context admin@prod"
```

## Step 1 — scratch namespace

```sh
kubectl $CTX create namespace wedding-db-restore
```

## Step 2 — copy the R2 credentials into the scratch namespace

The platform-shipped `ExternalSecret` only materialises `wedding-db-backup-r2` in
the `wedding-app` namespace. Copy the resolved `Secret` (stripping namespace-bound
and owner metadata so External Secrets does not reclaim it):

```sh
kubectl $CTX -n wedding-app get secret wedding-db-backup-r2 -o json \
  | jq 'del(.metadata.namespace, .metadata.resourceVersion, .metadata.uid,
            .metadata.creationTimestamp, .metadata.ownerReferences,
            .metadata.managedFields, .metadata.annotations, .metadata.labels)' \
  | kubectl $CTX -n wedding-db-restore apply -f -
```

## Step 3 — copy the `ObjectStore` into the scratch namespace

Copy the live platform-shipped `ObjectStore` verbatim (same R2 path, endpoint and
credential reference) so the recovery reads the exact backup location:

```sh
kubectl $CTX -n wedding-app get objectstore wedding-db -o json \
  | jq 'del(.metadata.namespace, .metadata.resourceVersion, .metadata.uid,
            .metadata.generation, .metadata.creationTimestamp,
            .metadata.ownerReferences, .metadata.managedFields,
            .metadata.annotations, .metadata.labels, .status)' \
  | kubectl $CTX -n wedding-db-restore apply -f -
```

## Step 4 — bootstrap the recovery cluster

Apply the recovery `Cluster`. The key detail is **`serverName: wedding-db`**: the
recovery cluster has a different name (`wedding-db-restore`), so without an
explicit `serverName` the plugin would look under a non-existent server path
instead of the live one the backups were archived under.

```sh
cat <<'EOF' | kubectl $CTX apply -f -
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: wedding-db-restore
  namespace: wedding-db-restore
spec:
  instances: 1
  storage:
    size: 2Gi  # >= the live cluster's 1Gi; headroom for the restored data
  bootstrap:
    recovery:
      source: wedding-db
      database: wedding
      owner: wedding
      # For a point-in-time restore, uncomment and pick a target inside the
      # 30-day retention window (omit to restore to the latest archived WAL):
      # recoveryTarget:
      #   targetTime: "2026-06-20 12:00:00+00"
  externalClusters:
    - name: wedding-db
      plugin:
        name: barman-cloud.cloudnative-pg.io
        parameters:
          barmanObjectName: wedding-db  # the ObjectStore copied in step 3
          serverName: wedding-db        # the path the LIVE cluster archived under
  # NOTE: deliberately NO spec.plugins WAL archiver — the recovery cluster must
  # never archive into the live backup path. externalClusters gives read-only
  # access to the existing backups; this cluster keeps its WAL local.
EOF
```

Watch it bootstrap (restore is complete when `STATUS` is `Cluster in healthy
state`):

```sh
kubectl $CTX -n wedding-db-restore get cluster wedding-db-restore -w
# In another shell, the restore job logs:
kubectl $CTX -n wedding-db-restore logs -l cnpg.io/cluster=wedding-db-restore --all-containers -f
```

## Step 5 — verify data integrity

Compare row counts between the **restore** and the **live** primary — they should
match (the restore is as-of the latest archived WAL):

```sh
# Restore cluster
kubectl $CTX cnpg psql -n wedding-db-restore wedding-db-restore -- -d wedding -c "
  SELECT (SELECT count(*) FROM guest_pairs)   AS guest_pairs,
         (SELECT count(*) FROM guests)        AS guests,
         (SELECT count(*) FROM room_bookings) AS room_bookings,
         (SELECT count(*) FROM guests WHERE attending IS NOT NULL) AS responded;"

# Live cluster (read-only count, same query)
kubectl $CTX cnpg psql -n wedding-app wedding-db -- -d wedding -c "
  SELECT (SELECT count(*) FROM guest_pairs)   AS guest_pairs,
         (SELECT count(*) FROM guests)        AS guests,
         (SELECT count(*) FROM room_bookings) AS room_bookings,
         (SELECT count(*) FROM guests WHERE attending IS NOT NULL) AS responded;"
```

> Without the `kubectl cnpg` plugin, exec directly:
> `kubectl $CTX -n wedding-db-restore exec -it wedding-db-restore-1 -c postgres -- psql -U postgres -d wedding -c "<query>"`.

Spot-check that the restored rows hold **real** content, not just the right count:

```sh
kubectl $CTX cnpg psql -n wedding-db-restore wedding-db-restore -- -d wedding -c "
  SELECT gp.name AS pair, g.name AS guest, g.attending, g.dietary_notes
  FROM guests g JOIN guest_pairs gp ON gp.id = g.guest_pair_id
  WHERE g.dietary_notes IS NOT NULL AND g.dietary_notes <> '' LIMIT 5;"

kubectl $CTX cnpg psql -n wedding-db-restore wedding-db-restore -- -d wedding -c "
  SELECT gp.code, rb.requested, rb.nights, rb.notes
  FROM room_bookings rb JOIN guest_pairs gp ON gp.id = rb.guest_pair_id
  WHERE rb.requested LIMIT 5;"
```

**Pass criteria:** counts match the live primary and the spot-checks return
genuine RSVP / dietary / booking rows → the R2 backup is proven restorable.

## Step 6 — teardown

```sh
kubectl $CTX delete namespace wedding-db-restore
```

This removes the recovery `Cluster`, its PVC, and the copied `Secret` /
`ObjectStore`. The live cluster and the R2 backups are untouched throughout.

## Recording the result

Paste the step-5 output (restore vs live counts + spot-checks) into
[issue #133](https://github.com/devantler-tech/wedding-app/issues/133) as the
evidence the drill succeeded, with the date it was run.

## Making it periodic

This is a one-off drill today. To keep the guarantee fresh, re-run it on a cadence
(e.g. quarterly, and again close to May 2027). A future enhancement could wrap
steps 1–6 as a scheduled `Job` that bootstraps the recovery cluster, asserts the
counts are non-zero and consistent, and tears itself down — turning the manual
drill into a continuous backup-restore check.
