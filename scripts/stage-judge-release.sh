#!/usr/bin/env bash
set -euo pipefail

readonly repo="${GITHUB_REPOSITORY:?Expected a GitHub Actions repository}"
readonly api="${GITHUB_API_URL:?Expected a GitHub Actions API URL}"
readonly run=46168741325
readonly artifact=15273076053
readonly source=73ab9be090b626e48f1ef7de533feb045f4211cd
readonly wrapper_digest=b5b1a50338f5b1b272be3110b4e1527909fe05359cdb6499bf733fd3b3c423d9
readonly tag=kiroween-2026-ci-73ab9be
readonly zip=wraith-kit-judge.zip

if [[ $# -gt 1 || ( $# -eq 1 && "$1" != --draft ) ]]; then
  echo "Usage: bash scripts/stage-judge-release.sh [--draft]" >&2
  exit 2
fi

# Pin the successful main run and the particular upload, including the digest
# of the Actions wrapper. The release asset is the archive inside that wrapper.
run_metadata=$(gh api "repos/$repo/actions/runs/$run" \
  --jq '[.head_sha, .head_branch, .event, .conclusion, .path] | @tsv')
[[ "$run_metadata" == "$source"$'\tmain\tpush\tsuccess\t.github/workflows/ci.yml' ]]
artifact_metadata=$(gh api "repos/$repo/actions/artifacts/$artifact" \
  --jq '[.name, .digest, .expired, .workflow_run.id, .workflow_run.head_sha] | @tsv')
[[ "$artifact_metadata" == "wraith-judge-build"$'\t'"sha256:$wrapper_digest"$'\tfalse\t'"$run"$'\t'"$source" ]]

work=$(mktemp -d)
trap 'rm -rf -- "$work"' EXIT
curl --fail --silent --show-error --location --retry 2 \
  -H "Authorization: Bearer ${GH_TOKEN:?Expected a GitHub Actions token}" \
  -H 'Accept: application/vnd.github+json' \
  "$api/repos/$repo/actions/artifacts/$artifact/zip" --output "$work/actions.zip"
printf '%s  %s\n' "$wrapper_digest" "$work/actions.zip" | sha256sum --check
[[ "$(unzip -Z1 "$work/actions.zip")" == "$zip" ]]
unzip -p "$work/actions.zip" "$zip" > "$work/$zip"
unzip -tq "$work/$zip"
( cd "$work" && sha256sum "$zip" > "$zip.sha256" )
cat "$work/$zip.sha256"

if [[ "${1:-}" != --draft ]]; then
  exit 0
fi

readonly run_url="${GITHUB_SERVER_URL:?Expected a GitHub Actions server URL}/$repo/actions/runs/$run"
cat > "$work/notes.md" <<EOF
This ZIP is the exact judge build from [GitHub Actions run $run]($run_url) for commit **$source**.

After extracting it, run the two commands in separate terminals with Node.js 22.13 or newer:

    node wraith.mjs todo-afterlife
    node wraith.mjs notice-ghoul

The [browser test log]($run_url/job/141052094436) records both packaged apps running in one Chromium session. The test approved a TODO rewrite, validated the patch, confirmed Notice Ghoul proposals, and validated the generated calendar. It also compared two independent ZIP builds.

Verify the downloaded ZIP alongside its checksum:

    sha256sum -c $zip.sha256
EOF

# Refuse an existing draft, release or tag rather than changing it.
existing_release=$(gh api --paginate "repos/$repo/releases?per_page=100" \
  --jq ".[] | select(.tag_name == \"$tag\") | .id")
existing_tag=$(gh api "repos/$repo/git/matching-refs/tags/$tag" \
  --jq ".[] | select(.ref == \"refs/tags/$tag\") | .ref")
if [[ -n "$existing_release" || -n "$existing_tag" ]]; then
  echo "Release or tag $tag already exists. Inspect it before retrying." >&2
  exit 1
fi
gh release create "$tag" "$work/$zip" "$work/$zip.sha256" \
  --repo "$repo" --target "$source" --draft --prerelease \
  --title 'Kiroween 2026 verified judge build' --notes-file "$work/notes.md"
