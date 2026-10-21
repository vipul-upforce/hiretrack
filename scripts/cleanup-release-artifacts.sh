#!/usr/bin/env bash
# Remove local hiretrack release tarballs, chunk parts, and manifests after GitHub upload.
# Usage: cleanup-release-artifacts.sh [repo_root] [optional_tarball_basename]
set -euo pipefail

ROOT="${1:-.}"
OPTIONAL_TARBALL="${2:-}"
cd "$ROOT"

removed=0
remove_path() {
  local f="$1"
  [ -e "$f" ] || return 0
  rm -f "$f"
  echo "  removed: $f"
  removed=$((removed + 1))
}

echo "[ CLEAN ] Removing local release artifacts..."

if [ -n "$OPTIONAL_TARBALL" ]; then
  remove_path "$OPTIONAL_TARBALL"
  remove_path "${OPTIONAL_TARBALL}.manifest.json"
  for part in "${OPTIONAL_TARBALL}.part-"*; do
    remove_path "$part"
  done
fi

shopt -s nullglob
for f in hiretrack-v*.tar.gz hiretrack-v*.tar.gz.manifest.json hiretrack-v*.tar.gz.part-* temp/hiretrack-v*.tar.gz; do
  remove_path "$f"
done
shopt -u nullglob

if [ "$removed" -eq 0 ]; then
  echo "[ OK ] No release artifacts to clean."
else
  echo "[ OK ] Cleaned ${removed} release artifact(s)."
fi
