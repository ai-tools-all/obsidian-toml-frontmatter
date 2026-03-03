#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/release.sh <version>
# Example: ./scripts/release.sh 0.3.0

# ── Helpers ────────────────────────────────────────────────────────────────────
die() {
  echo "❌ $*" >&2
  exit 1
}
info() { echo "→ $*"; }

# ── Validate args ──────────────────────────────────────────────────────────────
[[ $# -eq 1 ]] || die "Usage: $0 <version>  (e.g. $0 0.3.0)"
VERSION="$1"
[[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || die "Version must be semver: X.Y.Z (got: $VERSION)"

# ── Check required tools ───────────────────────────────────────────────────────
for tool in git jq gh git-cliff npm; do
  command -v "$tool" &>/dev/null || die "'$tool' is not installed or not in PATH"
done

# ── 1. Pre-flight: clean working tree ─────────────────────────────────────────
info "Checking working tree..."
if [[ -n "$(git status --porcelain)" ]]; then
  die "Commit or stash changes before releasing"
fi
info "Working tree is clean."

# ── 2. Bump version ────────────────────────────────────────────────────────────
info "Bumping version to $VERSION..."

MIN_APP_VERSION="$(jq -r '.minAppVersion' manifest.json)"

# manifest.json
jq --arg v "$VERSION" '.version = $v' manifest.json >manifest.json.tmp && mv manifest.json.tmp manifest.json

# package.json
jq --arg v "$VERSION" '.version = $v' package.json >package.json.tmp && mv package.json.tmp package.json

# versions.json
jq --arg v "$VERSION" --arg min "$MIN_APP_VERSION" '. + {($v): $min}' versions.json >versions.json.tmp && mv versions.json.tmp versions.json

info "Updated manifest.json, package.json, versions.json."

# ── 3. Generate changelog ──────────────────────────────────────────────────────
info "Generating CHANGELOG.md with git-cliff..."
git cliff --tag "$VERSION" -o CHANGELOG.md

# ── 4. Commit version bump ────────────────────────────────────────────────────
info "Committing version bump..."
git add manifest.json package.json versions.json CHANGELOG.md
git commit -m "chore(release): bump version to ${VERSION} and generate changelog"

# ── 5. Build release artifacts ────────────────────────────────────────────────
info "Building..."
npm run build

# ── 6. Tag and push ───────────────────────────────────────────────────────────
info "Tagging $VERSION and pushing..."
git tag "$VERSION"
git push origin main --tags

# ── 7. Create GitHub release ──────────────────────────────────────────────────
info "Creating GitHub release..."
gh release create "$VERSION" main.js manifest.json styles.css \
  --title "v${VERSION}" \
  --notes-file CHANGELOG.md

info "✅ Released v${VERSION}"
