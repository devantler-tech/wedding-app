#!/bin/sh
# Render deploy/ (the production entry), deploy/prod and deploy/dev, and keep
# production's identity out of dev. Needs kubectl (with its built-in Kustomize)
# and yq, both present on the runner.
set -eu

repo_root=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

fail() {
	printf 'FAIL: %s\n' "$*" >&2
	exit 1
}

kubectl kustomize "$repo_root/deploy" > "$work/root.yaml" || fail "deploy/ does not render"
kubectl kustomize "$repo_root/deploy/prod" > "$work/prod.yaml" || fail "deploy/prod does not render"
kubectl kustomize "$repo_root/deploy/dev" > "$work/dev.yaml" || fail "deploy/dev does not render"

# The platform reconciles deploy/ for production, so it must be exactly deploy/prod.
cmp -s "$work/root.yaml" "$work/prod.yaml" ||
	fail "deploy/kustomization.yaml must include only ./prod"

for overlay in prod dev; do
	storage_class=$(yq eval-all 'select(.kind == "Cluster" and .metadata.name == "wedding-db") | .spec.storage.storageClass' "$work/$overlay.yaml")
	[ "$storage_class" = longhorn-v2 ] || fail "deploy/$overlay must provision wedding-db on Longhorn V2"
done

prod_instances=$(yq eval-all 'select(.kind == "Cluster" and .metadata.name == "wedding-db") | .spec.instances' "$work/prod.yaml")
[ "$prod_instances" = 4 ] || fail "deploy/prod must keep a spare database instance while replacing the V1 disks"
prod_resize=$(yq eval-all 'select(.kind == "Cluster" and .metadata.name == "wedding-db") | .spec.storage.resizeInUseVolumes' "$work/prod.yaml")
[ "$prod_resize" = false ] || fail "deploy/prod must preserve the existing database claims during the storage migration"

count_kind() {
	KIND=$1 yq eval-all '[.] | map(select(.kind == strenv(KIND))) | length' "$work/dev.yaml"
}
dev_field() {
	KIND=$1 yq eval-all "select(.kind == strenv(KIND)) | $2" "$work/dev.yaml"
}

# Dev runs one app replica on one database instance of its own, without backup.
[ "$(count_kind Deployment)" -eq 1 ] || fail "deploy/dev must render only the app Deployment"
[ "$(dev_field Deployment .metadata.name)" = wedding-app ] || fail "deploy/dev must render the wedding-app Deployment"
[ "$(dev_field Deployment .spec.replicas)" = 1 ] || fail "deploy/dev must run one app replica"
[ "$(count_kind Cluster)" -eq 1 ] || fail "deploy/dev must render one database Cluster"
[ "$(dev_field Cluster .spec.instances)" = 1 ] || fail "deploy/dev must run one database instance"
[ "$(dev_field Cluster .spec.enablePDB)" = false ] || fail "deploy/dev's single database instance must not get a CNPG PodDisruptionBudget"
[ "$(dev_field Cluster '.spec | has("plugins")')" = false ] || fail "deploy/dev's database must not archive to the production backup store"

# Everything dev renders lives in the wedding-app-dev namespace, and nowhere else.
[ "$(yq eval-all '[.] | map(select(.metadata.namespace != "wedding-app-dev")) | length' "$work/dev.yaml")" -eq 0 ] ||
	fail "every deploy/dev resource must be in the wedding-app-dev namespace"

# Production identity stays in deploy/prod: the route, the disruption budget,
# the backups and the admin code in OpenBao.
for kind in HTTPRoute Gateway Certificate Issuer PodDisruptionBudget ScheduledBackup Backup ObjectStore \
	SecretStore ExternalSecret PushSecret Password; do
	[ "$(count_kind "$kind")" -eq 0 ] || fail "deploy/dev renders a $kind; it belongs in deploy/prod"
done
for needle in wedding.platform.devantler.tech apps/wedding-app/ wedding-db-dedicated r2.cloudflarestorage.com 'namespace: wedding-app$'; do
	if grep -Eq -- "$needle" "$work/dev.yaml"; then
		fail "deploy/dev references production ($needle)"
	fi
done
# Dev's network policy is created fresh in its own namespace, where the
# platform refuses a tenant policy that names any namespace.
if grep -Fq 'io.kubernetes.pod.namespace' "$work/dev.yaml"; then
	fail "deploy/dev network policy names a namespace; select pods by label instead"
fi

printf '%s\n' 'PASS: deploy/ renders deploy/prod; deploy/dev runs one replica on its own database without production identity'
