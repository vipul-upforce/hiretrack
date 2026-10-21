#!/usr/bin/env bash
# Hiretrack public demo server setup.
# Usage:
#   ./installer-demo.sh --init              # mark demo + sync env + seed DB
#   ./installer-demo.sh --init --force      # convert existing install to demo
#   ./installer-demo.sh --sync-env          # re-apply demo env vars after manual edits
set -euo pipefail

INSTALLER_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MAIN_INSTALLER="$INSTALLER_ROOT/installer.sh"
ENV_LIB="$INSTALLER_ROOT/scripts/installer-env.sh"

if [ ! -f "$MAIN_INSTALLER" ]; then
    echo "[ ERROR ] installer.sh not found next to installer-demo.sh"
    exit 1
fi

if [ ! -f "$ENV_LIB" ]; then
    echo "[ ERROR ] scripts/installer-env.sh not found"
    exit 1
fi

# shellcheck source=scripts/installer-env.sh
source "$ENV_LIB"

export CONFIG_PATH="${CONFIG_PATH:-$HOME/.hiretrack/config.json}"
export APP_INSTALL_DIR="${APP_INSTALL_DIR:-$HOME/.hiretrack/APP}"

write_config() {
    local KEY="$1"
    local VALUE="$2"
    jq --arg k "$KEY" --arg v "$VALUE" '.[$k]=$v' "$CONFIG_PATH" > "${CONFIG_PATH}.tmp" && mv "${CONFIG_PATH}.tmp" "$CONFIG_PATH"
}

ACTION="${1:---init}"
FORCE_FLAG=""
if [ "${2:-}" = "--force" ] || [ "${1:-}" = "--force" ]; then
    FORCE_FLAG="--force"
fi

case "$ACTION" in
    --init)
        demo_init "$FORCE_FLAG"
        ;;
    --sync-env)
        ensure_deployment_mode_env "$APP_INSTALL_DIR/.env"
        echo "[ OK ] Demo env sync complete."
        ;;
    --help|-h)
        echo "Usage:"
        echo "  $0 --init [--force]   Mark as demo, sync .env, seed database"
        echo "  $0 --sync-env         Re-apply demo env vars to .env"
        ;;
    *)
        echo "[ ERROR ] Unknown action: $ACTION"
        echo "Run $0 --help"
        exit 1
        ;;
esac
