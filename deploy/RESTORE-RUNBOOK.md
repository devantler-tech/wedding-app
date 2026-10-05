# Wedding database backup and restore

The database archives WAL and daily base backups through the Barman Cloud
Plugin to the dedicated backup destination. The tenant Cluster references
`wedding-db-dedicated`; the platform supplies that ObjectStore and its dedicated
credential. The platform also preserves the production archive identity.
The shared platform backup credential must not be projected into this tenant.

## Verify a restore

Use the platform's protected **Verify Wedding Dedicated Restore** workflow,
dispatched from `main` with `confirm=verify-wedding-dedicated-restore`.
Follow the [platform restore drill](https://github.com/devantler-tech/platform/blob/main/docs/dr/restore-drill.md)
for the current procedure and receipt requirements.

The workflow takes a fresh dedicated backup, restores it into an isolated
temporary namespace using only dedicated backup access, compares aggregate guest
data without logging guest records, and checks temporary namespace and storage
cleanup. It shares the production deployment lock and leaves the live database
running. A completed Backup alone does not prove that a restore works.

Require a successful workflow bound to its source revision and all backup,
restore, comparison and cleanup receipts. A failed or partial run proves nothing;
resolve the failure before calling the recovery path healthy. Never use the
retired shared ObjectStore as a fallback.

## Recover or rotate

An isolated drill proves recovery; it does not authorize replacing the live
database. For an actual outage, use the [platform disaster-recovery runbook](https://github.com/devantler-tech/platform/blob/main/docs/dr/runbook.md)
and make the recovery target explicit before changing production data.

The platform owns the encrypted bootstrap and credential-rotation procedure.
After a dedicated-token rotation, require a new backup and isolated restore,
then a successful **Verify Wedding Backup Denial** run from platform `main`
with `confirm=verify-wedding-backup-denial`. That check runs beside the platform's
existing shared credential using a temporary dedicated-key copy; shared access
stays outside the tenant.
