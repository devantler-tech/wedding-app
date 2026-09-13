#!/usr/bin/env sh
# Pin the app container's read-only root filesystem (#324).
#
# The platform suppressed Kubescape C-0017 for this namespace on the promise that the app would set
# readOnlyRootFilesystem in a follow-up release. That promise went unkept for 70 days because nothing
# checked it. This check keeps the flag from silently reverting, and keeps the one declared write
# path (/tmp) mounted, so a future dependency that needs scratch space fails here rather than by
# crash-looping in production.
#
# Usage: readonly-rootfs.test.sh [deployment.yaml]   (default: deploy/deployment.yaml)
set -eu

script_dir=$(CDPATH='' cd -P -- "$(dirname -- "$0")" && pwd)
repo_root=$(dirname -- "$script_dir")
deployment=${1:-$repo_root/deploy/deployment.yaml}

fail() {
	echo "FAIL: $*" >&2
	exit 1
}

[ -f "$deployment" ] || fail "deployment manifest not found: $deployment"
command -v yq >/dev/null 2>&1 || fail "yq is required"

check_manifest() {
	manifest=$1
	# One program, one verdict: a parse error or a missing container must not read as a pass.
	# Every clause is parenthesised, and so is the whole conjunction after the `as $pod` binding:
	# measured with yq 4.53, a chain of five `and`s there evaluates to false although each clause is
	# true on its own, while the same chain wrapped in one outer pair evaluates to true.
	# The yq program is deliberately literal; `$pod` is a yq variable, not a shell one.
	# shellcheck disable=SC2016
	yq eval -e '
		select(.kind == "Deployment")
		| .spec.template.spec as $pod
		| (
			(($pod.containers | length) >= 1)
			and (([$pod.containers[] | select(.securityContext.readOnlyRootFilesystem != true)] | length) == 0)
			and (([$pod.containers[] | select(([.volumeMounts[]? | select(.mountPath == "/tmp")] | length) != 1)] | length) == 0)
			and (([$pod.volumes[]? | select(.emptyDir != null)] | length) >= 1)
			and ((([$pod.containers[].volumeMounts[]? | select(.mountPath == "/tmp") | .name] - [$pod.volumes[]? | select(.emptyDir != null) | .name]) | length) == 0)
		)
	' "$manifest" >/dev/null 2>&1
}

check_manifest "$deployment" ||
	fail "every app container must set readOnlyRootFilesystem: true and mount an emptyDir at /tmp ($deployment)"

# Negative controls: the check must refuse each way the protection can be lost.
mutation_dir=$(mktemp -d)
trap 'rm -rf "$mutation_dir"' EXIT

refuses() {
	description=$1
	mutation=$2
	yq eval "$mutation" "$deployment" >"$mutation_dir/mutant.yaml"
	if check_manifest "$mutation_dir/mutant.yaml"; then
		fail "mutation passed: $description"
	fi
}

refuses "read-only root disabled" '.spec.template.spec.containers[0].securityContext.readOnlyRootFilesystem = false'
refuses "read-only root unset" 'del(.spec.template.spec.containers[0].securityContext.readOnlyRootFilesystem)'
refuses "/tmp mount removed" 'del(.spec.template.spec.containers[0].volumeMounts)'
refuses "scratch volume removed" 'del(.spec.template.spec.volumes)'
refuses "/tmp backed by a non-emptyDir volume" '.spec.template.spec.volumes[0] = {"name": "tmp", "configMap": {"name": "x"}}'

echo "PASS: read-only root filesystem with a declared /tmp scratch mount (+5 negative controls)"
