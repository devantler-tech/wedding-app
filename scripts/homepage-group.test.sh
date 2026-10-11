#!/bin/sh
# Parse the actual discovery payload, not a textual spelling of the manifest.
set -eu

repo_root=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)
route="${repo_root}/deploy/httproute.yaml"
enabled=$(yq -r '.metadata.annotations."gethomepage.dev/enabled"' "${route}")
group=$(yq -r '.metadata.annotations."gethomepage.dev/group"' "${route}")
if [ "${enabled}" != true ] || [ "${group}" != Personal ]; then
  printf '%s\n' "Homepage discovery must be enabled in the Personal group" >&2
  exit 1
fi
printf '%s\n' 'Homepage discovery remains enabled in Personal.'
