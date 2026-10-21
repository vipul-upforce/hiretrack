#!/usr/bin/env bash
# Demo deployment env sync — sourced by installer.sh (not run directly).
# Requires: CONFIG_PATH, APP_INSTALL_DIR, write_config (from installer.sh).

set_env_var() {
    local ENV_FILE="$1"
    local KEY="$2"
    local VALUE="$3"
    mkdir -p "$(dirname "$ENV_FILE")"
    touch "$ENV_FILE"
    grep -v "^${KEY}=" "$ENV_FILE" > "${ENV_FILE}.tmp" 2>/dev/null || cp "$ENV_FILE" "${ENV_FILE}.tmp"
    printf '%s=%s\n' "$KEY" "$VALUE" >> "${ENV_FILE}.tmp"
    mv "${ENV_FILE}.tmp" "$ENV_FILE"
}

remove_env_var() {
    local ENV_FILE="$1"
    local KEY="$2"
    if [ ! -f "$ENV_FILE" ]; then
        return 0
    fi
    grep -v "^${KEY}=" "$ENV_FILE" > "${ENV_FILE}.tmp" 2>/dev/null || return 0
    mv "${ENV_FILE}.tmp" "$ENV_FILE"
}

is_demo_deployment() {
    if [ ! -f "${CONFIG_PATH:-}" ]; then
        return 1
    fi
    local deployment_type
    deployment_type=$(jq -r '.deploymentType // "production"' "$CONFIG_PATH" 2>/dev/null || echo "production")
    [ "$deployment_type" = "demo" ]
}

ensure_deployment_mode_env() {
    local ENV_FILE="${1:-$APP_INSTALL_DIR/.env}"
    if is_demo_deployment; then
        set_env_var "$ENV_FILE" "HIRETRACK_DEMO_MODE" "true"
        echo "[ OK ] Demo mode env vars set in $ENV_FILE"
    else
        remove_env_var "$ENV_FILE" "HIRETRACK_DEMO_MODE"
        remove_env_var "$ENV_FILE" "NEXT_PUBLIC_HIRETRACK_DEMO_MODE"
    fi
}

mark_demo_deployment() {
    if [ ! -f "${CONFIG_PATH:-}" ]; then
        mkdir -p "$(dirname "$CONFIG_PATH")"
        echo '{"autoUpdate": true, "installedVersion": "none", "channel": "production"}' > "$CONFIG_PATH"
    fi
    write_config "deploymentType" "demo"
    write_config "demoInitializedAt" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "[ OK ] Marked deployment as demo in $CONFIG_PATH"
}

run_demo_seed() {
    local SEED_SCRIPT=""
    local lib_dir
    lib_dir="$(cd "$(dirname "${BASH_SOURCE[0]:-.}")" && pwd)"
    for candidate in \
        "$HOME/.hiretrack/demo-seed/seed-server.cjs" \
        "$lib_dir/demo-seed/seed-server.cjs" \
        "$lib_dir/../scripts/demo-seed/seed-server.cjs"; do
        if [ -f "$candidate" ]; then
            SEED_SCRIPT="$candidate"
            break
        fi
    done

    if [ -z "$SEED_SCRIPT" ]; then
        echo "[ WARNING ] demo-seed/seed-server.cjs not found. Skipping database seed."
        return 0
    fi

    local APP_DIR="${APP_INSTALL_DIR:-$HOME/.hiretrack/APP}"
    if [ ! -d "$APP_DIR" ]; then
        echo "[ ERROR ] App directory not found: $APP_DIR"
        return 1
    fi

    echo "[ START ] Running demo database seed..."
    (
        cd "$APP_DIR" || exit 1
        export NODE_PATH="$APP_DIR/node_modules"
        node "$SEED_SCRIPT" --force
    )
}

demo_init() {
    local FORCE="${1:-}"
    if [ ! -f "${CONFIG_PATH:-}" ]; then
        echo "[ ERROR ] config.json not found. Run a normal install first."
        return 1
    fi

    local current_type
    current_type=$(jq -r '.deploymentType // "production"' "$CONFIG_PATH" 2>/dev/null || echo "production")
    local installed
    installed=$(jq -r '.installedVersion // "none"' "$CONFIG_PATH" 2>/dev/null || echo "none")

    if [ "$current_type" != "demo" ] && [ "$installed" != "none" ] && [ "$FORCE" != "--force" ]; then
        echo "[ ERROR ] This host is already a production deployment."
        echo "          Re-run with --force only if you intend to convert it to a demo server."
        return 1
    fi

    mark_demo_deployment
    ensure_deployment_mode_env "$APP_INSTALL_DIR/.env"
    run_demo_seed || return 1

    if command -v pm2 >/dev/null 2>&1 && [ -d "$APP_INSTALL_DIR" ]; then
        echo "[ START ] Restarting app after demo init..."
        pm2 restart all --update-env 2>/dev/null || true
    fi

    echo "[ DONE ] Demo initialization complete."
    if [ -f "$HOME/.hiretrack/demo-seed-credentials.json" ]; then
        echo "[ INFO ] Demo credentials: $HOME/.hiretrack/demo-seed-credentials.json"
    fi
}
