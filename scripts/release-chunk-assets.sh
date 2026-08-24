#!/usr/bin/env bash
# Delegates to installer.sh (canonical implementation).
set -euo pipefail
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
INSTALLER="${SCRIPT_DIR}/../installer.sh"
if [ ! -f "$INSTALLER" ]; then
  echo "ERROR: installer.sh not found at $INSTALLER" >&2
  exit 1
fi
exec bash "$INSTALLER" --release-chunk-assets "$@"
