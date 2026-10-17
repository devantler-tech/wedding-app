#!/usr/bin/env sh
#
# Updates to the packages that end up in the built server cut a release; tooling updates do not (#422).
#
# WHY: CD publishes the app only on a version tag, and semantic-release cuts one only for the commits
# .releaserc names. Runtime `dependencies` update as `build(deps)`, which releases. adapter-node
# bundles everything else the app imports (Svelte, SvelteKit, Vite's output, fonts, icons) into the
# server build, yet those are devDependencies, so their updates arrive as `build(deps-dev)`, which
# releases nothing by default. .releaserc releases a patch for a `build(deps-dev)` commit whose title
# names the `site-bundle` group in .github/dependabot.yml, so that group is the allow-list of bundled
# packages whose updates reach guests. This test keeps it complete: every devDependency is classified
# on purpose, as bundled (in the group) or as tooling (in the list below), and the app's own code
# imports only runtime dependencies and bundled packages. Nothing moves between `dependencies` and
# `devDependencies`, so what the production image installs is unchanged.
#
# CHECKS
#   1. dependabot.yml gives npm and Docker updates the `build` prefix and GitHub Actions updates the
#      `ci` prefix, each with its scope, so the commit types .releaserc matches are what arrive.
#   2. The npm entry declares the `site-bundle` group (version updates) and the `site-bundle-security`
#      group (security updates) with identical lists of exact package names, each a devDependency.
#   3. Every devDependency is in exactly one of: that group, or the tooling list below.
#   4. Every package the app's code imports (src/ without its test files, and vite.config.ts) is a
#      runtime dependency or in the group, except the config-only imports listed below.
#   5. .releaserc releases a patch for `build(deps)` commits, and for `build(deps-dev)` commits whose
#      subject names either group.
#   6. CI runs this test, with no if: or continue-on-error on its job or step, in a job whose result
#      CI - Required Checks reports.
#
# The real files must pass; then mutated copies prove each check rejects the drift it exists for,
# each for its own reason.

set -eu

script_dir=$(CDPATH='' cd -P -- "$(dirname -- "$0")" && pwd)
repo_root=$(dirname -- "$script_dir")
work=$(mktemp -d)
# An abort must not read as a pass: some shells report exit 0 from an EXIT trap after set -e fires.
completed=0
trap 'rm -rf "$work"; [ "$completed" -eq 1 ] || exit 1' EXIT

fail() {
	printf 'FAIL: %s\n' "$*" >&2
	exit 1
}

command -v yq >/dev/null 2>&1 || fail 'yq is required to read dependabot.yml and the workflows'
command -v jq >/dev/null 2>&1 || fail 'jq is required to read package.json and .releaserc'

# devDependencies that only lint, type-check, test, measure or migrate the app. Nothing they do
# reaches the server build. (`cookie` is bundled: SvelteKit's server runtime reads and sets the
# session cookie with it, so it is in the group.)
tooling='@axe-core/playwright @lhci/cli @playwright/test @types/node @types/pg drizzle-kit eslint
eslint-plugin-svelte svelte-check tsx typescript typescript-eslint vitest'

# Packages vite.config.ts may import without shipping: `defineConfig` from vitest/config only types
# the config object.
config_only='vitest'

group=site-bundle
security_group=site-bundle-security
# The subject glob .releaserc must use. `*(*/)` lets the leading wildcard cross the `/` in a scoped
# package name (`bump @sveltejs/kit from …`), which a plain `*` does not.
subject_glob="*(*/)* the $group?(-security) group?( *)"
test_command='sh scripts/release-classification.test.sh'

# package_of <import specifier>: prints the npm package an import names, or nothing for a relative
# path, a SvelteKit alias ($app, $env, $lib), a package.json subpath import (#lib), a Node built-in or
# a virtual module.
package_of() {
	case $1 in
	.* | /* | '$'* | '#'* | node:* | virtual:* | data:* | http:* | https:*) ;;
	@*/*) printf '%s\n' "$1" | cut -d/ -f1-2 ;;
	@*) fail "import '$1' names a scope without a package" ;;
	*) printf '%s\n' "$1" | cut -d/ -f1 ;;
	esac
}

# imports_of <file>...: the import specifiers in JS, TS, Svelte and CSS sources, one per line.
imports_of() {
	grep -hoE "(^|[^[:alnum:]_\$.])(from|import|@import|@plugin)[[:space:]]*\(?[[:space:]]*['\"][^'\"]+['\"]" "$@" |
		sed -E "s/.*['\"]([^'\"]+)['\"]\$/\1/" || true
}

# validate <root>: exits non-zero on the first violation in the tree at <root>.
validate() {
	root=$1
	dependabot=$root/.github/dependabot.yml
	ci=$root/.github/workflows/ci.yaml

	# 1. Commit prefixes.
	for spec in npm:build:build docker:build:build github-actions:ci:ci; do
		ecosystem=${spec%%:*}
		want=${spec#*:}
		want=${want%%:*}
		got=$(ECO=$ecosystem yq -r '[.updates[] | select(."package-ecosystem" == strenv(ECO))] |
		  (.[0]."commit-message".prefix // "-") + " " + (.[0]."commit-message".include // "-") + " " + (length | tostring)' \
			"$dependabot") || fail 'cannot parse dependabot.yml'
		[ "$got" = "$want scope 1" ] ||
			fail "dependabot.yml must give $ecosystem updates commit-message prefix '$want' with include: scope in one entry (got: $got)"
	done
	npm_dev_prefix=$(yq -r '.updates[] | select(."package-ecosystem" == "npm") | ."commit-message"."prefix-development" // "-"' \
		"$dependabot")
	[ "$npm_dev_prefix" = - ] ||
		fail "dependabot.yml sets prefix-development '$npm_dev_prefix' for npm, so devDependency updates would not arrive as build(deps-dev)"

	# 2. The groups.
	shipped=$(GROUP=$group yq -r '.updates[] | select(."package-ecosystem" == "npm") | .groups[strenv(GROUP)].patterns[]?' \
		"$dependabot")
	[ -n "$shipped" ] || fail "dependabot.yml's npm entry declares no '$group' group patterns"
	applies=$(GROUP=$group yq -r '.updates[] | select(."package-ecosystem" == "npm") | .groups[strenv(GROUP)]."applies-to" // "version-updates"' \
		"$dependabot")
	[ "$applies" = version-updates ] || fail "the '$group' group applies to '$applies', not version updates"
	security=$(GROUP=$security_group yq -r '.updates[] | select(."package-ecosystem" == "npm") | .groups[strenv(GROUP)].patterns[]?' \
		"$dependabot")
	applies=$(GROUP=$security_group yq -r '.updates[] | select(."package-ecosystem" == "npm") | .groups[strenv(GROUP)]."applies-to" // "-"' \
		"$dependabot")
	[ "$applies" = security-updates ] || fail "the '$security_group' group must apply to security updates (got '$applies')"
	[ "$(printf '%s\n' "$shipped" | sort)" = "$(printf '%s\n' "$security" | sort)" ] ||
		fail "the '$group' and '$security_group' groups must list the same packages"

	runtime=$(jq -r '.dependencies // {} | keys[]' "$root/package.json") || fail 'cannot parse package.json'
	declared=$(jq -r '.devDependencies // {} | keys[]' "$root/package.json") || fail 'cannot parse package.json'
	for pkg in $shipped; do
		case $pkg in
		*'*'* | *'?'* | *'['*) fail "the '$group' group pattern '$pkg' is a wildcard; list exact package names" ;;
		esac
		if printf '%s\n' "$runtime" | grep -qxF -- "$pkg"; then
			fail "the '$group' group lists '$pkg', a runtime dependency whose updates already release as build(deps)"
		fi
		printf '%s\n' "$declared" | grep -qxF -- "$pkg" ||
			fail "the '$group' group lists '$pkg', which package.json does not declare as a devDependency"
	done

	# 3. Every devDependency is classified exactly once.
	for pkg in $tooling; do
		printf '%s\n' "$declared" | grep -qxF -- "$pkg" ||
			fail "the tooling list names '$pkg', which package.json does not declare as a devDependency"
	done
	for pkg in $declared; do
		in_group=0
		in_tooling=0
		printf '%s\n' "$shipped" | grep -qxF -- "$pkg" && in_group=1
		printf '%s\n' "$tooling" | tr ' ' '\n' | grep -qxF -- "$pkg" && in_tooling=1
		case $in_group$in_tooling in
		10 | 01) ;;
		11) fail "'$pkg' is both in the '$group' group and in the tooling list" ;;
		*) fail "classify '$pkg': add it to the '$group' groups in dependabot.yml if its code ends up in the server build, or to the tooling list in $test_command if it does not" ;;
		esac
	done

	# 4. The app's code imports only runtime dependencies and bundled packages.
	sources=$(cd "$root" && find src -type f \( -name '*.svelte' -o -name '*.ts' -o -name '*.js' -o -name '*.css' \) \
		! -name '*.test.*' ! -name '*.spec.*' | sort)
	[ -n "$sources" ] || fail 'found no source files under src/'
	site_imports=$(cd "$root" && for f in $sources; do imports_of "$f"; done | sort -u)
	config_imports=$(cd "$root" && imports_of vite.config.ts | sort -u)
	seen=' '
	for origin in site config; do
		if [ "$origin" = site ]; then specs=$site_imports; else specs=$config_imports; fi
		for spec in $specs; do
			pkg=$(package_of "$spec")
			[ -n "$pkg" ] || continue
			seen="$seen$pkg "
			printf '%s\n' "$shipped" | grep -qxF -- "$pkg" && continue
			printf '%s\n' "$runtime" | grep -qxF -- "$pkg" && continue
			printf '%s\n' "$declared" | grep -qxF -- "$pkg" ||
				fail "the app imports '$spec', but package.json does not declare '$pkg'"
			if [ "$origin" = config ] && printf '%s\n' "$config_only" | tr ' ' '\n' | grep -qxF -- "$pkg"; then
				continue
			fi
			fail "the app imports '$spec', so '$pkg' is bundled into the server build, but it is not in the '$group' group"
		done
	done
	# An extraction that finds nothing would pass every import; these are imported today.
	for known in @sveltejs/kit tailwindcss drizzle-orm; do
		case $seen in
		*" $known "*) ;;
		*) fail "the import scan did not find '$known', so it cannot be trusted" ;;
		esac
	done

	# 5. The release rules.
	rules=$(jq -c '[.plugins[] | select(type == "array" and .[0] == "@semantic-release/commit-analyzer") | .[1].releaseRules[]?]' \
		"$root/.releaserc") || fail 'cannot parse .releaserc'
	printf '%s\n' "$rules" | jq -e 'any(.[]; . == {"type": "build", "scope": "deps", "release": "patch"})' >/dev/null ||
		fail '.releaserc does not release a patch for build(deps) commits (Docker base-image updates)'
	printf '%s\n' "$rules" | GLOB=$subject_glob jq -e \
		'any(.[]; . == {"type": "build", "scope": "deps-dev", "subject": env.GLOB, "release": "patch"})' >/dev/null ||
		fail ".releaserc does not release a patch for build(deps-dev) commits whose subject matches '$subject_glob'"

	# 6. CI runs this test where a failure blocks a merge.
	gate_job=$(TEST_COMMAND=$test_command yq -r '
	  [.jobs // {} | to_entries | .[] | select([.value.steps[]? | select(.run == strenv(TEST_COMMAND))] | length > 0) | .key] | .[0] // ""
	' "$ci") || fail 'cannot parse ci.yaml'
	[ -n "$gate_job" ] || fail "ci.yaml has no job that runs '$test_command'"
	# shellcheck disable=SC2016 # $j and $s are yq variables, not shell expansions.
	flags=$(GATE_JOB=$gate_job TEST_COMMAND=$test_command yq -r '
	  .jobs[strenv(GATE_JOB)] as $j | [$j.steps[] | select(.run == strenv(TEST_COMMAND))][0] as $s |
	  [($j | has("if")), (($j."continue-on-error" // false) != false), ($s | has("if")), (($s."continue-on-error" // false) != false)] | join(" ")
	' "$ci") || fail 'cannot parse ci.yaml'
	[ "$flags" = 'false false false false' ] ||
		fail "ci.yaml job '$gate_job' or its '$test_command' step sets if: or continue-on-error, so a failure may not block a merge"
	GATE_JOB=$gate_job yq -e '.jobs."ci-required-checks".needs | any_c(. == strenv(GATE_JOB))' "$ci" >/dev/null 2>&1 ||
		fail "ci.yaml job '$gate_job' is not a dependency of CI - Required Checks"
	GATE_JOB=$gate_job yq -e '
	  [.jobs."ci-required-checks".steps[]? | .with."job-results" // "" | select(test("needs\\." + strenv(GATE_JOB) + "\\.result"))] | length > 0
	' "$ci" >/dev/null 2>&1 ||
		fail "CI - Required Checks does not report the result of ci.yaml job '$gate_job'"
}

validate "$repo_root"

mutations_run=0

# reset_fixture: a fresh copy of every file validate reads.
reset_fixture() {
	rm -rf "$work/fixture"
	mkdir -p "$work/fixture/.github/workflows"
	cp "$repo_root/package.json" "$repo_root/.releaserc" "$repo_root/vite.config.ts" "$work/fixture/"
	cp "$repo_root/.github/dependabot.yml" "$work/fixture/.github/"
	cp "$repo_root/.github/workflows/ci.yaml" "$work/fixture/.github/workflows/"
	cp -R "$repo_root/src" "$work/fixture/"
}

# mutate <file relative to the fixture> <yq|jq> <expression>: edit one fixture file in place.
mutate() {
	"$2" "$3" "$work/fixture/$1" >"$work/mutant"
	mv "$work/mutant" "$work/fixture/$1"
}

expect_accepted() {
	mutations_run=$((mutations_run + 1))
	rejection=$( (validate "$work/fixture") 2>&1 >/dev/null) || fail "valid variant rejected: $1: $rejection"
}

expect_rejected() {
	mutations_run=$((mutations_run + 1))
	if rejection=$( (validate "$work/fixture") 2>&1 >/dev/null); then
		fail "mutation passed: $1"
	fi
	printf '%s\n' "$rejection" | grep -qF -- "$2" ||
		fail "mutation rejected for the wrong reason: $1; expected '$2', got: $rejection"
}

# add_to_groups <package>: add one pattern to both groups in the fixture's dependabot.yml.
add_to_groups() {
	PKG=$1 yq '
	  (.updates[] | select(."package-ecosystem" == "npm") | .groups."site-bundle".patterns) += [strenv(PKG)] |
	  (.updates[] | select(."package-ecosystem" == "npm") | .groups."site-bundle-security".patterns) += [strenv(PKG)]
	' "$work/fixture/.github/dependabot.yml" >"$work/mutant"
	mv "$work/mutant" "$work/fixture/.github/dependabot.yml"
}

reset_fixture
mutate package.json jq '.devDependencies."lucide-svelte" = "^1.0.0"'
add_to_groups lucide-svelte
printf '<script>\n\timport { Leaf } from "lucide-svelte/icons";\n</script>\n' >"$work/fixture/src/lib/components/NewIcon.svelte"
expect_accepted 'a new shipped package, classified in both groups and imported by a scoped subpath'

reset_fixture
mutate .github/dependabot.yml yq '(.updates[] | select(."package-ecosystem" == "npm") | ."commit-message".prefix) = "chore"'
expect_rejected 'npm updates back on the chore prefix' "must give npm updates commit-message prefix 'build'"

reset_fixture
mutate .github/dependabot.yml yq 'del(.updates[] | select(."package-ecosystem" == "docker") | ."commit-message")'
expect_rejected 'Docker updates without the build prefix' "must give docker updates commit-message prefix 'build'"

reset_fixture
mutate .github/dependabot.yml yq '(.updates[] | select(."package-ecosystem" == "github-actions") | ."commit-message".prefix) = "build"'
expect_rejected 'workflow updates on a releasing prefix' "must give github-actions updates commit-message prefix 'ci'"

reset_fixture
mutate .github/dependabot.yml yq '(.updates[] | select(."package-ecosystem" == "npm") | ."commit-message".include) = "none"'
expect_rejected 'npm updates without a scope' "must give npm updates commit-message prefix 'build' with include: scope"

reset_fixture
mutate .github/dependabot.yml yq '(.updates[] | select(."package-ecosystem" == "npm") | ."commit-message"."prefix-development") = "chore"'
expect_rejected 'devDependency updates on another prefix' "sets prefix-development 'chore' for npm"

reset_fixture
mutate .github/dependabot.yml yq 'del(.updates[] | select(."package-ecosystem" == "npm") | .groups."site-bundle")'
expect_rejected 'no shipped group' "declares no 'site-bundle' group patterns"

reset_fixture
mutate .github/dependabot.yml yq '(.updates[] | select(."package-ecosystem" == "npm") | .groups."site-bundle-security"."applies-to") = "version-updates"'
expect_rejected 'the security group no longer covers security updates' "'site-bundle-security' group must apply to security updates"

reset_fixture
mutate .github/dependabot.yml yq '(.updates[] | select(."package-ecosystem" == "npm") | .groups."site-bundle-security".patterns) |= .[1:]'
expect_rejected 'the two groups drift apart' "groups must list the same packages"

reset_fixture
add_to_groups '@sveltejs/*'
expect_rejected 'a wildcard pattern' "pattern '@sveltejs/*' is a wildcard"

reset_fixture
add_to_groups left-pad
expect_rejected 'a group entry for a package that is not installed' "lists 'left-pad', which package.json does not declare"

reset_fixture
add_to_groups pg
expect_rejected 'a runtime dependency in the group' "lists 'pg', a runtime dependency"

reset_fixture
mutate package.json jq '.devDependencies."lucide-svelte" = "^1.0.0"'
expect_rejected 'a new package nobody classified' "classify 'lucide-svelte'"

reset_fixture
mutate package.json jq 'del(.devDependencies.tsx)'
expect_rejected 'a tooling entry for a removed package' "tooling list names 'tsx', which package.json does not declare"

reset_fixture
add_to_groups eslint
expect_rejected 'a package classified twice' "'eslint' is both in the 'site-bundle' group and in the tooling list"

reset_fixture
printf "import { defineConfig } from 'drizzle-kit';\n" >"$work/fixture/src/lib/server/uses-tooling.ts"
expect_rejected 'app code importing a tooling package' "the app imports 'drizzle-kit', so 'drizzle-kit' is bundled"

reset_fixture
printf "import { x } from 'not-installed/sub';\n" >"$work/fixture/src/lib/new-module.ts"
expect_rejected 'app code importing an undeclared package' "package.json does not declare 'not-installed'"

reset_fixture
printf "import { defineConfig } from 'vitest/config';\n" >"$work/fixture/src/lib/config-only-elsewhere.ts"
expect_rejected 'a config-only package imported by the app itself' "the app imports 'vitest/config', so 'vitest' is bundled"

reset_fixture
printf "import { beforeAll } from 'vitest';\n" >"$work/fixture/src/lib/helper.test.ts"
printf "import { sql } from 'drizzle-orm';\n" >"$work/fixture/src/lib/server/runtime.ts"
expect_accepted 'a test file importing tooling, and app code importing a runtime dependency'

reset_fixture
rm -rf "$work/fixture/src"
mkdir -p "$work/fixture/src"
printf 'export const a = 1;\n' >"$work/fixture/src/a.ts"
expect_rejected 'an import scan that finds nothing' "the import scan did not find 'tailwindcss'"

reset_fixture
mutate .releaserc jq '(.plugins[] | select(type == "array" and .[0] == "@semantic-release/commit-analyzer") | .[1].releaseRules) |= map(select(.scope != "deps"))'
expect_rejected 'base-image updates no longer release' 'does not release a patch for build(deps) commits'

reset_fixture
mutate .releaserc jq '(.plugins[] | select(type == "array" and .[0] == "@semantic-release/commit-analyzer") | .[1].releaseRules) |= map(select(.scope != "deps-dev"))'
expect_rejected 'shipped-package updates no longer release' 'does not release a patch for build(deps-dev) commits'

reset_fixture
mutate .releaserc jq '(.plugins[] | select(type == "array" and .[0] == "@semantic-release/commit-analyzer") | .[1].releaseRules[] | select(.scope == "deps-dev") | .subject) = "*"'
expect_rejected 'every devDependency update releases' 'does not release a patch for build(deps-dev) commits'

reset_fixture
mutate .github/workflows/ci.yaml yq "del(.jobs[].steps[]? | select(.run == \"$test_command\"))"
expect_rejected 'CI no longer runs this test' "ci.yaml has no job that runs '$test_command'"

GATE_JOB=$(TEST_COMMAND=$test_command yq -r '
  [.jobs | to_entries | .[] | select([.value.steps[]? | select(.run == strenv(TEST_COMMAND))] | length > 0) | .key] | .[0]
' "$repo_root/.github/workflows/ci.yaml")
export GATE_JOB TEST_COMMAND="$test_command"

reset_fixture
mutate .github/workflows/ci.yaml yq '.jobs[strenv(GATE_JOB)]."continue-on-error" = true'
expect_rejected 'the test job ignores a failure' 'sets if: or continue-on-error'

reset_fixture
mutate .github/workflows/ci.yaml yq '(.jobs[strenv(GATE_JOB)].steps[] | select(.run == strenv(TEST_COMMAND)) | .if) = "false"'
expect_rejected 'the test step may be skipped' 'sets if: or continue-on-error'

reset_fixture
mutate .github/workflows/ci.yaml yq 'del(.jobs."ci-required-checks".needs[] | select(. == strenv(GATE_JOB)))'
expect_rejected 'the test no longer blocks a merge' "is not a dependency of CI - Required Checks"

reset_fixture
mutate .github/workflows/ci.yaml yq '(.jobs."ci-required-checks".steps[] | select(.with."job-results" != null) | .with."job-results") |=
  sub("needs." + strenv(GATE_JOB) + ".result"; "needs." + strenv(GATE_JOB) + ".outcome")'
expect_rejected 'its result no longer reported' "does not report the result of ci.yaml job '$GATE_JOB'"

completed=1
printf 'PASS: release classification (happy path + %s fixture cases)\n' "$mutations_run"
