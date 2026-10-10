#!/usr/bin/env sh
# Keep one declared Node/npm toolchain (#343).
#
# #340 happened because CI ran one Node major and the image shipped another: the two bundled npm
# majors resolve the same manifest into different trees, so every lockfile Dependabot wrote was
# rejected at `npm ci`. Nothing held the two numbers together. This check does: .node-version is the
# one declaration, and the image, the workflows and package.json must all agree with it, so changing
# one without the others fails here instead of weeks later as "Dependabot is broken".
#
# Usage: node-toolchain-contract.test.sh [repo-root]   (default: this script's repository)
# With NODE_TOOLCHAIN_LIVE=1 it also compares the installed `node` and `npm` majors.
set -eu

script_dir=$(CDPATH='' cd -P -- "$(dirname -- "$0")" && pwd)
default_root=$(dirname -- "$script_dir")

fail() {
	echo "FAIL: $*" >&2
	exit 1
}

command -v yq >/dev/null 2>&1 || fail "yq is required"
command -v jq >/dev/null 2>&1 || fail "jq is required"

# Prints the first violation and returns 1; prints nothing and returns 0 when the root agrees.
# POSIX sh has no local variables, so this function keeps its own names (dir, want).
check_root() {
	dir=$1

	[ -f "$dir/.node-version" ] || { echo ".node-version is missing"; return 1; }
	want=$(cat "$dir/.node-version")
	case $want in
	'' | *[!0-9]*) echo ".node-version must hold a bare major, got '$want'"; return 1 ;;
	esac

	[ -f "$dir/Dockerfile" ] || { echo "Dockerfile is missing"; return 1; }
	# Every stage's image, whatever flags precede it or registry prefixes it: "FROM --platform=…
	# docker.io/library/node:27" must not slip past a pattern that only knows the short form.
	images=$(awk '
		toupper($1) == "FROM" {
			i = 2
			while (i <= NF && $i ~ /^--/) i++
			image = $i
			sub(/@.*/, "", image)
			name = image; sub(/:[^\/]*$/, "", name); sub(/.*\//, "", name)
			if (name != "node") next
			tag = (image ~ /:[^\/]*$/) ? image : ""; sub(/.*:/, "", tag)
			print (tag == "" ? "untagged" : tag)
		}' "$dir/Dockerfile")
	[ -n "$images" ] || { echo "Dockerfile has no 'FROM node:' stage"; return 1; }
	for tag in $images; do
		case $tag in
		"$want" | "$want"-* | "$want".*) ;;
		*) echo "Dockerfile uses node:$tag but .node-version declares $want"; return 1 ;;
		esac
	done

	engines=$(jq -r '.engines.node // ""' "$dir/package.json") || { echo "package.json is unreadable"; return 1; }
	[ "$engines" = "^$want" ] || { echo "engines.node is '$engines', expected '^$want'"; return 1; }

	manager=$(jq -r '.packageManager // ""' "$dir/package.json")
	npm_major=$(printf '%s\n' "$manager" | sed -n 's/^npm@\([0-9]\{1,\}\)\.[0-9]\{1,\}\.[0-9]\{1,\}$/\1/p')
	[ -n "$npm_major" ] || { echo "packageManager is '$manager', expected an exact npm@x.y.z"; return 1; }

	seen=0
	for workflow in "$dir"/.github/workflows/*.yaml "$dir"/.github/workflows/*.yml; do
		[ -f "$workflow" ] || continue
		# One row per setup-node step: "<node-version>|<node-version-file>".
		rows=$(yq eval -r '
			[.jobs[]?.steps[]? | select((.uses // "") | test("^actions/setup-node@"))]
			| .[] | ((.with."node-version" // "") | tostring) + "|" + (.with."node-version-file" // "")
		' "$workflow") || { echo "cannot read $workflow"; return 1; }
		for row in $rows; do
			seen=$((seen + 1))
			[ "$row" = "|.node-version" ] || {
				echo "${workflow#"$dir"/} sets up Node without reading .node-version (found '$row')"
				return 1
			}
		done
	done
	[ "$seen" -ge 1 ] || { echo "no workflow sets up Node, so nothing was checked"; return 1; }

	if [ "${NODE_TOOLCHAIN_LIVE:-0}" = 1 ]; then
		live_node=$(node --version | sed 's/^v\([0-9]*\).*/\1/')
		[ "$live_node" = "$want" ] || { echo "installed Node major is $live_node, declared $want"; return 1; }
		# Majors on purpose. CI and the image run the npm bundled with whichever Node 26 release
		# they resolve, so an exact comparison would fail unrelated pull requests on every Node
		# patch release. #340 was a major skew: npm 10 rejected lockfiles npm 11 wrote. The exact
		# packageManager value is what Dependabot and version managers read; it is not installed.
		live_npm=$(npm --version | sed 's/\..*//')
		[ "$live_npm" = "$npm_major" ] || { echo "installed npm major is $live_npm, packageManager declares $npm_major"; return 1; }
	fi
	return 0
}

root=${1:-$default_root}
reason=$(check_root "$root") || fail "$reason"

# Negative controls: each drift this check exists for must be refused, or a pass above proves nothing.
scratch=$(mktemp -d)
trap 'rm -rf "$scratch"' EXIT

fixture() {
	rm -rf "$scratch/root"
	mkdir -p "$scratch/root/.github/workflows"
	cp "$root/.node-version" "$root/Dockerfile" "$root/package.json" "$scratch/root/"
	cp "$root"/.github/workflows/*.yaml "$scratch/root/.github/workflows/"
}

must_refuse() {
	name=$1
	if NODE_TOOLCHAIN_LIVE=0 check_root "$scratch/root" >/dev/null; then
		fail "negative control passed: $name"
	fi
}

fixture
[ -z "$(NODE_TOOLCHAIN_LIVE=0 check_root "$scratch/root")" ] || fail "the untouched fixture copy was refused"

major=$(cat "$root/.node-version")
next=$((major + 1))

fixture
echo "$next" >"$scratch/root/.node-version"
must_refuse "version file moved alone"

fixture
sed "s/^FROM node:$major-alpine\$/FROM node:$next-alpine/" "$root/Dockerfile" >"$scratch/root/Dockerfile"
cmp -s "$root/Dockerfile" "$scratch/root/Dockerfile" && fail "the runtime-stage mutation changed nothing"
must_refuse "runtime image moved alone"

fixture
sed "s|^FROM node:$major-alpine AS build\$|FROM --platform=linux/amd64 docker.io/library/node:$next-alpine AS build|" "$root/Dockerfile" >"$scratch/root/Dockerfile"
cmp -s "$root/Dockerfile" "$scratch/root/Dockerfile" && fail "the build-stage mutation changed nothing"
must_refuse "flagged, registry-qualified build image moved alone"

fixture
jq '.engines.node = ">=22"' "$root/package.json" >"$scratch/root/package.json"
must_refuse "open engines lower bound"

fixture
jq 'del(.packageManager)' "$root/package.json" >"$scratch/root/package.json"
must_refuse "packageManager removed"

fixture
yq eval -i '(.jobs.lint.steps[] | select((.uses // "") | test("^actions/setup-node@")) | .with) = {"node-version": 22}' \
	"$scratch/root/.github/workflows/ci.yaml"
must_refuse "workflow with a literal Node version"

fixture
rm "$scratch/root/.github/workflows/ci.yaml"
must_refuse "no workflow sets up Node"

echo "PASS: one Node toolchain (Node $major) is declared and every consumer reads it"
