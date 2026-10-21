#!/bin/bash
set -euo pipefail

# ------------------------------------------------
# UI & Logging Toolkit
# ------------------------------------------------
RESET='\033[0m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'

log_info() { echo -e "${BLUE}[ INFO ]${RESET} $1"; }
log_success() { echo -e "${GREEN}[ OK ]${RESET} $1"; }
log_error() { echo -e "${RED}[ ERROR ]${RESET} $1"; }

# Logs to a file with a precise timestamp
file_log() {
    local file="$1"
    local msg="$2"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $msg" >> "$file"
}

# Loading Spinner
start_spinner() {
    local msg="$1"
    # Animated \r spinners become one line per frame in PM2/log files/CI. Use a single
    # static line unless we are clearly on an interactive terminal.
    if [ "${INSTALLER_SPINNER_MODE:-}" = "quiet" ] \
        || [ ! -t 1 ] \
        || [ -n "${CI:-}" ] \
        || [ "${TERM:-}" = "dumb" ]; then
        SPINNER_PID=""
        echo -e "${BLUE}[ .. ]${RESET} $msg"
        return 0
    fi

    echo -ne "${BLUE}[ .. ]${RESET} $msg"
    while :; do
        for s in / - \\ \|; do
            echo -ne "\r${BLUE}[ $s ]${RESET} $msg"
            sleep 0.1
        done
    done &
    SPINNER_PID=$!
}

stop_spinner() {
    local result="$1" # "success" or "error"
    local msg="$2"
    if [ -z "${SPINNER_PID:-}" ]; then
        if [ "$result" = "success" ]; then
            log_success "$msg"
        else
            log_error "$msg"
        fi
        return 0
    fi

    kill $SPINNER_PID >/dev/null 2>&1 || true
    wait $SPINNER_PID 2>/dev/null || true
    echo -ne "\r\033[K" # Clear line
    if [ "$result" = "success" ]; then
        log_success "$msg"
    else
        log_error "$msg"
    fi
}

# Global variable to safely store the timezone outside of subshells
SELECTED_TZ=""

prompt_for_timezone() {
    local TZ_LIST
    if command -v timedatectl >/dev/null 2>&1; then
        TZ_LIST=$(timedatectl list-timezones)
    else
        TZ_LIST=$(find /usr/share/zoneinfo -type f | sed 's|/usr/share/zoneinfo/||' | grep '/' | sort)
    fi

    local FZF_CMD="fzf"
    local TEMP_DIR=""

    # 1. If fzf is missing, download a temporary standalone binary
    if ! command -v fzf >/dev/null 2>&1; then
        echo -e "\033[34m[ INFO ]\033[0m Preparing interactive timezone selector..." >&2
        TEMP_DIR=$(mktemp -d)
        local OS_TYPE=$(uname -s | tr '[:upper:]' '[:lower:]')
        local ARCH_TYPE=$(uname -m)
        
        # Map architecture to fzf release names
        if [ "$ARCH_TYPE" = "x86_64" ]; then ARCH_TYPE="amd64"; fi
        if [ "$ARCH_TYPE" = "aarch64" ]; then ARCH_TYPE="arm64"; fi
        
        # FIX: Point exactly to the 0.46.1 release tag, not 'latest'
        local FZF_URL="https://github.com/junegunn/fzf/releases/download/0.46.1/fzf-0.46.1-${OS_TYPE}_${ARCH_TYPE}.tar.gz"
        
        # Silently download and extract just the binary
        if curl -sfL "$FZF_URL" | tar -xz -C "$TEMP_DIR" fzf 2>/dev/null; then
            FZF_CMD="$TEMP_DIR/fzf"
        else
            # Download failed, clear it to trigger the fallback
            rm -rf "$TEMP_DIR"
            TEMP_DIR=""
            FZF_CMD=""
        fi
    fi

    # 2. Trigger the real-time interactive dropdown (if fzf is available)
    if [ -n "$FZF_CMD" ] && { command -v "$FZF_CMD" >/dev/null 2>&1 || [ -x "$FZF_CMD" ]; }; then
        # FIX: Removed </dev/tty from the end of this command so the pipe works!
        SELECTED_TZ=$(echo "$TZ_LIST" | "$FZF_CMD" \
            --prompt="Search Timezone (e.g. Asia/Kolkata): " \
            --height=40% \
            --reverse \
            --border)
        
        # Clean up the temp binary if we downloaded it
        if [ -n "$TEMP_DIR" ]; then
            rm -rf "$TEMP_DIR"
        fi

        # If they selected something, return success. If they hit ESC, return error.
        if [ -n "$SELECTED_TZ" ]; then
            return 0
        else
            return 1
        fi
    fi

    # 3. Fallback manual search (Only triggers if fzf download failed)
    while true; do
        echo ""
        local query
        read -p "Search timezone (e.g. Asi, Euro, Amer): " query </dev/tty
        
        # Exact match check
        if echo "$TZ_LIST" | grep -ixq "$query"; then
            SELECTED_TZ=$(echo "$TZ_LIST" | grep -ix "$query")
            return 0
        fi

        local matches
        matches=$(echo "$TZ_LIST" | grep -i "^$query")

        if [ -z "$matches" ]; then
            echo "[ ERROR ] No matching timezones found. Try again."
            continue
        fi

        # If exactly 1 match, auto-select it
        local count=$(echo "$matches" | wc -l)
        if [ "$count" -eq 1 ]; then
            SELECTED_TZ="$matches"
            return 0
        fi

        echo ""
        echo "Select a timezone:"
        
        # Make IFS a newline so 'select' splits the matching list correctly
        local OLD_IFS="$IFS"
        IFS=$'\n'
        PS3="Enter number: "
        
        select tz in $matches; do
            if [ -n "$tz" ]; then
                SELECTED_TZ="$tz"
                IFS="$OLD_IFS" # Restore IFS
                return 0
            else
                echo "[ ERROR ] Invalid selection. Try again."
            fi
        done </dev/tty
    done
}

# ================================================

# ------------------------------------------------
# Constants and Environment Variables
# ------------------------------------------------
APP_INSTALL_DIR="$HOME/.hiretrack/APP"
BACKUP_DIR="$HOME/.hiretrack/backup"
TMP_INSTALL_DIR="$HOME/.hiretrack/tmp_install"
CONFIG_PATH="$HOME/.hiretrack/config.json"
SCRIPT_PATH="$HOME/.hiretrack/installer.sh"
SNAPSHOT_SCRIPT="$HOME/.hiretrack/take-snapshot.js"
LOG_DIR="$HOME/.hiretrack/logs"
CRON_LOG_FILE="$LOG_DIR/cron_update.log"
SNAPSHOT_LOG_FILE="$LOG_DIR/snapshot.log"
REMINDERS_CRON_LOG="$LOG_DIR/reminders_cron.log"
REMINDERS_CRON_SCRIPT="$HOME/.hiretrack/reminders-cron.sh"
MANUAL_LOG_FILE="$LOG_DIR/manual_update.log"
ROLLBACK_LOG_FILE="$LOG_DIR/rollback.log"

# Local PDF → Markdown service (pymupdf4llm); used by bulk CV parsing (DOCLING_PARSE_URL).
MARKDOWN_PARSER_DIR="$HOME/.hiretrack/markdown-parser"
MARKDOWN_PARSER_PORT="${MARKDOWN_PARSER_PORT:-8000}"
MARKDOWN_PARSER_PM2_NAME="markdown-parser"
MARKDOWN_PARSER_URL="http://127.0.0.1:${MARKDOWN_PARSER_PORT}/parse"
SKIP_MARKDOWN_PARSER="${SKIP_MARKDOWN_PARSER:-0}"

# GitHub Releases host install tarballs. Optional GITHUB_RELEASE_REPO=owner/name
# (or config.json githubReleaseRepo) only if you fork. Optional GITHUB_TOKEN
# for private repos.
GITHUB_API_BASE="https://api.github.com"
DEFAULT_GITHUB_RELEASE_REPO="vipul-upforce/hiretrack"
# Default part size (bytes) when manifest omits partSizeBytes; must match CI split (50MB).
ASSET_CHUNK_PART_BYTES="${ASSET_CHUNK_PART_BYTES:-52428800}"
MONGODB_VERSION="${MONGODB_VERSION:-7.0}"
# NODE_VERSION_DEFAULT=20

# Channel: production (default), beta, or staging. Set by init_channel_mode().
CHANNEL="${CHANNEL:-production}"

# Helper function to append channel query param (BETA=true or STAGING=true) when not production
append_channel_param() {
    local url="$1"
    local ch="${CHANNEL:-production}"
    if [ "$ch" = "beta" ]; then
        if [[ "$url" == *"?"* ]]; then
            echo "${url}&BETA=true"
        else
            echo "${url}?BETA=true"
        fi
    elif [ "$ch" = "staging" ]; then
        if [[ "$url" == *"?"* ]]; then
            echo "${url}&STAGING=true"
        else
            echo "${url}?STAGING=true"
        fi
    else
        echo "$url"
    fi
}

resolve_github_release_repo() {
    local from_cfg=""
    if [ -n "${GITHUB_RELEASE_REPO:-}" ]; then
        echo "$GITHUB_RELEASE_REPO"
        return 0
    fi
    if [ -f "$CONFIG_PATH" ]; then
        from_cfg=$(jq -r '.githubReleaseRepo // empty' "$CONFIG_PATH" 2>/dev/null || echo "")
        if [ -n "$from_cfg" ] && [ "$from_cfg" != "null" ]; then
            echo "$from_cfg"
            return 0
        fi
    fi
    echo "$DEFAULT_GITHUB_RELEASE_REPO"
}

persist_github_release_repo() {
    local repo
    repo=$(resolve_github_release_repo) || return 1
    if [ ! -f "$CONFIG_PATH" ]; then
        mkdir -p "$(dirname "$CONFIG_PATH")"
        echo '{"autoUpdate": true, "installedVersion": "none", "channel": "production"}' > "$CONFIG_PATH"
    fi
    write_config "githubReleaseRepo" "$repo"
}

normalize_release_tag() {
    local raw="${1:-}"
    raw=$(echo "$raw" | tr -d '[:space:]')
    raw="${raw#v}"
    if [ -z "$raw" ] || [ "$raw" = "none" ]; then
        echo ""
        return 0
    fi
    echo "v${raw}"
}

github_api_get() {
    local url="$1"
    if [ -n "${GITHUB_TOKEN:-}" ]; then
        curl -sS -H "Accept: application/vnd.github+json" -H "Authorization: Bearer ${GITHUB_TOKEN}" "$url"
    else
        curl -sS -H "Accept: application/vnd.github+json" "$url"
    fi
}

# Prints GitHub release JSON for a tag (vX.Y.Z) or the latest release for CHANNEL.
fetch_github_release_json() {
    local repo
    repo=$(resolve_github_release_repo) || return 1
    local tag="${1:-}"
    local json=""
    if [ -n "$tag" ] && [ "$tag" != "latest" ]; then
        tag=$(normalize_release_tag "$tag")
        json=$(github_api_get "${GITHUB_API_BASE}/repos/${repo}/releases/tags/${tag}")
    else
        local ch="${CHANNEL:-production}"
        if [ "$ch" = "beta" ] || [ "$ch" = "staging" ]; then
            json=$(github_api_get "${GITHUB_API_BASE}/repos/${repo}/releases?per_page=30")
            json=$(echo "$json" | jq 'if type=="array" then ([.[] | select(.draft==false and .prerelease==true)][0] // [.[] | select(.draft==false)][0] // empty) else . end')
        else
            json=$(github_api_get "${GITHUB_API_BASE}/repos/${repo}/releases/latest")
        fi
    fi
    if [ -z "$json" ] || ! echo "$json" | jq -e '.tag_name' >/dev/null 2>&1; then
        echo "[ ERROR ] Could not read GitHub release from ${repo}." >&2
        local msg
        msg=$(echo "$json" | jq -r '.message // empty' 2>/dev/null || true)
        [ -n "$msg" ] && echo "[ HINT ] GitHub API: $msg" >&2
        if [ "$msg" = "Not Found" ]; then
            echo "[ HINT ] Source on main is not enough. Publish a GitHub Release with hiretrack-vX.Y.Z.tar.gz." >&2
            echo "[ HINT ] Maintainers: GitHub → Actions → Release → Run workflow, or push tag vX.Y.Z." >&2
        fi
        return 1
    fi
    printf '%s' "$json"
}

github_asset_url() {
    local release_json="$1"
    local asset_name="$2"
    if [ -n "${GITHUB_TOKEN:-}" ]; then
        local asset_id repo
        asset_id=$(echo "$release_json" | jq -r --arg n "$asset_name" '.assets[]? | select(.name==$n) | .id // empty' | head -1)
        if [ -z "$asset_id" ] || [ "$asset_id" = "null" ]; then
            echo ""
            return 0
        fi
        repo=$(resolve_github_release_repo) || return 1
        echo "${GITHUB_API_BASE}/repos/${repo}/releases/assets/${asset_id}"
        return 0
    fi
    echo "$release_json" | jq -r --arg n "$asset_name" '.assets[]? | select(.name==$n) | .browser_download_url // empty' | head -1
}

tarball_name_for_tag() {
    local tag
    tag=$(normalize_release_tag "$1")
    echo "hiretrack-${tag}.tar.gz"
}

# Function to initialize and manage channel (production / beta / staging) from config.json
init_channel_mode() {
    # Ensure config.json exists
    if [ ! -f "$CONFIG_PATH" ]; then
        mkdir -p "$(dirname "$CONFIG_PATH")"
        echo '{"autoUpdate": true, "installedVersion": "none", "channel": "production"}' > "$CONFIG_PATH"
    fi

    # Read channel from config; fallback to "beta" if old "beta": true exists for backward compat
    local CONFIG_CHANNEL
    CONFIG_CHANNEL=$(jq -r '.channel // empty' "$CONFIG_PATH" 2>/dev/null || echo "")
    if [ -z "$CONFIG_CHANNEL" ] || [ "$CONFIG_CHANNEL" = "null" ]; then
        local CONFIG_BETA
        CONFIG_BETA=$(jq -r '.beta // false' "$CONFIG_PATH" 2>/dev/null || echo "false")
        if [ "$CONFIG_BETA" = "true" ] || [ "$CONFIG_BETA" = "1" ] || [ "$CONFIG_BETA" = "yes" ]; then
            CONFIG_CHANNEL="beta"
        else
            CONFIG_CHANNEL="production"
        fi
    fi

    # Check for command line flag override (--beta or --staging)
    local CHANNEL_FLAG=""
    for arg in "$@"; do
        if [ "$arg" = "--beta" ] || [ "$arg" = "-beta" ]; then
            CHANNEL_FLAG="beta"
            break
        fi
        if [ "$arg" = "--staging" ] || [ "$arg" = "-staging" ]; then
            CHANNEL_FLAG="staging"
            break
        fi
    done

    if [ -n "$CHANNEL_FLAG" ]; then
        CHANNEL="$CHANNEL_FLAG"
        if [ "$CONFIG_CHANNEL" != "$CHANNEL" ]; then
            write_config "channel" "$CHANNEL"
            echo "[ SAVE ] Channel saved to config.json: $CHANNEL" >&2
        fi
    else
        CHANNEL="$CONFIG_CHANNEL"
    fi

    # Normalize
    case "$CHANNEL" in
        beta|staging|production) ;;
        *) CHANNEL="production" ;;
    esac

    if [ "$CHANNEL" = "beta" ]; then
        echo "[ MODE ] BETA MODE ENABLED - Using beta repository" >&2
    elif [ "$CHANNEL" = "staging" ]; then
        echo "[ MODE ] STAGING MODE ENABLED - Using staging repository" >&2
    fi
}

mkdir -p "$APP_INSTALL_DIR" "$BACKUP_DIR" "$TMP_INSTALL_DIR" "$LOG_DIR"

# ------------------------------------------------
# Auto-copy Installer
# ------------------------------------------------
if [ "$(realpath "$0")" != "$SCRIPT_PATH" ]; then
    echo "[ PACKAGE ] Copying installer to $HOME/.hiretrack..."
    mkdir -p "$HOME/.hiretrack"
    cp "$0" "$SCRIPT_PATH"
    chmod +x "$SCRIPT_PATH"
    echo "[ OK ] Installer ready at $SCRIPT_PATH"
    echo "[ START ] Auto-running installer with --install..."
    exec "$SCRIPT_PATH" "$@"
    exit 0
fi

# ------------------------------------------------
# Utility Functions
# ------------------------------------------------
check_dep() {
    local CMD="$1"
    if ! command -v "$CMD" >/dev/null 2>&1; then
        echo "[ WARNING ] $CMD not found. Installing..."
        if command -v apt-get >/dev/null 2>&1; then
            sudo apt-get update
            sudo apt-get install -y "$CMD"
        elif command -v yum >/dev/null 2>&1; then
            sudo yum install -y "$CMD"
        else
            echo "[ ERROR ] Cannot install $CMD automatically. Please install it manually."
            exit 1
        fi
    fi
    echo "[ OK ] $CMD is available."
}

# Tesseract: used by Hiretrack server for OCR on scanned/image-only PDFs (see src/lib/cv-upload/pdf-text-extraction.ts).
# Idempotent; Debian/Ubuntu via apt; RHEL/Fedora via dnf/yum when available.
ensure_tesseract_for_cv_ocr() {
    if command -v tesseract >/dev/null 2>&1; then
        echo "[ OK ] Tesseract OCR already available ($(command -v tesseract))."
        return 0
    fi

    echo "[ PACKAGE ] Installing Tesseract OCR (scanned PDF / CV upload support)..."
    if command -v apt-get >/dev/null 2>&1; then
        sudo apt-get update -qq
        sudo apt-get install -y tesseract-ocr tesseract-ocr-eng
    elif command -v dnf >/dev/null 2>&1; then
        sudo dnf install -y tesseract tesseract-langpack-eng
    elif command -v yum >/dev/null 2>&1; then
        sudo yum install -y tesseract tesseract-langpack-eng
    else
        echo "[ WARNING ] No apt-get/dnf/yum found. Install Tesseract manually for CV OCR, or set CV_OCR_SERVICE_URL in .env."
        return 0
    fi

    if command -v tesseract >/dev/null 2>&1; then
        echo "[ OK ] Tesseract OCR installed ($(command -v tesseract))."
    else
        echo "[ WARNING ] Tesseract package installed but binary not on PATH. Set TESSERACT_CMD in .env if needed."
    fi
}

# Probe whether a Python binary can create a working venv (not just --help).
python_venv_works() {
    local py_bin="$1"
    local test_dir
    test_dir=$(mktemp -d "${TMPDIR:-/tmp}/hiretrack-venv-test.XXXXXX" 2>/dev/null || mktemp -d /tmp/hiretrack-venv-test.XXXXXX)
    if "$py_bin" -m venv "$test_dir" 2>/dev/null && [ -x "$test_dir/bin/pip" ]; then
        rm -rf "$test_dir"
        return 0
    fi
    rm -rf "$test_dir"
    return 1
}

# Install OS packages for python3 -m venv (e.g. python3.12-venv on Ubuntu). Idempotent.
ensure_python_venv_packages() {
    if [ "$SKIP_MARKDOWN_PARSER" = "1" ]; then
        return 0
    fi

    if command -v apt-get >/dev/null 2>&1; then
        echo "[ PACKAGE ] Installing Python venv support (python3.12-venv)..."
        # Do not pass DEBIAN_FRONTEND on the sudo line — many sudoers configs reject it.
        sudo apt-get update -qq
        if sudo apt-get install -y \
            python3 python3-pip python3.12-venv 2>/dev/null; then
            echo "[ OK ] python3.12-venv installed."
            return 0
        fi
        echo "[ PACKAGE ] Retrying with python3-venv package..."
        sudo apt-get install -y python3 python3-pip python3-venv || {
            echo "[ WARNING ] Could not install python3 venv packages via apt."
            return 1
        }
        echo "[ OK ] python3-venv installed."
        return 0
    fi

    if command -v dnf >/dev/null 2>&1; then
        echo "[ PACKAGE ] Installing Python venv support..."
        sudo dnf install -y python3 python3-pip && echo "[ OK ] Python packages installed."
        return 0
    fi

    if command -v yum >/dev/null 2>&1; then
        echo "[ PACKAGE ] Installing Python venv support..."
        sudo yum install -y python3 python3-pip && echo "[ OK ] Python packages installed."
        return 0
    fi

    return 0
}

# Install venv packages if needed, then echo a python binary that supports -m venv.
resolve_python_venv_bin() {
    local candidate

    for candidate in python3.12 python3; do
        if command -v "$candidate" >/dev/null 2>&1 && python_venv_works "$candidate"; then
            echo "$candidate"
            return 0
        fi
    done

    ensure_python_venv_packages || return 1

    for candidate in python3.12 python3; do
        if command -v "$candidate" >/dev/null 2>&1 && python_venv_works "$candidate"; then
            echo "$candidate"
            return 0
        fi
    done
    return 1
}

# Local FastAPI PDF→Markdown service for bulk CV uploads (replaces external Docling VM when installed).
ensure_markdown_parser_service() {
    if [ "$SKIP_MARKDOWN_PARSER" = "1" ]; then
        echo "[ INFO ] Skipping markdown parser service (--skip-markdown-parser)."
        return 0
    fi

    echo ""
    echo "========================================"
    echo "   Markdown Parser Service (bulk CV)"
    echo "========================================"

    ensure_python_venv_packages || true

    if ! command -v python3 >/dev/null 2>&1 && ! command -v python3.12 >/dev/null 2>&1; then
        echo "[ WARNING ] Python not found. Install Python 3.12+ or set DOCLING_PARSE_URL manually in .env."
        return 0
    fi

    local PY_VENV_BIN
    PY_VENV_BIN=$(resolve_python_venv_bin) || {
        echo "[ WARNING ] Python venv support is missing. Skipping markdown parser setup."
        echo "[ HINT ] On Ubuntu run: sudo apt install -y python3.12-venv python3-pip"
        return 0
    }

    local PM2_BIN
    PM2_BIN=$(command -v pm2 2>/dev/null || true)
    if [ -z "$PM2_BIN" ]; then
        PM2_BIN="$(resolve_pm2_bin 2>/dev/null || true)"
    fi
    if [ -z "$PM2_BIN" ]; then
        echo "[ PACKAGE ] Installing PM2 for markdown parser..."
        npm install -g pm2 >/dev/null 2>&1 || true
        PM2_BIN="$(resolve_pm2_bin 2>/dev/null || true)"
    fi
    if [ -z "$PM2_BIN" ]; then
        echo "[ WARNING ] PM2 not available; skipping markdown parser. Set DOCLING_PARSE_URL in .env."
        return 0
    fi

    mkdir -p "$MARKDOWN_PARSER_DIR"

    if [ ! -d "$MARKDOWN_PARSER_DIR/venv" ] || [ ! -x "$MARKDOWN_PARSER_DIR/venv/bin/pip" ]; then
        rm -rf "$MARKDOWN_PARSER_DIR/venv"
        echo "[ PACKAGE ] Creating Python virtual environment..."
        set +e
        "$PY_VENV_BIN" -m venv "$MARKDOWN_PARSER_DIR/venv"
        local VENV_STATUS=$?
        set -e
        if [ "$VENV_STATUS" -ne 0 ] || [ ! -x "$MARKDOWN_PARSER_DIR/venv/bin/pip" ]; then
            rm -rf "$MARKDOWN_PARSER_DIR/venv"
            echo "[ WARNING ] Could not create Python venv. Skipping markdown parser setup."
            echo "[ HINT ] On Ubuntu run: sudo apt install -y python3.12-venv python3-pip"
            return 0
        fi
    fi

    echo "[ PACKAGE ] Installing FastAPI, uvicorn, pymupdf4llm..."
    "$MARKDOWN_PARSER_DIR/venv/bin/pip" install -q --upgrade pip
    "$MARKDOWN_PARSER_DIR/venv/bin/pip" install -q fastapi uvicorn python-multipart pymupdf4llm

    echo "[ PACKAGE ] Writing $MARKDOWN_PARSER_DIR/main.py..."
    cat << 'MARKDOWN_PARSER_MAIN_EOF' > "$MARKDOWN_PARSER_DIR/main.py"
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import pymupdf4llm
import tempfile
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/parse")
async def parse_cv(file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_pdf:
        temp_pdf.write(await file.read())
        temp_path = temp_pdf.name

    try:
        markdown_text = pymupdf4llm.to_markdown(temp_path)
        return {"status": "success", "markdown": markdown_text}
    except Exception as e:
        return {"status": "error", "message": str(e)}
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
MARKDOWN_PARSER_MAIN_EOF

    "$PM2_BIN" delete "$MARKDOWN_PARSER_PM2_NAME" >/dev/null 2>&1 || true

    echo "[ START ] Starting markdown parser on 127.0.0.1:${MARKDOWN_PARSER_PORT}..."
    (
        cd "$MARKDOWN_PARSER_DIR" || exit 1
        "$PM2_BIN" start "$MARKDOWN_PARSER_DIR/venv/bin/uvicorn" \
            --name "$MARKDOWN_PARSER_PM2_NAME" \
            --cwd "$MARKDOWN_PARSER_DIR" \
            --interpreter none \
            -- main:app --host 127.0.0.1 --port "$MARKDOWN_PARSER_PORT"
    )

    pm2_configure_autostart
    "$PM2_BIN" save --force >/dev/null 2>&1 || true

    local i=0 ready=0
    while [ "$i" -lt 30 ]; do
        if curl -sf "http://127.0.0.1:${MARKDOWN_PARSER_PORT}/docs" >/dev/null 2>&1; then
            ready=1
            break
        fi
        sleep 1
        i=$((i + 1))
    done

    if [ "$ready" -eq 1 ]; then
        echo "[ OK ] Markdown parser online at ${MARKDOWN_PARSER_URL}"
    else
        echo "[ WARNING ] Markdown parser started but health check failed. Check: pm2 logs $MARKDOWN_PARSER_PM2_NAME"
    fi
}


# ------------------------------------------------
# Resource Checker (RAM & Disk)
# ------------------------------------------------
check_resources() {
    local req_ram_mb="$1"
    local req_disk_mb="$2"
    local step_name="$3"

    # Get available disk space in MB for the installation directory
    local avail_disk_mb
    avail_disk_mb=$(df -m "$HOME" | awk 'NR==2 {print $4}')

    # Get available RAM in MB (Linux specific)
    local avail_ram_mb=2048 # Fallback
    if command -v free >/dev/null 2>&1; then
        avail_ram_mb=$(free -m | awk '/^Mem:/ {print $7}')
        [ -z "$avail_ram_mb" ] && avail_ram_mb=$(free -m | awk '/^Mem:/ {print $4}')
    fi
    
    echo -e "\n\033[1;36m================================================\033[0m" >&2
    echo -e "\033[1;36m[ SYSTEM DIAGNOSTIC ] ${step_name}\033[0m" >&2
    echo -e "\033[1;36m  -> RAM Available : ${avail_ram_mb} MB\033[0m" >&2
    echo -e "\033[1;36m  -> Disk Free     : ${avail_disk_mb} MB\033[0m" >&2
    echo -e "\033[1;36m================================================\033[0m\n" >&2

    if [ "$avail_disk_mb" -lt "$req_disk_mb" ]; then
        log_error "Insufficient storage for $step_name!"
        log_error "Have ${avail_disk_mb}MB, but need at least ${req_disk_mb}MB."
        return 1
    fi

    if [ "$avail_ram_mb" -lt "$req_ram_mb" ]; then
        log_error "Dangerously low RAM for $step_name!"
        log_error "Have ${avail_ram_mb}MB, but need at least ${req_ram_mb}MB to prevent crashing."
        return 1
    fi

    return 0
}

# Next.js build cache is not needed at runtime; strip after extract (old releases may still ship it).
strip_next_build_cache() {
    local app_dir="${1:-$APP_INSTALL_DIR}"
    if [ -d "$app_dir/.next/cache" ]; then
        echo "[ CLEAN ] Removing build-only .next/cache..."
        rm -rf "$app_dir/.next/cache"
    fi
}

get_machine_code() {
    local OS_TYPE
    OS_TYPE=$(uname | tr '[:upper:]' '[:lower:]')
    local SYS_MACHINE_ID=""
    local SYS_FS_UUID=""

    if [[ "$OS_TYPE" == "linux" ]]; then
        # 1. Grab OS Anchor (Machine ID)
        if [ -f /etc/machine-id ]; then
            SYS_MACHINE_ID=$(cat /etc/machine-id | tr -d '\n')
        else
            SYS_MACHINE_ID="UNKNOWN_OS"
        fi

        # 2. Grab Storage Anchor (Root Filesystem UUID)
        # Using || ensures the script doesn't crash if findmnt isn't available
        if command -v findmnt >/dev/null 2>&1; then
            SYS_FS_UUID=$(findmnt / -n -o UUID | tr -d '\n') || SYS_FS_UUID="UNKNOWN_FS"
        else
            SYS_FS_UUID="UNKNOWN_FS"
        fi

    elif [[ "$OS_TYPE" == "darwin" ]]; then
        # macOS Fallback (Since you explicitly support Darwin in your script)
        SYS_MACHINE_ID=$(ioreg -rd1 -c IOPlatformExpertDevice | awk '/IOPlatformUUID/ { split($0, line, "\""); printf("%s\n", line[4]); }' | tr -d '\n')
        SYS_FS_UUID="MAC_FS"
    else
        echo "[ ERROR ] Unsupported OS: $OS_TYPE" >&2
        exit 1
    fi

    # Combine the Anchors
    COMBINED_STRING="${SYS_MACHINE_ID}-${SYS_FS_UUID}"

    # Hash the combination securely (SHA-256)
    local HASH_RESULT
    if command -v shasum >/dev/null 2>&1; then
        HASH_RESULT=$(printf "%s" "$COMBINED_STRING" | shasum -a 256 | awk '{print $1}')
    elif command -v sha256sum >/dev/null 2>&1; then
        HASH_RESULT=$(printf "%s" "$COMBINED_STRING" | sha256sum | awk '{print $1}')
    else
        echo "[ ERROR ] Hash utility (shasum or sha256sum) not found. Cannot generate machine code." >&2
        exit 1
    fi

    # Return the generated fingerprint
    echo "$HASH_RESULT"
}

prompt_for_email() {
    read -p "Enter your email: " EMAIL
    if [ -z "$EMAIL" ]; then
        echo "[ ERROR ] Email cannot be empty."
        exit 1
    fi
    echo "$EMAIL"
}

prompt_for_update() {
    read -p "Enter your email: " EMAIL
    if [ -z "$EMAIL" ]; then
        echo "[ ERROR ] Email cannot be empty."
        exit 1
    fi
    echo "$EMAIL"
}

prompt_for_version() {
    read -p "Enter the version to install: " VERSION
    if [ -z "$VERSION" ]; then
        echo "[ ERROR ] Version cannot be empty."
        exit 1
    fi
    VERSION=${VERSION#hiretrack-}
    echo "$VERSION"
}

write_env_mongo_url() {
    local APP_DIR="$1"
    local URL="$2"
    local ENV_FILE="$APP_DIR/.env"
    mkdir -p "$APP_DIR"
    if [ -f "$ENV_FILE" ]; then
        grep -v "^MONGODB_URI=" "$ENV_FILE" > "${ENV_FILE}.tmp" || true
        echo "MONGODB_URI=$URL" >> "${ENV_FILE}.tmp"
        mv "${ENV_FILE}.tmp" "$ENV_FILE"
    else
        echo "MONGODB_URI=$URL" > "$ENV_FILE"
    fi
    echo "[ OK ] MongoDB URL updated in $ENV_FILE"
    sync_demo_deployment_env "$ENV_FILE"
}

# Re-apply demo/production flags after release tarball overwrites APP/.env
sync_demo_deployment_env() {
    local ENV_FILE="${1:-$APP_INSTALL_DIR/.env}"
    if command -v ensure_deployment_mode_env >/dev/null 2>&1; then
        ensure_deployment_mode_env "$ENV_FILE"
    fi
}

write_env_server_details() {
    local ENV_FILE="$APP_INSTALL_DIR/.env"
    mkdir -p "$APP_INSTALL_DIR"
    touch "$ENV_FILE"

    local SERVER_NAME
    SERVER_NAME=$(jq -r '.serverName // empty' "$CONFIG_PATH")

    if [ -n "$SERVER_NAME" ] && [ "$SERVER_NAME" != "null" ]; then
        local BASE_URL
        if [[ "$SERVER_NAME" =~ ^(localhost|127\.0\.0\.1)$ ]]; then
            BASE_URL="http://$SERVER_NAME:3000"
        elif [[ "$SERVER_NAME" =~ ^https?:// ]]; then
            BASE_URL="$SERVER_NAME"
        else
            BASE_URL="https://$SERVER_NAME"
        fi

        grep -v "^BASE_URL=" "$ENV_FILE" | grep -v "^NEXT_PUBLIC_BASE_URL=" | grep -v "^ALLOWED_ORIGINS=" | grep -v "^GITHUB_RELEASE_REPO=" > "${ENV_FILE}.tmp" || true
        echo "BASE_URL=$BASE_URL" >> "${ENV_FILE}.tmp"
        echo "NEXT_PUBLIC_BASE_URL=$BASE_URL" >> "${ENV_FILE}.tmp"
        echo "ALLOWED_ORIGINS=$BASE_URL" >> "${ENV_FILE}.tmp"
        echo "GITHUB_RELEASE_REPO=${GITHUB_RELEASE_REPO:-$DEFAULT_GITHUB_RELEASE_REPO}" >> "${ENV_FILE}.tmp"
        mv "${ENV_FILE}.tmp" "$ENV_FILE"

        echo "[ OK ] BASE_URL and NEXT_PUBLIC_BASE_URL updated in $ENV_FILE ($BASE_URL)"
    else
        echo "[ WARNING ] serverName not found in $CONFIG_PATH (skipping BASE_URL update)"
    fi

    ensure_cron_secret_in_env "$ENV_FILE"
    ensure_docling_parse_url_in_env "$ENV_FILE"
    sync_demo_deployment_env "$ENV_FILE"
    sync_hiretrack_reminders_cron
}

# Bulk CV pipeline: POST PDF to this URL for Markdown (see parse-pdf-to-markdown.ts).
ensure_docling_parse_url_in_env() {
    local ENV_FILE="${1:-$APP_INSTALL_DIR/.env}"
    mkdir -p "$(dirname "$ENV_FILE")"
    touch "$ENV_FILE"

    local existing
    existing=$(grep -m1 -E '^DOCLING_PARSE_URL=' "$ENV_FILE" 2>/dev/null | sed 's/^DOCLING_PARSE_URL=//' | tr -d '\r' || true)
    if [ -n "$existing" ]; then
        echo "[ OK ] DOCLING_PARSE_URL already set in $ENV_FILE"
        return 0
    fi

    grep -v '^DOCLING_PARSE_URL=' "$ENV_FILE" > "${ENV_FILE}.tmp" 2>/dev/null || cp "$ENV_FILE" "${ENV_FILE}.tmp"
    mv "${ENV_FILE}.tmp" "$ENV_FILE"
    printf '%s\n' "DOCLING_PARSE_URL=${MARKDOWN_PARSER_URL}" >> "$ENV_FILE"
    echo "[ OK ] Set DOCLING_PARSE_URL=${MARKDOWN_PARSER_URL} in $ENV_FILE"
}

# One unique CRON_SECRET per deployment (.env); skip if already set.
ensure_cron_secret_in_env() {
    local ENV_FILE="${1:-$APP_INSTALL_DIR/.env}"
    mkdir -p "$(dirname "$ENV_FILE")"
    touch "$ENV_FILE"
    local existing
    existing=$(grep -m1 -E '^CRON_SECRET=' "$ENV_FILE" 2>/dev/null | sed 's/^CRON_SECRET=//' | tr -d '\r' || true)
    if [ -n "$existing" ]; then
        return 0
    fi
    local secret
    if command -v openssl >/dev/null 2>&1; then
        secret=$(openssl rand -hex 32)
    else
        secret=$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom 2>/dev/null | head -c 48 || echo "")
    fi
    if [ -z "$secret" ]; then
        echo "[ ERROR ] Could not generate CRON_SECRET (install openssl or ensure /dev/urandom is readable)."
        return 1
    fi
    grep -v '^CRON_SECRET=' "$ENV_FILE" > "${ENV_FILE}.tmp" 2>/dev/null || cp "$ENV_FILE" "${ENV_FILE}.tmp"
    mv "${ENV_FILE}.tmp" "$ENV_FILE"
    printf '%s\n' "CRON_SECRET=${secret}" >> "$ENV_FILE"
    echo "[ OK ] Generated unique CRON_SECRET in $ENV_FILE"
}

write_reminders_ping_script() {
    mkdir -p "$(dirname "$REMINDERS_CRON_SCRIPT")" "$LOG_DIR"
    cat > "$REMINDERS_CRON_SCRIPT" <<EOF
#!/usr/bin/env bash
set -euo pipefail
ENV_FILE='$APP_INSTALL_DIR/.env'
if [ ! -f "\$ENV_FILE" ]; then
  exit 0
fi
BASE_URL=\$(grep -m1 -E '^BASE_URL=' "\$ENV_FILE" 2>/dev/null | sed 's/^BASE_URL=//' | tr -d '\r' || true)
CRON_SECRET=\$(grep -m1 -E '^CRON_SECRET=' "\$ENV_FILE" 2>/dev/null | sed 's/^CRON_SECRET=//' | tr -d '\r' || true)
if [ -z "\${BASE_URL:-}" ] || [ -z "\${CRON_SECRET:-}" ]; then
  exit 0
fi
BASE_URL="\${BASE_URL%/}"
curl -fsS -m 55 -X POST -H "x-cron-secret: \${CRON_SECRET}" "\${BASE_URL}/api/cron/followup-reminders" >/dev/null || true
EOF
    chmod +x "$REMINDERS_CRON_SCRIPT"
}

hiretrack_reminders_cron_line_active() {
    echo "* * * * * PATH=/usr/local/bin:/usr/bin:/bin /bin/bash $REMINDERS_CRON_SCRIPT >> $REMINDERS_CRON_LOG 2>&1 # hiretrack-reminders-ping"
}

# Commented-out schedule (cron ignores); enable via Settings → Microsoft Teams in the app.
hiretrack_reminders_cron_line() {
    local active
    active=$(hiretrack_reminders_cron_line_active)
    echo "# ${active}"
}

can_install_reminders_ping_cron() {
    local ENV_FILE="$APP_INSTALL_DIR/.env"
    [ -f "$ENV_FILE" ] || return 1
    local bu sec
    bu=$(grep -m1 -E '^BASE_URL=' "$ENV_FILE" 2>/dev/null | sed 's/^BASE_URL=//' | tr -d '\r' || true)
    sec=$(grep -m1 -E '^CRON_SECRET=' "$ENV_FILE" 2>/dev/null | sed 's/^CRON_SECRET=//' | tr -d '\r' || true)
    [ -n "$bu" ] && [ -n "$sec" ]
}

# Idempotent: reminders ping line in crontab (commented = off until Teams reminders enabled in UI).
sync_hiretrack_reminders_cron() {
    ensure_cron_secret_in_env "$APP_INSTALL_DIR/.env" || return 0
    if ! can_install_reminders_ping_cron; then
        echo "[ INFO ] Reminders ping cron not installed yet (need BASE_URL and CRON_SECRET in $APP_INSTALL_DIR/.env)."
        return 0
    fi
    write_reminders_ping_script
    local line tmp
    line=$(hiretrack_reminders_cron_line)
    tmp=$(mktemp)
    crontab -l 2>/dev/null | grep -v 'hiretrack-reminders-ping' > "$tmp" || true
    echo "$line" >> "$tmp"
    crontab "$tmp"
    rm -f "$tmp"
    echo "[ OK ] Reminders ping cron line installed (disabled by default; enable in HireTrack → Teams settings)."
}

write_config() {
    local KEY="$1"
    local VALUE="$2"
    jq --arg k "$KEY" --arg v "$VALUE" '.[$k]=$v' "$CONFIG_PATH" > "${CONFIG_PATH}.tmp" && mv "${CONFIG_PATH}.tmp" "$CONFIG_PATH"
}

load_installer_env_lib() {
    local here
    here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    for candidate in "$here/scripts/installer-env.sh" "$HOME/.hiretrack/scripts/installer-env.sh"; do
        if [ -f "$candidate" ]; then
            if [ "$candidate" != "$HOME/.hiretrack/scripts/installer-env.sh" ]; then
                mkdir -p "$HOME/.hiretrack/scripts"
                cp "$candidate" "$HOME/.hiretrack/scripts/installer-env.sh" 2>/dev/null || true
                candidate="$HOME/.hiretrack/scripts/installer-env.sh"
            fi
            # shellcheck source=scripts/installer-env.sh
            source "$candidate"
            return 0
        fi
    done
    echo "[ WARNING ] scripts/installer-env.sh not found; demo env sync skipped."
    return 1
}

load_installer_env_lib || true

# Set channel in config.json (production | beta | staging)
set_channel_config() {
    local CH="$1"
    if [ ! -f "$CONFIG_PATH" ]; then
        mkdir -p "$(dirname "$CONFIG_PATH")"
        echo '{"autoUpdate": true, "installedVersion": "none", "channel": "production"}' > "$CONFIG_PATH"
    fi
    write_config "channel" "$CH"
    case "$CH" in
        beta)   echo "[ OK ] Beta channel set in config.json. Future updates use the beta repository." ;;
        staging) echo "[ OK ] Staging channel set in config.json. Future updates use the staging repository." ;;
        *)      echo "[ OK ] Production channel set in config.json. Future updates use the production repository." ;;
    esac

    echo ""
    read -p "Do you want to upgrade the app now? (y/n): " UPGRADE_CHOICE
    UPGRADE_CHOICE=$(echo "$UPGRADE_CHOICE" | tr '[:upper:]' '[:lower:]')
    if [ "$UPGRADE_CHOICE" = "y" ] || [ "$UPGRADE_CHOICE" = "yes" ]; then
        echo ""
        echo "[ START ] Starting app upgrade..."
        schedule_update
    else
        echo "[ OK ] Channel configuration saved. Exiting."
        exit 0
    fi
}

# Legacy: set beta on/off (maps to channel beta or production)
set_beta_config() {
    local VALUE="$1"
    if [ "$VALUE" = "true" ] || [ "$VALUE" = "1" ] || [ "$VALUE" = "yes" ]; then
        set_channel_config "beta"
    else
        set_channel_config "production"
    fi
}

# ------------------------------------------------
# Dependency Installation
# ------------------------------------------------
# Normalize version for comparison: strip leading 'v' and trim (e.g. v20.19.5 or 20.19.5 -> 20.19.5)
normalize_node_version() {
    echo "$1" | sed 's/^v//' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//'
}

install_node() {
    local APP_DIR="$1"
    local NODE_VERSION NODE_MAJOR_VERSION REQUIRED_NORMALIZED NEEDS_INSTALL=false NEEDS_REMOVE=false

    if [ -n "$APP_DIR" ] && [ -f "$APP_DIR/.env" ]; then
        NODE_VERSION=$(grep -E '^NODE_VERSION=' "$APP_DIR/.env" | cut -d '=' -f2)
    fi

    if [ -z "$NODE_VERSION" ]; then
        echo "[ WARNING ] NODE_VERSION not found in .env file. Skipping Node.js installation."
        return 0
    fi

    REQUIRED_NORMALIZED=$(normalize_node_version "$NODE_VERSION")
    NODE_MAJOR_VERSION=$(echo "$REQUIRED_NORMALIZED" | sed -n 's/^\([0-9]*\).*/\1/p')
    if [ -z "$NODE_MAJOR_VERSION" ]; then
        echo "[ WARNING ] Could not determine Node.js version from: $NODE_VERSION. Skipping installation."
        return 0
    fi

    if command -v node >/dev/null 2>&1; then
        local CURRENT_NORMALIZED
        CURRENT_NORMALIZED=$(normalize_node_version "$(node -v 2>/dev/null)")
        if [ "$CURRENT_NORMALIZED" = "$REQUIRED_NORMALIZED" ]; then
            echo "[ OK ] Node.js $REQUIRED_NORMALIZED already installed (found $(node -v))."
            return
        else
            echo "[ WARNING ] Found Node.js $(node -v), but $REQUIRED_NORMALIZED required (from .env)."
            NEEDS_REMOVE=true
            NEEDS_INSTALL=true
        fi
    else
        echo "[ WARNING ] Node.js not found. Will install $REQUIRED_NORMALIZED (from .env)."
        NEEDS_INSTALL=true
    fi

    if [ "$NEEDS_REMOVE" = "true" ]; then
        echo "[ DELETE ] Removing existing Node.js installation and cleaning up PATH..."
        local NODE_PATHS=(
            "/usr/bin/node"
            "/usr/local/bin/node"
            "/opt/nodejs/bin/node"
            "/usr/bin/nodejs"
            "/usr/local/bin/nodejs"
            "$HOME/.nvm/versions/node/*/bin/node"
        )

        for NODE_PATH in "${NODE_PATHS[@]}"; do
            for p in $NODE_PATH; do
                [ -f "$p" ] && echo "   Removing $p..." && sudo rm -f "$p" 2>/dev/null || true
            done
        done

        sudo apt-get remove -y nodejs npm 2>/dev/null || true
        sudo apt-get purge -y nodejs npm 2>/dev/null || true
        sudo rm -rf /usr/lib/node_modules ~/.nvm 2>/dev/null || true
        sudo rm -f /etc/apt/sources.list.d/nodesource*.list /usr/share/keyrings/nodesource.gpg 2>/dev/null || true
        hash -r 2>/dev/null || true

        # Remove NVM path from startup scripts if any
        sed -i '/nvm/d' ~/.bashrc ~/.profile ~/.bash_login ~/.bash_profile 2>/dev/null || true
        export PATH="/usr/local/bin:/usr/bin:/bin"
        echo "[ OK ] Cleanup complete. PATH reset to safe defaults."
    fi

    if [ "$NEEDS_INSTALL" = "true" ]; then
        echo "[ PACKAGE ] Installing Node.js $REQUIRED_NORMALIZED (exact version from .env)..."
        local NODE_DIST_VER="v$REQUIRED_NORMALIZED"
        local OS_TYPE ARCH NODE_TAR DIRNAME
        OS_TYPE=$(uname -s | tr '[:upper:]' '[:lower:]')
        ARCH=$(uname -m)
        case "$ARCH" in
            x86_64|amd64) ARCH="x64" ;;
            aarch64|arm64) ARCH="arm64" ;;
            *) echo "[ ERROR ] Unsupported architecture: $ARCH"; exit 1 ;;
        esac
        case "$OS_TYPE" in
            linux) DIRNAME="node-${NODE_DIST_VER}-linux-${ARCH}" ;;
            darwin) DIRNAME="node-${NODE_DIST_VER}-darwin-${ARCH}" ;;
            *) echo "[ ERROR ] Unsupported OS: $OS_TYPE"; exit 1 ;;
        esac
        local NODE_INSTALL_ROOT="${NODE_INSTALL_ROOT:-/usr/local}"
        local NODE_DIR="$NODE_INSTALL_ROOT/$DIRNAME"
        NODE_TAR="/tmp/${DIRNAME}.tar.xz"
        local NODE_URL="https://nodejs.org/dist/${NODE_DIST_VER}/${DIRNAME}.tar.xz"

        if [ ! -d "$NODE_DIR" ] || ! "$NODE_DIR/bin/node" -v 2>/dev/null | grep -qF "$REQUIRED_NORMALIZED"; then
            echo "   Downloading from $NODE_URL"
            curl -fsSL -o "$NODE_TAR" "$NODE_URL" || { echo "[ ERROR ] Failed to download Node.js $REQUIRED_NORMALIZED."; exit 1; }
            sudo mkdir -p "$NODE_INSTALL_ROOT"
            sudo rm -rf "$NODE_DIR"
            sudo tar -xJf "$NODE_TAR" -C "$NODE_INSTALL_ROOT" || { rm -f "$NODE_TAR"; echo "[ ERROR ] Failed to extract Node.js."; exit 1; }
            sudo rm -f "$NODE_TAR"
        fi

        if [ ! -x "$NODE_DIR/bin/node" ]; then
            echo "[ ERROR ] Node.js binary not found at $NODE_DIR/bin/node"
            exit 1
        fi

        echo "   Linking Node.js binaries to /usr/local/bin for global access..."
        sudo ln -sf "$NODE_DIR/bin/node" /usr/local/bin/node
        sudo ln -sf "$NODE_DIR/bin/npm" /usr/local/bin/npm
        sudo ln -sf "$NODE_DIR/bin/npx" /usr/local/bin/npx

        export PATH="$NODE_DIR/bin:$PATH"
        local PROFILE
        for PROFILE in ~/.bashrc ~/.profile; do
            if [ -f "$PROFILE" ] && ! grep -qF "$NODE_DIR/bin" "$PROFILE" 2>/dev/null; then
                echo "export PATH=\"$NODE_DIR/bin:\$PATH\"" >> "$PROFILE"
            fi
        done
        hash -r

        local NODE_PATH NODE_VER NPM_VER
        NODE_PATH=$(command -v node)
        NODE_VER=$(node -v)
        NPM_VER=$(npm -v 2>/dev/null || echo "missing")
        echo "[ OK ] Node.js $NODE_VER and npm $NPM_VER installed successfully."
        echo "   Active binary: $NODE_PATH"
        echo "[ RECYCLE ] Reloading environment to apply Node.js changes..."
        hash -r
        sleep 1
        if command -v node >/dev/null 2>&1; then
            echo "[ OK ] Node.js environment refreshed successfully (using $(node -v))"
        else
            echo "[ WARNING ] Node.js not detected after reload. You may need to restart your terminal manually."
        fi
    fi
}

# Logout/exit user to restart terminal session (for fresh Node.js installation)
logout_user() {
    echo ""
    echo "[ RESTART ] Node.js has been installed successfully."
    echo "   Please logout and login again (or restart your terminal) to apply the changes,"
    echo "   then run the installer again to continue."
    echo ""
    exit 0
}

# Returns 0 if Node.js is not installed, 1 if installed
is_node_installed() {
    command -v node >/dev/null 2>&1
}

need_node_install() {
    local APP_DIR="$1"
    local NODE_VERSION REQUIRED_NORMALIZED CURRENT_NORMALIZED

    if [ -z "$APP_DIR" ] || [ ! -f "$APP_DIR/.env" ]; then
        return 1
    fi
    NODE_VERSION=$(grep -E '^NODE_VERSION=' "$APP_DIR/.env" 2>/dev/null | cut -d '=' -f2)
    if [ -z "$NODE_VERSION" ]; then
        return 1
    fi
    REQUIRED_NORMALIZED=$(normalize_node_version "$NODE_VERSION")
    if [ -z "$REQUIRED_NORMALIZED" ] || ! echo "$REQUIRED_NORMALIZED" | grep -qE '^[0-9]+\.[0-9]'; then
        return 1
    fi
    if ! is_node_installed; then
        return 0
    fi
    CURRENT_NORMALIZED=$(normalize_node_version "$(node -v 2>/dev/null)")
    if [ "$CURRENT_NORMALIZED" = "$REQUIRED_NORMALIZED" ]; then
        return 1
    fi
    return 0
}

resolve_pm2_bin() {
    local PM2_BIN=""

    PM2_BIN="$(command -v pm2 2>/dev/null || true)"
    if [ -n "$PM2_BIN" ] && [ -x "$PM2_BIN" ]; then
        echo "$PM2_BIN"
        return 0
    fi

    local NPM_GLOBAL_BIN=""
    NPM_GLOBAL_BIN="$(npm bin -g 2>/dev/null || true)"
    if [ -n "$NPM_GLOBAL_BIN" ] && [ -x "$NPM_GLOBAL_BIN/pm2" ]; then
        echo "$NPM_GLOBAL_BIN/pm2"
        return 0
    fi

    local NPM_PREFIX=""
    NPM_PREFIX="$(npm prefix -g 2>/dev/null || true)"
    if [ -n "$NPM_PREFIX" ] && [ -x "$NPM_PREFIX/bin/pm2" ]; then
        echo "$NPM_PREFIX/bin/pm2"
        return 0
    fi

    local NPM_ROOT=""
    NPM_ROOT="$(npm root -g 2>/dev/null || true)"
    if [ -n "$NPM_ROOT" ]; then
        local PREFIX_FROM_ROOT=""
        PREFIX_FROM_ROOT="$(cd "$NPM_ROOT/../.." 2>/dev/null && pwd || true)"
        if [ -n "$PREFIX_FROM_ROOT" ] && [ -x "$PREFIX_FROM_ROOT/bin/pm2" ]; then
            echo "$PREFIX_FROM_ROOT/bin/pm2"
            return 0
        fi
    fi

    if [ -x "/usr/local/bin/pm2" ]; then
        echo "/usr/local/bin/pm2"
        return 0
    fi

    return 1
}

check_pm2() {
    if [ ! -d "$APP_INSTALL_DIR" ]; then
        echo "[ WARNING ] App install directory not found: $APP_INSTALL_DIR. Skipping PM2 installation."
        return 0
    fi

    if [ ! -f "$APP_INSTALL_DIR/.env" ]; then
        echo "[ WARNING ] .env file not found in $APP_INSTALL_DIR. Skipping PM2 installation."
        return 0
    fi

    if [ ! -f "$APP_INSTALL_DIR/package.json" ]; then
        echo "[ WARNING ] package.json not found in $APP_INSTALL_DIR. Skipping PM2 installation."
        return 0
    fi

    install_node "$APP_INSTALL_DIR"
    if command -v pm2 >/dev/null 2>&1; then
        echo "[ OK ] PM2 already installed."
    else
        echo "[ PACKAGE ] Installing PM2 globally..."
        npm install -g pm2
        local PM2_BIN=""
        PM2_BIN="$(resolve_pm2_bin || true)"
        if [ -n "$PM2_BIN" ]; then
            ln -sf "$PM2_BIN" /usr/local/bin/pm2 >/dev/null 2>&1 || sudo ln -sf "$PM2_BIN" /usr/local/bin/pm2 >/dev/null 2>&1 || true
            export PATH="$(dirname "$PM2_BIN"):$PATH"
        fi

        hash -r 2>/dev/null || true

        if command -v pm2 >/dev/null 2>&1; then
            echo "[ OK ] PM2 installed."
        else
            echo "[ ERROR ] Failed to install PM2 (binary not discoverable after install)."
            echo "   resolved pm2 bin: ${PM2_BIN:-unset}"
            echo "   npm prefix -g: $(npm prefix -g 2>/dev/null || echo 'unknown')"
            exit 1
        fi
    fi
}

pm2_configure_autostart() {
    local PM2_BIN
    PM2_BIN=$(command -v pm2 2>/dev/null || echo "")
    if [ -z "$PM2_BIN" ]; then
        PM2_BIN="$(resolve_pm2_bin 2>/dev/null || true)"
    fi
    if [ -z "$PM2_BIN" ]; then
        echo "[ WARNING ] PM2 not found; skipping PM2 autostart configuration."
        return 0
    fi

    "$PM2_BIN" set pm2:autodump true >/dev/null 2>&1 || true

    local CURRENT_CRON PM2_REBOOT_LINE TMP_CRON
    PM2_REBOOT_LINE="@reboot $PM2_BIN resurrect >> $HOME/pm2-startup.log 2>&1"
    CURRENT_CRON=$(crontab -l 2>/dev/null || echo "")

    if echo "$CURRENT_CRON" | grep -Fq "$PM2_REBOOT_LINE"; then
        return 0
    fi

    TMP_CRON=$(mktemp)
    printf "%s\n" "$CURRENT_CRON" > "$TMP_CRON"
    sed -i '/pm2 resurrect/d' "$TMP_CRON" 2>/dev/null || true
    echo "$PM2_REBOOT_LINE" >> "$TMP_CRON"
    crontab "$TMP_CRON"
    rm -f "$TMP_CRON" >/dev/null 2>&1 || true
}

pm2_ensure_hiretrack_process() {
    local APP_NAME="$1"
    local APP_DIR="$2"
    local PM2_BIN

    PM2_BIN=$(command -v pm2 2>/dev/null || echo "")
    if [ -z "$PM2_BIN" ]; then
        PM2_BIN="$(resolve_pm2_bin 2>/dev/null || true)"
    fi
    if [ -z "$PM2_BIN" ]; then
        echo "[ ERROR ] PM2 not found when managing process: $APP_NAME"
        return 1
    fi

    "$PM2_BIN" delete "$APP_NAME" >/dev/null 2>&1 || true

    local PM2_EXIT=0
    set +e
    (
        cd "$APP_DIR" && \
        "$PM2_BIN" start "npm run start" --name "$APP_NAME" --cwd "$APP_DIR"
    )
    PM2_EXIT=$?
    set -e
    if [ $PM2_EXIT -ne 0 ]; then
        echo "[ ERROR ] PM2 failed to start $APP_NAME (exit code: $PM2_EXIT)"
        return $PM2_EXIT
    fi

    pm2_configure_autostart
    "$PM2_BIN" save --force >/dev/null 2>&1 || true
    "$PM2_BIN" restart "$APP_NAME" --update-env >/dev/null 2>&1 || true

    return 0
}

pm2_delete_other_hiretrack_processes() {
    local TARGET_APP_NAME="$1"
    local PM2_BIN PM2_JSON
    local PM2_PROCS PROC

    PM2_BIN=$(command -v pm2 2>/dev/null || echo "")
    if [ -z "$PM2_BIN" ]; then
        PM2_BIN="$(resolve_pm2_bin 2>/dev/null || true)"
    fi
    if [ -z "$PM2_BIN" ]; then
        return 0
    fi

    PM2_JSON="$("$PM2_BIN" jlist 2>/dev/null || true)"
    if [ -n "$PM2_JSON" ] && command -v jq >/dev/null 2>&1; then
        PM2_PROCS="$(echo "$PM2_JSON" | jq -r --arg t "$TARGET_APP_NAME" \
            '.[] | select(.name | startswith("hiretrack-") and .name != $t) | .name' 2>/dev/null || true)"
    else
        PM2_PROCS="$("$PM2_BIN" list 2>/dev/null | awk '/hiretrack-/ {print $4}' || true)"
    fi

    for PROC in $PM2_PROCS; do
        if [ -n "$PROC" ]; then
            "$PM2_BIN" delete "$PROC" >/dev/null 2>&1 || true
        fi
    done

    return 0
}

install_and_start_mongodb() {
    local OS_TYPE
    OS_TYPE=$(uname | tr '[:upper:]' '[:lower:]')
    local LATEST_VERSION=""

    if command -v mongod >/dev/null 2>&1; then
        echo "[ OK ] MongoDB already installed."
        [[ "$OS_TYPE" == "darwin" ]] && LATEST_VERSION=$(brew list --formula | grep -E '^mongodb-community@[0-9]+\.[0-9]+' | sort -V | tail -n 1)
    else
        echo "[ PACKAGE ] Installing MongoDB $MONGODB_VERSION..."
        if [[ "$OS_TYPE" == "darwin" ]]; then
            [ ! -x "$(command -v brew)" ] && { echo "[ ERROR ] Install Homebrew first"; exit 1; }
            brew tap mongodb/brew
            LATEST_VERSION=$(brew search mongodb-community@ | grep -Eo 'mongodb-community@[0-9]+\.[0-9]+' | sort -V | tail -n 1)
            [ -z "$LATEST_VERSION" ] && { echo "[ ERROR ] MongoDB formula not found"; exit 1; }
            brew install "$LATEST_VERSION"
        elif [[ "$OS_TYPE" == "linux" ]]; then
            if command -v apt-get >/dev/null 2>&1; then
                sudo rm -f /etc/apt/sources.list.d/mongodb-org-*.list
                curl -fsSL https://www.mongodb.org/static/pgp/server-$MONGODB_VERSION.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-$MONGODB_VERSION.gpg
                local CODENAME=$(lsb_release -cs)
                if [[ "$CODENAME" == "noble" ]]; then
                    echo "[ WARNING ] Ubuntu Noble (24.04) detected. Using Jammy (22.04) repository for MongoDB $MONGODB_VERSION."
                    CODENAME="jammy"
                fi
                echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-$MONGODB_VERSION.gpg ] https://repo.mongodb.org/apt/ubuntu $CODENAME/mongodb-org/$MONGODB_VERSION multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-$MONGODB_VERSION.list
                sudo apt-get update
                if ! sudo apt-get install -y mongodb-org; then
                    echo "[ ERROR ] Failed to install MongoDB $MONGODB_VERSION. Trying MongoDB 6.0 as fallback..."
                    MONGODB_VERSION="6.0"
                    sudo rm -f /etc/apt/sources.list.d/mongodb-org-$MONGODB_VERSION.list
                    curl -fsSL https://www.mongodb.org/static/pgp/server-6.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-6.0.gpg
                    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu $CODENAME/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
                    sudo apt-get update
                    if ! sudo apt-get install -y mongodb-org; then
                        echo "[ ERROR ] Failed to install MongoDB. Please install it manually from https://www.mongodb.com/docs/manual/installation/"
                        exit 1
                    fi
                fi
            elif command -v yum >/dev/null 2>&1; then
                sudo yum install -y mongodb-org
            else
                echo "[ ERROR ] Unsupported Linux. Install MongoDB manually."
                exit 1
            fi
        else
            echo "[ ERROR ] Unsupported OS: $OS_TYPE"
            exit 1
        fi
    fi

    echo "[ RUN ] Starting MongoDB service..."
    if [[ "$OS_TYPE" == "darwin" ]]; then
        [ -z "$LATEST_VERSION" ] && LATEST_VERSION="mongodb-community@$MONGODB_VERSION"
        brew services start "$LATEST_VERSION" || { echo "[ ERROR ] Failed to start MongoDB via Homebrew"; exit 1; }
    elif [[ "$OS_TYPE" == "linux" ]]; then
        sudo systemctl start mongod || { echo "[ ERROR ] Failed to start MongoDB"; exit 1; }
        sudo systemctl enable mongod || { echo "[ ERROR ] Failed to enable MongoDB"; exit 1; }
    fi
    sleep 5
    if pgrep -x "mongod" >/dev/null; then
        echo "[ OK ] MongoDB running"
        if command -v mongo >/dev/null 2>&1; then
            mongo --eval "db.adminCommand('ping')" >/dev/null 2>&1 && echo "[ OK ] MongoDB connection verified" || { echo "[ ERROR ] MongoDB connection failed"; exit 1; }
        else
            echo "[ WARNING ] MongoDB shell not found, skipping connection test"
        fi
    else
        echo "[ ERROR ] MongoDB failed to start. Check logs at /var/log/mongodb/mongod.log"
        exit 1
    fi
}

create_default_config() {
    local PASSED_EMAIL="${1:-}"
    if [ ! -f "$CONFIG_PATH" ]; then
        echo '{"autoUpdate": true, "installedVersion": "none", "channel": "production"}' > "$CONFIG_PATH"
        echo "[ OK ] Default config created at $CONFIG_PATH"
    else
        if ! jq -e '.channel' "$CONFIG_PATH" >/dev/null 2>&1; then
            local BETA_VAL
            BETA_VAL=$(jq -r '.beta // false' "$CONFIG_PATH" 2>/dev/null || echo "false")
            if [ "$BETA_VAL" = "true" ] || [ "$BETA_VAL" = "1" ] || [ "$BETA_VAL" = "yes" ]; then
                write_config "channel" "beta"
            else
                write_config "channel" "production"
            fi
        fi
    fi

    if [ -n "$PASSED_EMAIL" ]; then
        if ! echo "$PASSED_EMAIL" | grep -E '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' >/dev/null 2>&1; then
            echo "[ ERROR ] Invalid email format: $PASSED_EMAIL"
            exit 1
        fi
        local EXISTING_EMAIL
        EXISTING_EMAIL=$(jq -r '.email // empty' "$CONFIG_PATH" 2>/dev/null || echo "")
        if [ -n "$EXISTING_EMAIL" ] && [ "$EXISTING_EMAIL" != "$PASSED_EMAIL" ]; then
           exit 0
        fi
    fi
}

setup_database() {
    local EXISTING_DB_CHOICE
    EXISTING_DB_CHOICE=$(jq -r '.dbChoice // empty' "$CONFIG_PATH")
    local SKIP_DB_SETUP=""
    if [ -n "$EXISTING_DB_CHOICE" ]; then
        echo "[ OK ] Database preference already set: $EXISTING_DB_CHOICE"
        local EXISTING_DB_URL
        EXISTING_DB_URL=$(jq -r '.dbUrl // empty' "$CONFIG_PATH")
        [ -n "$EXISTING_DB_URL" ] && echo "[ LINK ] Existing DB URL: $EXISTING_DB_URL"
        read -p "Do you want to override the database preference and URL? [y/N]: " OVERRIDE
        OVERRIDE=${OVERRIDE:-N}
        if [[ ! "$OVERRIDE" =~ ^[Yy]$ ]]; then
            SKIP_DB_SETUP=1
            if [ -n "$EXISTING_DB_URL" ]; then
                write_env_mongo_url "$APP_INSTALL_DIR" "$EXISTING_DB_URL"
            fi
        fi
    fi

    if [ -z "$SKIP_DB_SETUP" ]; then
        echo "[ PACKAGE ] Choose MongoDB option:"
        echo "1) MongoDB Atlas (cloud)"
        echo "2) Local MongoDB"
        read -p "Enter choice [1/2]: " DB_CHOICE

        local APP_DIR="$APP_INSTALL_DIR"
        local DB_URL
        if [ "$DB_CHOICE" == "1" ]; then
            read -p "Enter your MongoDB Atlas connection URL: " ATLAS_URL
            [ -z "$ATLAS_URL" ] && { echo "[ ERROR ] MongoDB Atlas URL cannot be empty."; exit 1; }
            DB_URL="$ATLAS_URL"
            write_config "dbChoice" "atlas"
        elif [ "$DB_CHOICE" == "2" ]; then
            install_and_start_mongodb
            DB_URL="mongodb://localhost:27017/hiretrack"
            write_config "dbChoice" "local"
        else
            echo "[ ERROR ] Invalid choice."
            exit 1
        fi
        write_env_mongo_url "$APP_DIR" "$DB_URL"
        write_config "dbUrl" "$DB_URL"
    fi
}

license_removed_notice() {
    echo "[ INFO ] HireTrack is open source. License registration is not required."
}

# Returns byte size of a file, or 0 if missing.
file_byte_size() {
    local path="$1"
    stat -f%z "$path" 2>/dev/null || stat -c%s "$path" 2>/dev/null || echo "0"
}

# Report download HTTP errors using JSON body when available.
report_download_http_error() {
    local dest="$1"
    local http_code="$2"
    if [ -f "$dest" ] && [ -s "$dest" ]; then
        local first_char
        first_char=$(head -c 1 "$dest" 2>/dev/null || echo "")
        if [ "$first_char" = "{" ]; then
            local error_msg
            error_msg=$(jq -r '.error // .message // "Unknown error"' "$dest" 2>/dev/null || echo "Download validation failed")
            echo "[ ERROR ] Download validation failed: $error_msg" >&2
            return
        fi
    fi
    if [ -z "$http_code" ] || [ "$http_code" = "000" ]; then
        echo "[ ERROR ] Network error: could not reach download server." >&2
    elif [ -f "$dest" ] && [ ! -s "$dest" ]; then
        echo "[ ERROR ] Download validation failed: HTTP $http_code (No response body)" >&2
    else
        echo "[ ERROR ] Download validation failed: HTTP $http_code" >&2
    fi
}

# Verify file matches expected sha256 hex digest.
verify_file_sha256() {
    local expected="$1"
    local file="$2"
    if [ -z "$expected" ] || [ "$expected" = "null" ]; then
        return 1
    fi
    if command -v sha256sum >/dev/null 2>&1; then
        echo "${expected}  ${file}" | sha256sum -c - >/dev/null 2>&1
        return $?
    fi
    echo "${expected}  ${file}" | shasum -a 256 -c >/dev/null 2>&1
}

# Download release via chunked API (meta + N part requests). Returns 1 if meta unavailable.
# Args: meta_url asset_url dest
download_asset_chunked() {
    local meta_url="$1"
    local asset_url="$2"
    local dest="$3"
    local meta_tmp="${dest}.manifest.json"
    local http_code=""
    local meta_body=""

    mkdir -p "$(dirname "$dest")"
    rm -f "$dest" "${dest}.part."*

    http_code=$(curl -sS -o "$meta_tmp" -w "%{http_code}" \
        --connect-timeout 30 \
        --max-time 120 \
        "$meta_url" 2>/dev/null) || return 1

    http_code="${http_code//[$'\r\n ']/}"
    if [ "$http_code" != "200" ]; then
        rm -f "$meta_tmp"
        return 1
    fi

    if ! jq -e '.chunked == true and (.parts | tonumber) > 0' "$meta_tmp" >/dev/null 2>&1; then
        rm -f "$meta_tmp"
        return 1
    fi

    local parts total_bytes expected_sha
    parts=$(jq -r '.parts' "$meta_tmp")
    total_bytes=$(jq -r '.totalBytes' "$meta_tmp")
    expected_sha=$(jq -r '.sha256' "$meta_tmp")

    echo "[ DOWNLOAD ] Chunked release: ${parts} parts, ${total_bytes} bytes expected..." >&2

    local i=0
    local part_file http_part
    while [ "$i" -lt "$parts" ]; do
        part_file="${dest}.part.${i}"
        echo "[ DOWNLOAD ] Part $((i + 1))/${parts}..." >&2
        http_part=$(curl -sS -o "$part_file" -w "%{http_code}" \
            --connect-timeout 30 \
            --max-time 300 \
            "${asset_url}&part=${i}" 2>/dev/null) || {
            rm -f "$part_file" "$dest" "${dest}.part."* "$meta_tmp"
            return 1
        }
        http_part="${http_part//[$'\r\n ']/}"
        if [ "$http_part" != "200" ]; then
            report_download_http_error "$part_file" "$http_part"
            rm -f "$part_file" "$dest" "${dest}.part."* "$meta_tmp"
            return 1
        fi
        cat "$part_file" >> "$dest"
        rm -f "$part_file"
        i=$((i + 1))
    done

    rm -f "$meta_tmp"

    local assembled_size
    assembled_size=$(file_byte_size "$dest")
    if [ -n "$total_bytes" ] && [ "$total_bytes" != "null" ] && [ "$assembled_size" != "$total_bytes" ]; then
        echo "[ ERROR ] Assembled size ${assembled_size} does not match expected ${total_bytes}." >&2
        rm -f "$dest"
        return 1
    fi

    if ! verify_file_sha256 "$expected_sha" "$dest"; then
        echo "[ ERROR ] SHA256 checksum mismatch after chunked download." >&2
        rm -f "$dest"
        return 1
    fi

    if ! gzip -t "$dest" 2>/dev/null; then
        echo "[ ERROR ] Assembled file is not a valid gzip archive." >&2
        rm -f "$dest"
        return 1
    fi

    echo "[ OK ] Chunked download complete ($(file_byte_size "$dest") bytes)." >&2
    return 0
}

# Download a large release asset with retry. Args: url dest [max_attempts] [max_time] [require_gzip]
download_url_to_file() {
    local url="$1"
    local dest="$2"
    local max_attempts="${3:-6}"
    local max_time_per_attempt="${4:-900}"
    local require_gzip="${5:-1}"
    local curl_err="${dest}.curlerr"
    local attempt=1
    local last_curl_exit=0
    local http_code=""

    mkdir -p "$(dirname "$dest")"

    while [ "$attempt" -le "$max_attempts" ]; do
        if [ "$attempt" -gt 1 ]; then
            echo "[ DOWNLOAD ] Retry ${attempt}/${max_attempts} (full download restart)..." >&2
            rm -f "$dest" "$curl_err"
            sleep $((attempt * 3))
        fi

        last_curl_exit=0
        http_code=""
        : > "$curl_err"
        local extra_args=()
        if [ -n "${GITHUB_TOKEN:-}" ] && [[ "$url" == *"github.com"* ]]; then
            extra_args=(-H "Authorization: Bearer ${GITHUB_TOKEN}")
            if [[ "$url" == *"/releases/assets/"* ]]; then
                extra_args+=(-H "Accept: application/octet-stream")
            fi
        fi
        http_code=$(curl -sS -L \
            "${extra_args[@]}" \
            -o "$dest" \
            -w "%{http_code}" \
            --connect-timeout 30 \
            --max-time "$max_time_per_attempt" \
            "$url" 2>>"$curl_err") || last_curl_exit=$?

        http_code="${http_code//[$'\r\n ']/}"

        if [ "$last_curl_exit" -ne 0 ]; then
            if [ -s "$curl_err" ]; then
                tail -3 "$curl_err" >&2 || true
            fi
            case "$last_curl_exit" in
                18)
                    echo "[ WARNING ] Transfer ended early (curl 18, $(file_byte_size "$dest") bytes) — retrying..." >&2
                    ;;
                33)
                    echo "[ WARNING ] Server does not support resume (curl 33) — retrying full download..." >&2
                    ;;
                *)
                    echo "[ WARNING ] curl failed with exit $last_curl_exit on attempt ${attempt}/${max_attempts}" >&2
                    ;;
            esac
            rm -f "$dest"
            attempt=$((attempt + 1))
            continue
        fi

        if [ "$http_code" != "200" ]; then
            report_download_http_error "$dest" "$http_code"
            rm -f "$dest" "$curl_err"
            return 1
        fi

        if [ ! -s "$dest" ]; then
            echo "[ WARNING ] Empty download on attempt ${attempt}/${max_attempts}" >&2
            attempt=$((attempt + 1))
            continue
        fi

        if [ "$require_gzip" = "1" ]; then
            local first_byte
            first_byte=$(head -c 1 "$dest" 2>/dev/null || echo "")
            if [ "$first_byte" = "{" ]; then
                report_download_http_error "$dest" "$http_code"
                rm -f "$dest" "$curl_err"
                return 1
            fi

            if ! gzip -t "$dest" 2>/dev/null; then
                echo "[ WARNING ] Incomplete or corrupt gzip ($(file_byte_size "$dest") bytes) on attempt ${attempt}/${max_attempts} — retrying..." >&2
                attempt=$((attempt + 1))
                continue
            fi
        fi

        rm -f "$curl_err"
        return 0
    done

    echo "[ ERROR ] Download failed after ${max_attempts} attempts (last curl exit: ${last_curl_exit})." >&2
    if [ "$last_curl_exit" = "18" ]; then
        echo "[ HINT ] Server closed the connection before the full file was sent." >&2
        echo "[ HINT ] The remote closed the connection before the full file was sent. Retry, or use GITHUB_TOKEN if the repo is private." >&2
    fi
    if [ -s "$curl_err" ]; then
        echo "[ HINT ] $(tail -1 "$curl_err")" >&2
    fi
    rm -f "$dest" "$curl_err"
    return 1
}

download_github_chunked() {
    local release_json="$1"
    local dest="$2"
    local tarball_name="$3"
    local manifest_name="${tarball_name}.manifest.json"
    local manifest_url
    manifest_url=$(github_asset_url "$release_json" "$manifest_name")
    if [ -z "$manifest_url" ]; then
        return 1
    fi

    local meta_tmp="${dest}.manifest.json"
    rm -f "$dest" "${dest}.part."*
    if ! download_url_to_file "$manifest_url" "$meta_tmp" 3 120 0; then
        return 1
    fi
    if ! jq -e '.chunked == true and (.parts | tonumber) > 0' "$meta_tmp" >/dev/null 2>&1; then
        rm -f "$meta_tmp"
        return 1
    fi

    local parts total_bytes expected_sha part_prefix
    parts=$(jq -r '.parts' "$meta_tmp")
    total_bytes=$(jq -r '.totalBytes' "$meta_tmp")
    expected_sha=$(jq -r '.sha256' "$meta_tmp")
    part_prefix=$(jq -r '.partPrefix // empty' "$meta_tmp")
    if [ -z "$part_prefix" ] || [ "$part_prefix" = "null" ]; then
        part_prefix="${tarball_name}.part-"
    fi

    echo "[ DOWNLOAD ] Chunked GitHub release: ${parts} parts, ${total_bytes} bytes expected..." >&2

    local i=0
    local part_name part_url part_file
    while [ "$i" -lt "$parts" ]; do
        part_name=$(printf "%s%03d" "$part_prefix" "$i")
        part_url=$(github_asset_url "$release_json" "$part_name")
        if [ -z "$part_url" ]; then
            echo "[ ERROR ] Missing GitHub asset $part_name" >&2
            rm -f "$dest" "${dest}.part."* "$meta_tmp"
            return 1
        fi
        part_file="${dest}.part.${i}"
        echo "[ DOWNLOAD ] Part $((i + 1))/${parts}..." >&2
        if ! download_url_to_file "$part_url" "$part_file" 4 300 0; then
            rm -f "$part_file" "$dest" "${dest}.part."* "$meta_tmp"
            return 1
        fi
        cat "$part_file" >> "$dest"
        rm -f "$part_file"
        i=$((i + 1))
    done

    rm -f "$meta_tmp"

    local assembled_size
    assembled_size=$(file_byte_size "$dest")
    if [ -n "$total_bytes" ] && [ "$total_bytes" != "null" ] && [ "$assembled_size" != "$total_bytes" ]; then
        echo "[ ERROR ] Assembled size ${assembled_size} does not match expected ${total_bytes}." >&2
        rm -f "$dest"
        return 1
    fi

    if ! verify_file_sha256 "$expected_sha" "$dest"; then
        echo "[ ERROR ] SHA256 checksum mismatch after chunked download." >&2
        rm -f "$dest"
        return 1
    fi

    if ! gzip -t "$dest" 2>/dev/null; then
        echo "[ ERROR ] Assembled file is not a valid gzip archive." >&2
        rm -f "$dest"
        return 1
    fi

    echo "[ OK ] Chunked download complete ($(file_byte_size "$dest") bytes)." >&2
    return 0
}

download_release_asset() {
    local VERSION="${1:-}"
    persist_github_release_repo >/dev/null 2>&1 || true

    local RELEASE
    if [ -n "$VERSION" ] && [ "$VERSION" != "none" ] && [ "$VERSION" != "latest" ]; then
        RELEASE=$(fetch_github_release_json "$VERSION") || return 1
    else
        RELEASE=$(fetch_github_release_json latest) || return 1
    fi

    local TAG TARBALL
    TAG=$(echo "$RELEASE" | jq -r '.tag_name')
    TARBALL=$(tarball_name_for_tag "$TAG")

    local TMP_FILE="$HOME/.hiretrack/tmp_asset.tar.gz"

    if [ -f "$TMP_FILE" ] && gzip -t "$TMP_FILE" 2>/dev/null; then
        echo "[ OK ] Complete download already present ($(file_byte_size "$TMP_FILE") bytes)." >&2
        echo "$TMP_FILE"
        return 0
    fi
    rm -f "$TMP_FILE" "${TMP_FILE}.curlerr" "${TMP_FILE}.manifest.json" "${TMP_FILE}.part."*

    if ! check_resources 100 2000 "Downloading Core Assets"; then
        return 1
    fi

    echo "[ DOWNLOAD ] Fetching $TARBALL from GitHub Releases..." >&2
    if ! download_github_chunked "$RELEASE" "$TMP_FILE" "$TARBALL"; then
        echo "[ INFO ] Chunked download unavailable; trying full archive download..." >&2
        rm -f "$TMP_FILE" "${TMP_FILE}.curlerr" "${TMP_FILE}.manifest.json" "${TMP_FILE}.part."*
        local ASSET_URL
        ASSET_URL=$(github_asset_url "$RELEASE" "$TARBALL")
        if [ -z "$ASSET_URL" ]; then
            echo "[ ERROR ] Release asset $TARBALL not found on GitHub." >&2
            return 1
        fi
        if ! download_url_to_file "$ASSET_URL" "$TMP_FILE" 6 900 1; then
            return 1
        fi
    fi

    local FILE_SIZE
    FILE_SIZE=$(file_byte_size "$TMP_FILE")
    if [ "$FILE_SIZE" -lt 1000 ]; then
        echo "[ ERROR ] Downloaded file is too small ($FILE_SIZE bytes). File may be corrupted or incomplete." >&2
        rm -f "$TMP_FILE"
        return 1
    fi

    echo "$TMP_FILE"
}

check_latest_version() {
    local RELEASE LATEST_VERSION
    RELEASE=$(fetch_github_release_json latest) || exit 1
    LATEST_VERSION=$(echo "$RELEASE" | jq -r '.tag_name // empty')
    if [ -z "$LATEST_VERSION" ] || [ "$LATEST_VERSION" == "null" ]; then
        echo "[ ERROR ] No latest version found on GitHub Releases."
        exit 1
    fi
    echo "$LATEST_VERSION"
}

rollback() {
    local VERSION_TO_RESTORE
    if [ -f "$CONFIG_PATH" ]; then
        VERSION_TO_RESTORE=$(jq -r '.previousVersion // empty' "$CONFIG_PATH")
    fi

    if [ -z "$VERSION_TO_RESTORE" ] || [ "$VERSION_TO_RESTORE" = "null" ] || [ "$VERSION_TO_RESTORE" = "none" ]; then
        echo "[ ERROR ] No previous version found in config.json for rollback" | tee -a "$ROLLBACK_LOG_FILE"
        return 1
    fi

    echo "[ RESTART ] Rolling back to version $VERSION_TO_RESTORE..." | tee -a "$ROLLBACK_LOG_FILE"

    echo "[ DOWNLOAD ] Downloading version $VERSION_TO_RESTORE..." | tee -a "$ROLLBACK_LOG_FILE"
    local TMP_FILE
    TMP_FILE=$(download_release_asset "$VERSION_TO_RESTORE") || {
        echo "[ ERROR ] Failed to download version $VERSION_TO_RESTORE" | tee -a "$ROLLBACK_LOG_FILE"
        return 1
    }

    if [ ! -f "$TMP_FILE" ]; then
        echo "[ ERROR ] Downloaded file not found at $TMP_FILE" | tee -a "$ROLLBACK_LOG_FILE"
        return 1
    fi

    local FILE_SIZE
    FILE_SIZE=$(stat -f%z "$TMP_FILE" 2>/dev/null || stat -c%s "$TMP_FILE" 2>/dev/null || echo "0")
    if [ "$FILE_SIZE" -lt 1000 ]; then
        echo "[ ERROR ] Downloaded file is too small ($FILE_SIZE bytes). File may be corrupted." | tee -a "$ROLLBACK_LOG_FILE"
        rm -f "$TMP_FILE"
        return 1
    fi

    if [ -d "$APP_INSTALL_DIR" ]; then
        if rm --help 2>&1 | grep -q -- '--no-preserve-root'; then
            sudo rm -rf --no-preserve-root "$APP_INSTALL_DIR"
        else
            sudo rm -rf "$APP_INSTALL_DIR"
        fi
    fi

    mkdir -p "$APP_INSTALL_DIR"
    echo "[ DIR ] Extracting archive to $APP_INSTALL_DIR..." | tee -a "$ROLLBACK_LOG_FILE"
    
    local EXTRACT_OUTPUT EXTRACT_STATUS
    EXTRACT_OUTPUT=$(tar --no-xattrs -xzf "$TMP_FILE" -C "$APP_INSTALL_DIR" 2>&1)
    EXTRACT_STATUS=$?
    
    if [ -n "$EXTRACT_OUTPUT" ]; then
        echo "$EXTRACT_OUTPUT" | grep -v "LIBARCHIVE.xattr" | grep -v "^$" >&2 || true
    fi
    
    rm -f "$TMP_FILE" >/dev/null 2>&1 || true

    if [ $EXTRACT_STATUS -ne 0 ]; then
        echo "[ ERROR ] Extraction failed. The archive may be corrupted." | tee -a "$ROLLBACK_LOG_FILE"
        return 1
    fi

    strip_next_build_cache "$APP_INSTALL_DIR"

    if [ ! -f "$APP_INSTALL_DIR/package.json" ]; then
        echo "[ ERROR ] package.json not found after extraction." | tee -a "$ROLLBACK_LOG_FILE"
        return 1
    fi

    local DB_URL DB_CHOICE
    DB_URL=$(jq -r '.dbUrl // empty' "$CONFIG_PATH")
    DB_CHOICE=$(jq -r '.dbChoice // empty' "$CONFIG_PATH")
    [ -n "$DB_URL" ] && write_env_mongo_url "$APP_INSTALL_DIR" "$DB_URL"

    [ "$DB_CHOICE" = "local" ] && install_and_start_mongodb

    if need_node_install "$APP_INSTALL_DIR"; then
        if ! is_node_installed; then
            echo "[ WARNING ] Node.js is not installed. Installing Node.js..." | tee -a "$ROLLBACK_LOG_FILE"
            install_node "$APP_INSTALL_DIR" || {
                echo "[ ERROR ] Node install failed during rollback." | tee -a "$ROLLBACK_LOG_FILE"
                return 1
            }
            echo "[ OK ] Node.js installed. Logging out to restart terminal session..." | tee -a "$ROLLBACK_LOG_FILE"
            logout_user
        else
            echo "[ WARNING ] Node.js version mismatch. Updating Node.js..." | tee -a "$ROLLBACK_LOG_FILE"
            install_node "$APP_INSTALL_DIR" || {
                echo "[ ERROR ] Node update failed during rollback." | tee -a "$ROLLBACK_LOG_FILE"
                return 1
            }
            echo "[ OK ] Node.js updated. Continuing with rollback..." | tee -a "$ROLLBACK_LOG_FILE"
        fi
    fi
    install_node "$APP_INSTALL_DIR" || {
        echo "[ ERROR ] Node install failed during rollback." | tee -a "$ROLLBACK_LOG_FILE"
        return 1
    }

    cd "$APP_INSTALL_DIR" || exit

    rollback_msg() {
        echo "$1" | tee -a "$ROLLBACK_LOG_FILE"
    }
    stop_pm2_for_dependency_install "" rollback_msg

    echo "[ PACKAGE ] Restoring production dependencies..." | tee -a "$ROLLBACK_LOG_FILE"
    if ! clean_npm_install "$APP_INSTALL_DIR" "$ROLLBACK_LOG_FILE"; then
        echo "[ ERROR ] npm install failed during rollback." | tee -a "$ROLLBACK_LOG_FILE"
        return 1
    fi

    write_env_server_details
    ensure_markdown_parser_service
    check_pm2

    echo "[ START ] Restarting previous version with PM2..." | tee -a "$ROLLBACK_LOG_FILE"

    echo "[ CLEAN ] Cleaning up old hiretrack PM2 processes..." | tee -a "$ROLLBACK_LOG_FILE"
    pm2 list | awk '/hiretrack-/ {print $4}' | while read -r PROC; do
        if [ -n "$PROC" ]; then
            echo "[ STOP ] Stopping $PROC..." | tee -a "$ROLLBACK_LOG_FILE"
            pm2 delete "$PROC" 2>&1 | tee -a "$ROLLBACK_LOG_FILE" || true
        fi
    done

    local VERSION_NAME="$VERSION_TO_RESTORE"
    if [[ "$VERSION_NAME" != v* ]]; then
        VERSION_NAME="v$VERSION_NAME"
    fi

    pm2 start "npm run start" --name "hiretrack-$VERSION_NAME" --cwd "$APP_INSTALL_DIR" 2>&1 | tee -a "$ROLLBACK_LOG_FILE" || {
        echo "[ ERROR ] Failed to start PM2 process." | tee -a "$ROLLBACK_LOG_FILE"
        return 1
    }

    pm2 save --force >/dev/null 2>&1 || true

    echo "[ OK ] Rollback completed." | tee -a "$ROLLBACK_LOG_FILE"
    write_config "installedVersion" "$VERSION_NAME"
}

# Stop PM2 before npm install on low-RAM hosts (release artifacts are pre-built; devDeps are omitted).
stop_pm2_for_dependency_install() {
    local APP_TO_STOP="${1:-}"
    local LOG_FN="${2:-echo}"

    "$LOG_FN" "[ STOP ] Stopping PM2 processes to free memory for dependency install..."
    local PM2_BIN_FOR_STOP
    PM2_BIN_FOR_STOP="$(resolve_pm2_bin 2>/dev/null || true)"
    if [ -z "$PM2_BIN_FOR_STOP" ]; then
        "$LOG_FN" "[ WARNING ] PM2 not found; skipping stop."
        return 0
    fi

    if [ -n "$APP_TO_STOP" ]; then
        "$PM2_BIN_FOR_STOP" stop "$APP_TO_STOP" >/dev/null 2>&1 || true
    else
        "$PM2_BIN_FOR_STOP" stop all >/dev/null 2>&1 || true
    fi
    "$LOG_FN" "[ OK ] PM2 stop completed; proceeding with dependency install..."
}

clean_npm_install() {
    local TARGET_DIR="${1:-$PWD}"
    local NPM_LOG_FILE="${2:-$MANUAL_LOG_FILE}"

    if [ ! -d "$TARGET_DIR" ]; then return 1; fi
    if [ ! -f "$TARGET_DIR/package.json" ]; then return 1; fi

    (
    cd "$TARGET_DIR" || exit 1

    case ":$PATH:" in
        *":/bin:"*) ;;
        *) export PATH="/usr/local/bin:/usr/bin:/bin:$PATH" ;;
    esac

    if [ -d node_modules ]; then
        rm -rf node_modules 2>/dev/null || sudo rm -rf node_modules
    fi

    if ! check_resources 200 1500 "Dependency Install"; then
        return 1
    fi

    # Pre-built release bundles (.next); runtime only needs production dependencies.
    export NODE_ENV=production
    local NPM_FLAGS=(--legacy-peer-deps --no-audit --no-fund --loglevel=error --omit=dev)

    {
        echo "[ INFO ] Installing production dependencies only (--omit=dev)."
        echo "[ INFO ] NODE_ENV=${NODE_ENV}"
    } >> "$NPM_LOG_FILE" 2>&1

    start_spinner "Installing production dependencies (this may take a few minutes)..."

    set +e
    local NPM_EXIT=0
    if [ -f package-lock.json ]; then
        npm ci "${NPM_FLAGS[@]}" >> "$NPM_LOG_FILE" 2>&1
        NPM_EXIT=$?
        if [ $NPM_EXIT -ne 0 ]; then
            echo "[ WARNING ] npm ci failed (exit $NPM_EXIT); retrying with npm install..." >> "$NPM_LOG_FILE" 2>&1
            npm install "${NPM_FLAGS[@]}" >> "$NPM_LOG_FILE" 2>&1
            NPM_EXIT=$?
        fi
    else
        echo "[ WARNING ] package-lock.json not found; using npm install." >> "$NPM_LOG_FILE" 2>&1
        npm install "${NPM_FLAGS[@]}" >> "$NPM_LOG_FILE" 2>&1
        NPM_EXIT=$?
    fi
    set -e

    if [ $NPM_EXIT -ne 0 ]; then
        stop_spinner "error" "Dependencies installation failed. Check logs at: $NPM_LOG_FILE"
        return $NPM_EXIT
    fi

    stop_spinner "success" "Production dependencies installed successfully."
    )
}

check_update_and_install() {
    create_default_config
    local FLAG1="${1:-}"
    local AUTO_UPDATE
    AUTO_UPDATE=$(jq -r '.autoUpdate' "$CONFIG_PATH")
    local INSTALLED_VERSION
    INSTALLED_VERSION=$(jq -r '.installedVersion // "none"' "$CONFIG_PATH")
    local TIMESTAMP
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    local LOG_TO_FILE="false"

    if [ "$FLAG1" = "manually" ]; then
        LOG_TO_FILE="true"
        echo "[$TIMESTAMP] [ INFO ] Manual update triggered." | tee -a "$MANUAL_LOG_FILE"
        # Manual updates always tee to a log file; animated spinners still spam when stdout is a TTY
        # (PM2, some process managers). Force a single static progress line for this path.
        export INSTALLER_SPINNER_MODE=quiet
    fi

    log() {
        local MSG="$1"
        
        # Safely strip all corrupted emojis and weird characters, keeping only standard text
        local CLEAN_MSG
        CLEAN_MSG=$(echo "$MSG" | tr -cd '\11\12\15\40-\176' | sed 's/^ *//g')
        
        if [ "$LOG_TO_FILE" = "true" ]; then
            file_log "$MANUAL_LOG_FILE" "$CLEAN_MSG"
        else
            # 👇 FIX: Just print the clean message directly! No more double tags.
            echo "$CLEAN_MSG"
        fi
    }

    if [ "$AUTO_UPDATE" != "true" ] && [ "$LOG_TO_FILE" != "true" ]; then
        log "[ OK ] Auto-update disabled. Keeping version: $INSTALLED_VERSION"
        return 0
    fi

    log "[ SEARCH ] Checking latest version..."
    local LATEST_VERSION
    LATEST_VERSION=$(check_latest_version) || { log "[ ERROR ] Failed to fetch latest version."; return 1; }

    local NORMALIZED_INSTALLED NORMALIZED_LATEST
    NORMALIZED_INSTALLED=$(echo "${INSTALLED_VERSION#v}" | tr -d '[:space:]')
    NORMALIZED_LATEST=$(echo "${LATEST_VERSION#v}" | tr -d '[:space:]')

    log "[ INFO ] Installed: $INSTALLED_VERSION | Latest: $LATEST_VERSION"

    if [ "$INSTALLED_VERSION" != "none" ] && [ "$NORMALIZED_INSTALLED" = "$NORMALIZED_LATEST" ] ; then
        if [ -d "$APP_INSTALL_DIR" ] && [ "$(find "$APP_INSTALL_DIR" -mindepth 1 -print -quit 2>/dev/null)" ]; then
            log "[ OK ] Already up to date."
            return 0
        else
            log "[ WARNING ] Installed version matches latest but $APP_INSTALL_DIR appears empty. Proceeding with reinstall/update."
        fi
    fi

    log "[ START ] Update available: upgrading to $LATEST_VERSION"
    
    if [ "$INSTALLED_VERSION" != "none" ] && [ -n "$INSTALLED_VERSION" ]; then
        log "[ SAVE ] Storing previous version ($INSTALLED_VERSION) in config.json..."
        write_config "previousVersion" "$INSTALLED_VERSION"
    fi
    
    local TMP_FILE
    TMP_FILE=$(download_release_asset "$LATEST_VERSION") || { log "[ ERROR ] Failed to download release from GitHub."; return 1; }
    
    if [ ! -f "$TMP_FILE" ]; then
        log "[ ERROR ] Downloaded file not found at $TMP_FILE"
        return 1
    fi
    
    log "[ OK ] Asset downloaded successfully: $TMP_FILE"
    
    sleep 1
    local FILENAME VERSION_NAME APP_NAME_WITH_VERSION
    FILENAME=$(basename "$TMP_FILE")
    VERSION_NAME="$LATEST_VERSION"
    if [[ "$VERSION_NAME" != v* ]]; then
        VERSION_NAME="v$VERSION_NAME"
    fi
    APP_NAME_WITH_VERSION="hiretrack-$VERSION_NAME"

    if [ ! -f "$TMP_FILE" ]; then
        log "[ ERROR ] Downloaded file not found at $TMP_FILE"
        rollback
        return 1
    fi

    local FILE_SIZE
    FILE_SIZE=$(stat -f%z "$TMP_FILE" 2>/dev/null || stat -c%s "$TMP_FILE" 2>/dev/null || echo "0")
    if [ "$FILE_SIZE" -lt 1000 ]; then
        log "[ ERROR ] Downloaded file is too small ($FILE_SIZE bytes). File may be corrupted or incomplete."
        log "[ HINT ] This may indicate a network issue or incomplete download."
        rm -f "$TMP_FILE"
        rollback
        return 1
    fi

    local FILE_SIZE_DISPLAY
    if command -v numfmt >/dev/null 2>&1; then
        FILE_SIZE_DISPLAY=$(numfmt --to=iec-i --suffix=B "$FILE_SIZE" 2>/dev/null || echo "${FILE_SIZE} bytes")
    elif [ "$FILE_SIZE" -gt 1073741824 ]; then
        FILE_SIZE_DISPLAY=$(awk "BEGIN {printf \"%.2f GB\", $FILE_SIZE/1073741824}")
    elif [ "$FILE_SIZE" -gt 1048576 ]; then
        FILE_SIZE_DISPLAY=$(awk "BEGIN {printf \"%.2f MB\", $FILE_SIZE/1048576}")
    elif [ "$FILE_SIZE" -gt 1024 ]; then
        FILE_SIZE_DISPLAY=$(awk "BEGIN {printf \"%.2f KB\", $FILE_SIZE/1024}")
    else
        FILE_SIZE_DISPLAY="${FILE_SIZE} bytes"
    fi
    log "[ PACKAGE ] File size: $FILE_SIZE_DISPLAY"

    if [ -d "$APP_INSTALL_DIR" ]; then
       if rm --help 2>&1 | grep -q -- '--no-preserve-root'; then
            sudo rm -rf --no-preserve-root "$APP_INSTALL_DIR" 2>/dev/null || true
        else
            sudo rm -rf "$APP_INSTALL_DIR" 2>/dev/null || true
        fi
    fi
    mkdir -p "$APP_INSTALL_DIR"
    log "[ DIR ] Extracting archive to $APP_INSTALL_DIR..."

    if ! check_resources 200 1500 "Extraction"; then
       rm -f "$TMP_FILE"
       rollback
       return 1
   fi

   start_spinner "Extracting core application files..."
   
   local EXTRACT_OUTPUT EXTRACT_STATUS
   set +e  
   EXTRACT_OUTPUT=$(tar -xzf "$TMP_FILE" -C "$APP_INSTALL_DIR" >> "$MANUAL_LOG_FILE" 2>&1)
   EXTRACT_STATUS=$?
   set -e  
   
   if [ $EXTRACT_STATUS -ne 0 ]; then
       stop_spinner "error" "Extraction failed. Check logs at: $MANUAL_LOG_FILE"
       rm -f "$TMP_FILE"
       rollback
       return 1
   fi
   stop_spinner "success" "Application extracted."

    strip_next_build_cache "$APP_INSTALL_DIR"
    rm -f "$TMP_FILE" >/dev/null 2>&1 || true
    log "[ CLEAN ] Removed download archive to free disk before dependency install."
    
    if [ -n "$EXTRACT_OUTPUT" ]; then
        echo "$EXTRACT_OUTPUT" | grep -v "LIBARCHIVE.xattr" | grep -v "^$" >&2 || true
    fi
    
    if [ $EXTRACT_STATUS -ne 0 ]; then
        log "[ ERROR ] Extraction failed. The archive may be corrupted or incomplete."
        log "[ HINT ] File size: $FILE_SIZE_DISPLAY"
        log "[ HINT ] Attempting to re-download..."
        rm -f "$TMP_FILE"
        rollback
        return 1
    fi
    log "[ OK ] Extracted to: $APP_INSTALL_DIR"
    
    if [ ! -f "$APP_INSTALL_DIR/package.json" ]; then
        log "[ ERROR ] package.json not found after extraction. Archive structure may be invalid."
        log "[ HINT ] Contents of $APP_INSTALL_DIR:"
        ls -la "$APP_INSTALL_DIR" | head -20 >&2 || true
        rm -f "$TMP_FILE" >/dev/null 2>&1 || true
        rollback
        return 1
    fi
    
    log "[ OK ] Verified package.json exists"
    local DB_URL DB_CHOICE
    DB_URL=$(jq -r '.dbUrl // empty' "$CONFIG_PATH")
    DB_CHOICE=$(jq -r '.dbChoice // empty' "$CONFIG_PATH")
    [ -n "$DB_URL" ] && write_env_mongo_url "$APP_INSTALL_DIR" "$DB_URL"

    [ "$DB_CHOICE" = "local" ] && install_and_start_mongodb

    if need_node_install "$APP_INSTALL_DIR"; then
        if ! is_node_installed; then
            log "[ WARNING ] Node.js is not installed. Installing Node.js..."
            install_node "$APP_INSTALL_DIR" || {
                log "[ ERROR ] Node install failed."
                rm -f "$TMP_FILE" >/dev/null 2>&1 || true
                rollback
                return 1
            }
            log "[ OK ] Node.js installed. Logging out to restart terminal session..."
            logout_user
        else
            log "[ WARNING ] Node.js version mismatch. Updating Node.js..."
            install_node "$APP_INSTALL_DIR" || {
                log "[ ERROR ] Node update failed."
                rm -f "$TMP_FILE" >/dev/null 2>&1 || true
                rollback
                return 1
            }
            log "[ OK ] Node.js updated. Continuing with installation..."
        fi
    fi
    install_node "$APP_INSTALL_DIR" || {
        log "[ ERROR ] Node install failed."
        rm -f "$TMP_FILE" >/dev/null 2>&1 || true
        rollback
        return 1
    }

    log "[ OK ] Using Node.js ($(node -v))"
    
    cd "$APP_INSTALL_DIR" || {
        log "[ ERROR ] Failed to cd into app dir."
        rm -f "$TMP_FILE" >/dev/null 2>&1 || true
        rollback
        return 1
    }
    
    log "[ DIR ] Files in $APP_INSTALL_DIR:"
    if [ -d "$APP_INSTALL_DIR" ]; then
        ls -la "$APP_INSTALL_DIR" 2>/dev/null | head -30 || true
        log "[ INFO ] Total items in directory: $(ls -1 "$APP_INSTALL_DIR" 2>/dev/null | wc -l)"
    else
        log "[ WARNING ] Directory $APP_INSTALL_DIR does not exist"
    fi

    if [ -n "$INSTALLED_VERSION" ] && [ "$INSTALLED_VERSION" != "none" ]; then
        local OLD_APP_NAME="hiretrack-$INSTALLED_VERSION"
        local PARENT_COMM
        PARENT_COMM=$(ps -o comm= -p "$PPID" 2>/dev/null | xargs basename 2>/dev/null || true)
        if [ -n "$PARENT_COMM" ] && [ "$PARENT_COMM" = "node" ]; then
            log "[ WARNING ] Skipping PM2 stop (installer likely started from app). npm install may use more memory."
        else
            stop_pm2_for_dependency_install "$OLD_APP_NAME" log
        fi
    fi

    if ! clean_npm_install "$APP_INSTALL_DIR"; then
        log "[ ERROR ] npm install failed."
        rm -f "$TMP_FILE" >/dev/null 2>&1 || true
        rollback
        return 1
    fi
    write_env_server_details
    ensure_markdown_parser_service
    check_pm2

    log "[ START ] Restarting PM2 process..."
    export PM2_HOME="$HOME/.pm2"

    pm2_delete_other_hiretrack_processes "$APP_NAME_WITH_VERSION"

    if ! pm2_ensure_hiretrack_process "$APP_NAME_WITH_VERSION" "$APP_INSTALL_DIR"; then
        log "[ ERROR ] Failed to start PM2 process for $APP_NAME_WITH_VERSION. Rolling back..."
        rm -f "$TMP_FILE" >/dev/null 2>&1 || true
        rollback
        return 1
    fi

    if [ "$NORMALIZED_INSTALLED" != "none" ]; then
        log "[ PACKAGE ] Running migrations from $NORMALIZED_INSTALLED to $NORMALIZED_LATEST..."
        run_migrations "$NORMALIZED_INSTALLED" "$NORMALIZED_LATEST" || {
            log "[ ERROR ] Migrations failed. Rolling back..."
            rm -f "$TMP_FILE" >/dev/null 2>&1 || true
            rollback
            return 1
        }
    fi
    
    rm -f "$TMP_FILE" >/dev/null 2>&1 || true
    log "[ CLEAN ] Cleaned up temporary download file"
    log "[ OK ] Successfully installed/updated to $VERSION_NAME at $APP_INSTALL_DIR"
    write_config "installedVersion" "$VERSION_NAME"

    if [ -n "$INSTALLED_VERSION" ] && [ "$INSTALLED_VERSION" != "none" ]; then
        pm2 delete "hiretrack-$INSTALLED_VERSION" >/dev/null 2>&1 || true
    fi
}

run_migrations() {
    set +u

    local CURRENT_VERSION="${1:-none}"
    local TARGET_VERSION="${2:-none}"

    if [ "$CURRENT_VERSION" = "none" ]; then
        echo "[ OK ] No migrations needed for fresh install." | tee -a "$LOG_DIR/migration.log"
        return 0
    fi

    echo "[ PACKAGE ] Fetching migrations for $TARGET_VERSION from GitHub Releases..." | tee -a "$LOG_DIR/migration.log"

    mkdir -p "$TMP_INSTALL_DIR" "$APP_INSTALL_DIR" "$LOG_DIR" >/dev/null 2>&1 || true

    local RELEASE MIG_URL TMP_MIG
    RELEASE=$(fetch_github_release_json "$TARGET_VERSION") || {
        echo "[ WARNING ] Could not read GitHub release for $TARGET_VERSION - skipping migrations." | tee -a "$LOG_DIR/migration.log"
        return 0
    }
    MIG_URL=$(github_asset_url "$RELEASE" "migrationScriptUrl.cjs")
    if [ -z "$MIG_URL" ]; then
        echo "[ OK ] No migration script attached to this release." | tee -a "$LOG_DIR/migration.log"
        return 0
    fi

    TMP_MIG="$TMP_INSTALL_DIR/migrationScriptUrl.cjs"
    if ! download_url_to_file "$MIG_URL" "$TMP_MIG" 3 120 0; then
        echo "[ WARNING ] Failed to download migration script - skipping migrations." | tee -a "$LOG_DIR/migration.log"
        return 0
    fi

    echo "------------------------------------------------------" | tee -a "$LOG_DIR/migration.log"
    echo "[ NEW ] Running migration script for $TARGET_VERSION" | tee -a "$LOG_DIR/migration.log"
    (
        cd "$APP_INSTALL_DIR" 2>/dev/null || true
        [ -f ".env" ] && export $(grep -v '^#' .env | xargs) >/dev/null 2>&1
        echo "[ DIR ] Using NODE_PATH=$APP_INSTALL_DIR/node_modules" | tee -a "$LOG_DIR/migration.log"
        NODE_PATH="$APP_INSTALL_DIR/node_modules" node "$TMP_MIG" >> "$LOG_DIR/migration.log" 2>&1 || true
    )
    rm -f "$TMP_MIG" >/dev/null 2>&1 || true
    echo "[ OK ] Migration processed (see migration.log for details)." | tee -a "$LOG_DIR/migration.log"
}

create_snapshot_script() {
    local HIRETRACK_DIR="$HOME/.hiretrack"
    local SNAPSHOT_FILE="$HIRETRACK_DIR/take-snapshot.js"

    echo "[ SCRIPT ] Creating take-snapshot.js in $HIRETRACK_DIR ..."

    mkdir -p "$HIRETRACK_DIR"

    cat > "$SNAPSHOT_FILE" <<'EOF'
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const configPath = path.join(__dirname, 'config.json');
if (!fs.existsSync(configPath)) {
  console.error('[ ERROR ] config.json not found.');
  process.exit(1);
}

const config = require(configPath);
const { dbUrl } = config;

if (!dbUrl) {
  console.error('[ ERROR ] Database URL (dbUrl) missing in config.json.');
  process.exit(1);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const dumpDir = path.join('/tmp', `mongo-dump-${timestamp}`);
const backupDir = path.join(__dirname, 'backups');
const tarFile = path.join(backupDir, `backup-${timestamp}.tar.gz`);

fs.mkdirSync(backupDir, { recursive: true });

const dumpCmd = `mongodump --uri="${dbUrl}" --out="${dumpDir}"`;
const compressCmd = `tar -czf "${tarFile}" -C "${dumpDir}" .`;
const cleanupCmd = `rm -rf "${dumpDir}"`;

console.log('[ SCRIPT ] Starting MongoDB backup...');
console.log(`[ LINK ] DB URL: ${dbUrl}`);
console.log(`[ DIR ] Backup Path: ${tarFile}`);
console.log('----------------------------------');

exec(`${dumpCmd} && ${compressCmd} && ${cleanupCmd}`, (error, stdout, stderr) => {
  if (error) {
    console.error(`[ ERROR ] Backup failed: ${error.message}`);
    return;
  }
  if (stderr && !stderr.includes('warning')) {
    console.error(`[ WARNING ] stderr: ${stderr}`);
  }
  console.log(`[ OK ] Backup successful! Archive created at: ${tarFile}`);
});
EOF

    chmod +x "$SNAPSHOT_FILE"
    echo "[ OK ] take-snapshot.js created and made executable."
}

run_backup() {
    local ROOT_DIR="$HOME"
    local MYAPP_DIR="$HOME/.hiretrack"
    local BACKUP_DIR="$ROOT_DIR/hiretrack-backup"
    local BACKUP_FILE="$BACKUP_DIR/hiretrack_backup.tar.gz"

    log_backup() {
        echo "[ $(date +"%Y-%m-%d %H:%M:%S") ] $1"
    }

    install_mongodump_backup() {
        log_backup "[ SYSTEM ] Installing MongoDB Database Tools (includes mongodump)..."
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            if command -v apt-get >/dev/null 2>&1; then
                sudo apt-get update -y
                sudo apt-get install -y mongodb-database-tools
            elif command -v yum >/dev/null 2>&1; then
                sudo yum install -y mongodb-database-tools
            else
                log_backup "[ ERROR ] Unsupported Linux package manager. Please install mongodump manually."
                return 1
            fi
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            if command -v brew >/dev/null 2>&1; then
                brew tap mongodb/brew
                brew install mongodb-database-tools
            else
                log_backup "[ ERROR ] Homebrew not found. Please install Homebrew or install mongodump manually."
                return 1
            fi
        else
            log_backup "[ ERROR ] Unsupported OS. Please install mongodump manually."
            return 1
        fi
        if ! command -v mongodump >/dev/null 2>&1; then
            log_backup "[ ERROR ] Installation failed - mongodump still not found."
            return 1
        fi
        log_backup "[ OK ] mongodump installed successfully!"
    }

    if [ ! -d "$MYAPP_DIR" ]; then
        log_backup "[ ERROR ] .hiretrack directory not found at $MYAPP_DIR"
        return 1
    fi

    if ! command -v mongodump >/dev/null 2>&1; then
        log_backup "[ WARNING ] mongodump not found. Attempting to install..."
        install_mongodump_backup || return 1
    else
        log_backup "[ OK ] mongodump found: $(mongodump --version 2>/dev/null | head -n 1 || echo 'available')"
    fi

    log_backup "[ START ] Starting backup process..."
    mkdir -p "$BACKUP_DIR"

    local SNAPSHOT_FILE="$MYAPP_DIR/take-snapshot.js"
    log_backup "[ SEARCH ] Checking for take-snapshot.js in $MYAPP_DIR..."
    if [ ! -f "$SNAPSHOT_FILE" ]; then
        log_backup "[ ERROR ] take-snapshot.js not found in $MYAPP_DIR"
        return 1
    fi

    pushd "$MYAPP_DIR" > /dev/null || return 1
    log_backup "[ RUN ] Running snapshot script..."
    if ! command -v node >/dev/null 2>&1; then
        log_backup "[ ERROR ] node runtime not found in PATH"
        popd > /dev/null || true
        return 1
    fi
    if ! node take-snapshot.js; then
        log_backup "[ ERROR ] take-snapshot.js failed"
        popd > /dev/null || true
        return 1
    fi
    popd > /dev/null || true
    log_backup "[ OK ] Snapshot script completed successfully"

    if [ -f "$BACKUP_FILE" ]; then
        log_backup "[ DELETE ] Removing old backup file..."
        rm -f "$BACKUP_FILE"
    fi

    log_backup "[ PACKAGE ] Creating backup of APP dir only (excluding node_modules)..."
    tar --exclude='APP/node_modules' -czf "$BACKUP_FILE" -C "$MYAPP_DIR" "APP" || return 1

    log_backup "[ OK ] Backup created successfully!"
    log_backup "[ DIR ] Backup file: $BACKUP_FILE"
    log_backup "[ DONE ] Done!"
}

setup_nginx() {
    echo "[ START ] Running Nginx setup ..."
    echo "[ INFO ] Authenticating sudo once for the entire setup..."
    sudo -v

    cat <<'NGINXEOF' | bash -s
	#!/bin/bash
	set -euo pipefail

	echo "[ START ] Starting Nginx Setup..."

	CONFIG_PATH="$HOME/.hiretrack/config.json"
	APP_INSTALL_DIR="$HOME/.hiretrack/APP"
	APP_PORT="${APP_PORT:-3000}"
	NGINX_BACKUP_DIR="$HOME/.hiretrack/nginx-backups"
	NGINX_CONF_DIR="/etc/nginx/sites-available"
	NGINX_ENABLED_DIR="/etc/nginx/sites-enabled"

	DOMAIN_NAME=""
	EMAIL=""

	OS_TYPE=$(uname | tr '[:upper:]' '[:lower:]')
	echo "[ OS ] Detected OS: $OS_TYPE"

	if [[ "$OS_TYPE" == "darwin" ]]; then
	    NGINX_CONF_DIR="/usr/local/etc/nginx/servers"
	    NGINX_ENABLED_DIR=""
	    LOG_DIR="/usr/local/var/log/nginx"
	else
	    LOG_DIR="/var/log/nginx"
	fi

	mkdir -p "$NGINX_BACKUP_DIR"
	mkdir -p "$LOG_DIR" 2>/dev/null || sudo mkdir -p "$LOG_DIR"

	check_dep() {
	    local CMD=$1
	    if ! command -v "$CMD" >/dev/null 2>&1; then
		echo "[ WARNING ] $CMD not found. Installing..."
		if command -v apt-get >/dev/null 2>&1; then
		    sudo apt-get update
		    sudo apt-get install -y "$CMD"
		elif command -v yum >/dev/null 2>&1; then
		    sudo yum install -y "$CMD"
		elif [[ "$OS_TYPE" == "darwin" ]] && command -v brew >/dev/null 2>&1; then
		    brew install "$CMD"
		else
		    echo "[ ERROR ] Cannot install $CMD automatically. Please install it manually."
		    exit 1
		fi
	    fi
	    echo "[ OK ] $CMD is available."
	}

	check_dep curl
	check_dep jq

	prompt_for_domain() {
	    echo ""
	    echo "================================================"
	    echo "Domain Configuration"
	    echo "================================================"
	    echo ""
	    echo "Please enter the domain name for your HireTrack instance."
	    echo "Examples:"
	    echo "  - release.hiretrack.in"
	    echo "  - demo.yourcompany.com"
	    echo "  - localhost (for local testing only)"
	    echo ""

	    while true; do
		read -p "Enter domain name: " DOMAIN_NAME </dev/tty
		DOMAIN_NAME=$(echo "$DOMAIN_NAME" | xargs)

		if [ -z "$DOMAIN_NAME" ]; then
		    echo "[ ERROR ] Domain name cannot be empty. Please try again."
		    echo ""
		    continue
		fi

		if [[ "$DOMAIN_NAME" == "localhost" ]]; then
		    echo "[ WARNING ] Using localhost (HTTP only, no SSL)"
		    break
		elif echo "$DOMAIN_NAME" | grep -qE '^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$'; then
		    echo "[ OK ] Domain accepted: $DOMAIN_NAME"
		    break
		else
		    echo "[ ERROR ] Invalid domain format. Please use a valid domain like 'release.hiretrack.in'"
		    echo ""
		fi
	    done

	    echo ""
	    echo "[ INFO ] Domain Summary:"
	    echo "   Domain: $DOMAIN_NAME"
	    echo ""
	    read -p "Is this correct? (Y/n): " CONFIRM </dev/tty

	    if [[ "$CONFIRM" =~ ^[Nn]$ ]]; then
		echo "[ ERROR ] Aborted. Please run the script again."
		exit 1
	    fi

	    echo ""
	    echo "[ OK ] Domain confirmed: $DOMAIN_NAME"
	}

	prompt_for_email() {
	    if [ -f "$CONFIG_PATH" ]; then
		EMAIL=$(jq -r '.email // empty' "$CONFIG_PATH" 2>/dev/null || echo "")
	    fi

	    if [ -n "$EMAIL" ]; then
		echo "[ OK ] Using email from config: $EMAIL"
		return
	    fi

	    echo ""
	    echo "[ INFO ] Email is required for SSL certificate registration (Let's Encrypt)"
	    echo ""

	    while true; do
		read -p "Enter your email address: " EMAIL </dev/tty
		EMAIL=$(echo "$EMAIL" | xargs)

		if [ -z "$EMAIL" ]; then
		    echo "[ ERROR ] Email cannot be empty."
		    continue
		elif echo "$EMAIL" | grep -qE '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'; then  
		    echo "[ OK ] Email accepted: $EMAIL"
		    break
		else
		    echo "[ ERROR ] Invalid email format. Please try again."
		fi
	    done
	}

	save_domain_to_config() {
	    if [ -f "$CONFIG_PATH" ]; then
		local TEMP_FILE
		TEMP_FILE=$(mktemp)
		jq --arg domain "$DOMAIN_NAME" '.serverName=$domain' "$CONFIG_PATH" > "$TEMP_FILE"      
		mv "$TEMP_FILE" "$CONFIG_PATH"
		echo "[ OK ] Domain saved to config: $CONFIG_PATH"
	    else
		mkdir -p "$(dirname "$CONFIG_PATH")"
		echo "{\"serverName\": \"$DOMAIN_NAME\", \"email\": \"$EMAIL\"}" > "$CONFIG_PATH"        
		echo "[ OK ] Config created with domain and email: $CONFIG_PATH"
	    fi
	}

	write_env_server_details() {
	    local ENV_FILE="$APP_INSTALL_DIR/.env"
	    mkdir -p "$APP_INSTALL_DIR"

	    local SERVER_NAME
	    SERVER_NAME=$(jq -r '.serverName // empty' "$CONFIG_PATH")

	    if [ -z "$SERVER_NAME" ] || [ "$SERVER_NAME" = "null" ]; then
		echo "[ WARNING ] serverName not found in $CONFIG_PATH"
		return 0
	    fi

	    local BASE_URL
	    if [[ "$SERVER_NAME" =~ ^(localhost|127\.0\.0\.1)$ ]]; then
		BASE_URL="http://$SERVER_NAME:3000"
	    elif [[ "$SERVER_NAME" =~ ^https?:// ]]; then
		BASE_URL="$SERVER_NAME"
	    else
		BASE_URL="https://$SERVER_NAME"
	    fi

	    if [ -f "$ENV_FILE" ]; then
		grep -v "^BASE_URL=" "$ENV_FILE" | grep -v "^NEXT_PUBLIC_BASE_URL=" | grep -v "^ALLOWED_ORIGINS=" | grep -v "^GITHUB_RELEASE_REPO=" > "${ENV_FILE}.tmp" || true
	    else
		touch "${ENV_FILE}.tmp"
	    fi

	    echo "BASE_URL=$BASE_URL" >> "${ENV_FILE}.tmp"
	    echo "NEXT_PUBLIC_BASE_URL=$BASE_URL" >> "${ENV_FILE}.tmp"
	    echo "ALLOWED_ORIGINS=$BASE_URL" >> "${ENV_FILE}.tmp"
	    echo "GITHUB_RELEASE_REPO=${GITHUB_RELEASE_REPO:-$DEFAULT_GITHUB_RELEASE_REPO}" >> "${ENV_FILE}.tmp"
	    mv "${ENV_FILE}.tmp" "$ENV_FILE"

	    echo "[ OK ] BASE_URL and NEXT_PUBLIC_BASE_URL updated in $ENV_FILE ($BASE_URL)"
	}

	check_dns_resolution() {
	    if [ "$DOMAIN_NAME" == "localhost" ]; then
		return 0
	    fi

	    echo ""
	    echo "[ SEARCH ] Checking DNS resolution for $DOMAIN_NAME..."

	    local DNS_IP
	    DNS_IP=$(host "$DOMAIN_NAME" 2>/dev/null | grep "has address" | head -n1 | awk '{print $NF}')

	    if [ -z "$DNS_IP" ]; then
		DNS_IP=$(nslookup "$DOMAIN_NAME" 2>/dev/null | grep "Address:" | tail -n1 | awk '{print $NF}')
	    fi

	    if [ -n "$DNS_IP" ]; then
		echo "[ OK ] Domain resolves to: $DNS_IP"
		local SERVER_IP
		SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s icanhazip.com 2>/dev/null || echo "unknown")

		if [ "$SERVER_IP" != "unknown" ]; then
		    echo "   Server's public IP: $SERVER_IP"
		    if [ "$DNS_IP" == "$SERVER_IP" ]; then
			echo "   [ OK ] DNS points to this server!"
		    else
			echo "   [ WARNING ] DNS ($DNS_IP) does not point to this server ($SERVER_IP)" 
			echo "   SSL certificate generation may fail."
			echo ""
			read -p "Continue anyway? (y/N): " CONTINUE </dev/tty
			if [[ ! "$CONTINUE" =~ ^[Yy]$ ]]; then
			    echo "[ ERROR ] Aborted. Please update your DNS records first."
			    exit 1
			fi
		    fi
		fi
	    else
		echo "[ WARNING ] Cannot resolve $DOMAIN_NAME"
		echo "   Please ensure DNS is configured correctly."
		echo "   Your domain must point to this server's IP address."
		echo ""
		read -p "Continue anyway? (y/N): " CONTINUE </dev/tty
		if [[ ! "$CONTINUE" =~ ^[Yy]$ ]]; then
		    echo "[ ERROR ] Aborted. Please configure DNS first."
		    exit 1
		fi
	    fi
	}

	check_application() {
	    echo ""
	    echo "[ SEARCH ] Checking if application is running on port $APP_PORT..."
	    if ! lsof -Pi :$APP_PORT -sTCP:LISTEN -t >/dev/null 2>&1 && ! netstat -an 2>/dev/null | grep -q ":$APP_PORT.*LISTEN"; then
		echo "[ WARNING ] No service detected on port $APP_PORT"
		echo "Please ensure your HireTrack application is running before continuing."
		read -p "Continue anyway? (y/N): " CONTINUE </dev/tty
		if [[ ! "$CONTINUE" =~ ^[Yy]$ ]]; then
		    echo "[ ERROR ] Aborted. Please start your application first with:"
		    echo "   pm2 list  # Check running apps"
		    exit 1
		fi
	    else
		echo "[ OK ] Application is running on port $APP_PORT"
	    fi
	}

	install_nginx() {
	    if command -v nginx >/dev/null 2>&1 || [ -x /usr/sbin/nginx ]; then
		echo "[ OK ] Nginx already installed"
		return 0
	    fi

	    echo ""
	    echo "[ PACKAGE ] Installing Nginx..."
	    if [[ "$OS_TYPE" == "linux" ]]; then
		if command -v apt-get >/dev/null 2>&1; then
		    sudo apt-get update
		    sudo apt-get install -y nginx
		elif command -v yum >/dev/null 2>&1; then
		    sudo yum install -y epel-release
		    sudo yum install -y nginx
		else
		    echo "[ ERROR ] Unsupported Linux package manager. Install Nginx manually."
		    exit 1
		fi
	    elif [[ "$OS_TYPE" == "darwin" ]]; then
		if ! command -v brew >/dev/null 2>&1; then
		    echo "[ ERROR ] Homebrew not found. Install Homebrew first from https://brew.sh"
		    exit 1
		fi
		brew install nginx
	    else
		echo "[ ERROR ] Unsupported OS: $OS_TYPE"
		exit 1
	    fi

	    if ! command -v nginx >/dev/null 2>&1 && [ ! -x /usr/sbin/nginx ]; then
		echo "[ ERROR ] Nginx installation failed."
		exit 1
	    fi

	    echo "[ OK ] Nginx installed successfully."
	}

	start_nginx() {
	    echo ""
	    echo "[ RUN ] Starting Nginx service..."

	    if [[ "$OS_TYPE" == "linux" ]]; then
		sudo systemctl start nginx 2>/dev/null || true
		sudo systemctl enable nginx 2>/dev/null || true
	    elif [[ "$OS_TYPE" == "darwin" ]]; then
		if ! grep -q "include.*servers/\*" /usr/local/etc/nginx/nginx.conf 2>/dev/null; then    
		    echo "[ NGINX ] Configuring Nginx to include servers directory..."
		    sudo sed -i '' '/http {/a\
    include /usr/local/etc/nginx/servers/*;
' /usr/local/etc/nginx/nginx.conf 2>/dev/null || {
			echo "[ WARNING ] Please manually add this line to /usr/local/etc/nginx/nginx.conf:"    
			echo "   include /usr/local/etc/nginx/servers/*;"
			echo "   (inside the http {} block)"
		    }
		fi
		brew services start nginx >/dev/null 2>&1
	    fi

	    sleep 2

	    if pgrep -x "nginx" >/dev/null; then
		echo "[ OK ] Nginx is running"
	    else
		echo "[ ERROR ] Nginx failed to start. Checking for errors..."
		sudo nginx -t
		exit 1
	    fi
	}

	setup_ssl_certificate() {
	    local USE_HTTPS="false"
	    local CERT_PATH="/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem"
	    local KEY_PATH="/etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem"

	    echo ""
	    echo "[ SSL ] Setting up SSL Certificate for $DOMAIN_NAME..."

	    if [ "$DOMAIN_NAME" == "localhost" ]; then
		echo "[ WARNING ] Localhost detected. Skipping SSL setup (will use HTTP only)."
		echo "false"
		return
	    fi

	    echo "[ PACKAGE ] Installing certbot for Let's Encrypt..."
	    if ! command -v certbot >/dev/null 2>&1; then
		if command -v snap >/dev/null 2>&1; then
		    echo "Installing certbot via snap..."
		    sudo snap install --classic certbot 2>/dev/null || true
		    sudo ln -sf /snap/bin/certbot /usr/bin/certbot 2>/dev/null || true
		elif command -v apt-get >/dev/null 2>&1; then
		    sudo apt-get update
		    sudo apt-get install -y certbot python3-certbot-nginx
		elif command -v yum >/dev/null 2>&1; then
		    sudo yum install -y certbot python3-certbot-nginx
		else
		    echo "[ ERROR ] Cannot install certbot automatically."
		    echo "Please install certbot manually: https://certbot.eff.org/"
		    USE_HTTPS="false"
		    echo "$USE_HTTPS"
		    return
		fi
	    fi

	    if ! command -v certbot >/dev/null 2>&1; then
		echo "[ ERROR ] Certbot installation failed. Using HTTP only."
		USE_HTTPS="false"
		echo "$USE_HTTPS"
		return
	    fi

	    echo "[ OK ] Certbot is ready"

	    echo ""
	    echo "[ SEARCH ] Pre-flight checks for SSL certificate..."
	    echo "   1. Domain: $DOMAIN_NAME"
	    echo "   2. Email: $EMAIL"

	    echo "   3. Checking if port 80 is accessible..."
	    if sudo netstat -tlnp 2>/dev/null | grep -q ":80" || sudo lsof -i :80 2>/dev/null | grep -q nginx; then
		echo "   [ OK ] Port 80 is accessible"
	    else
		echo "   [ WARNING ] Port 80 may not be accessible (needed for Let's Encrypt verification)"      
	    fi

	    echo ""
	    echo "[ SSL ] Obtaining/renewing Let's Encrypt certificate for $DOMAIN_NAME..."
	    echo ""
	    echo "This will:"
	    echo "  - Verify domain ownership via HTTP-01 challenge"
	    echo "  - Install certificates at /etc/letsencrypt/live/$DOMAIN_NAME/"
	    echo "  - Setup auto-renewal via certbot timer"
	    echo ""
	    read -p "Proceed with SSL certificate generation/renewal? (Y/n): " PROCEED_SSL </dev/tty

	    if [[ "$PROCEED_SSL" =~ ^[Nn]$ ]]; then
		echo "[ WARNING ] Skipping SSL setup. Using HTTP only."
		USE_HTTPS="false"
		echo "$USE_HTTPS"
		return
	    fi

	    echo "   [ WAIT ] Obtaining certificate (this may take a moment)..."
        sudo rm -f "/tmp/certbot_$DOMAIN_NAME.log"
	    if sudo certbot certonly \
		--standalone \
		--non-interactive \
		--agree-tos \
		--quiet \
		--email "$EMAIL" \
		--preferred-challenges http \
		-d "$DOMAIN_NAME" \
		--pre-hook "systemctl stop nginx 2>/dev/null || true" \
		--post-hook "systemctl start nginx 2>/dev/null || true" >/tmp/certbot_$DOMAIN_NAME.log 2>&1; then

		USE_HTTPS="true"
		echo ""
		echo "[ OK ] Successfully obtained/renewed Let's Encrypt certificate for $DOMAIN_NAME!"      
		echo "   Certificate: $CERT_PATH"
		echo "   Private Key: $KEY_PATH"
		echo "   Auto-renewal is configured via certbot timer."
	    else
		echo ""
		echo "[ ERROR ] Failed to obtain/renew Let's Encrypt certificate for $DOMAIN_NAME."
		echo ""
		echo "Common issues:"
		echo "  1. Domain '$DOMAIN_NAME' doesn't point to this server"
		echo "  2. Firewall blocking port 80/443"
		echo "  3. Another service using port 80"
		echo ""
		echo "Check logs at: /tmp/certbot_$DOMAIN_NAME.log"
		echo ""

		read -p "Proceed with HTTP only? (Y/n): " PROCEED_HTTP </dev/tty
		if [[ "$PROCEED_HTTP" =~ ^[Nn]$ ]]; then
		    echo "[ ERROR ] Aborting. Please fix DNS/firewall issues and try again."
		    exit 1
		fi

		echo "[ WARNING ] Proceeding with HTTP only for $DOMAIN_NAME."
		echo "   You can add HTTPS later with:"
		echo "   sudo certbot certonly --nginx -d $DOMAIN_NAME"
		USE_HTTPS="false"
	    fi

	    echo "$USE_HTTPS"
	}

	configure_nginx() {
	    local USE_HTTPS="$1"
	    local NGINX_CONF_FILE
	    local CERT_PATH="/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem"
	    local KEY_PATH="/etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem"

	    echo ""
	    echo "[ NGINX ] Configuring Nginx for $DOMAIN_NAME..."

	    if [[ "$OS_TYPE" == "linux" ]]; then
		NGINX_CONF_FILE="$NGINX_CONF_DIR/$DOMAIN_NAME"
		NGINX_ENABLED_FILE="$NGINX_ENABLED_DIR/$DOMAIN_NAME"
	    elif [[ "$OS_TYPE" == "darwin" ]]; then
		NGINX_CONF_FILE="$NGINX_CONF_DIR/$DOMAIN_NAME"
		mkdir -p "$NGINX_CONF_DIR"
	    fi

	    if [ -f "$NGINX_CONF_FILE" ]; then
		local BACKUP_FILE="$NGINX_BACKUP_DIR/$DOMAIN_NAME.backup.$(date +%s)"
		cp "$NGINX_CONF_FILE" "$BACKUP_FILE"
		echo "[ PACKAGE ] Backed up existing config to: $BACKUP_FILE"
	    fi

	    local NGINX_CONF_CONTENT=$(cat <<INNEREOF
# HireTrack Nginx Configuration
# Generated on: $(date)
# Domain: $DOMAIN_NAME
# Port: $APP_PORT

server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN_NAME;

    $( [ "$USE_HTTPS" = "true" ] && echo "return 301 https://\$server_name\$request_uri;" || echo "" )

    client_max_body_size 500M;
    chunked_transfer_encoding on;
    send_timeout 600s;

    proxy_buffer_size 256k;
    proxy_buffers 8 256k;
    proxy_busy_buffers_size 512k;
    large_client_header_buffers 4 16k;

    error_page 502 /502.html;
    location = /502.html{
        root /etc/nginx/error_pages;
        internal;
    }

    location / {
        proxy_pass http://localhost:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_buffering off;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    location /assets {
        proxy_pass http://localhost:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_buffering off;
        gzip off;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    error_log $LOG_DIR/${DOMAIN_NAME}.error.log;
    access_log $LOG_DIR/${DOMAIN_NAME}.access.log;
}
INNEREOF
)

	    if [ "$DOMAIN_NAME" != "localhost" ]; then
		NGINX_CONF_CONTENT+=$(cat <<INNEREOF

# HTTPS server block
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name $DOMAIN_NAME;

    client_max_body_size 500M;
    chunked_transfer_encoding on;
    send_timeout 600s;

    ssl_certificate $CERT_PATH;
    ssl_certificate_key $KEY_PATH;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;
    add_header Strict-Transport-Security "max-age=63072000; includeSubdomains; preload";

    proxy_buffer_size 256k;
    proxy_buffers 8 256k;
    proxy_busy_buffers_size 512k;
    large_client_header_buffers 4 16k;
    
    error_page 502 /502.html;
    location = /502.html {
        root /etc/nginx/error_pages;
        internal;
    }

    location / {
        proxy_pass http://localhost:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_buffering off;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    location /assets {
        proxy_pass http://localhost:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_buffering off;
        gzip off;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    error_log $LOG_DIR/${DOMAIN_NAME}.error.log;
    access_log $LOG_DIR/${DOMAIN_NAME}.access.log;
}
INNEREOF
)
	    fi

	    echo "$NGINX_CONF_CONTENT" | sudo tee "$NGINX_CONF_FILE" >/dev/null
	    echo "[ OK ] Configuration written to: $NGINX_CONF_FILE"

	    if [[ "$OS_TYPE" == "linux" ]]; then
		if [ ! -L "$NGINX_ENABLED_FILE" ]; then
		    sudo ln -sf "$NGINX_CONF_FILE" "$NGINX_ENABLED_FILE"
		    echo "[ OK ] Site enabled at: $NGINX_ENABLED_FILE"
		fi
	    fi

	    echo ""
	    echo "[ INFO ] Testing Nginx configuration..."
	    if sudo nginx -t >/dev/null 2>&1; then
		echo "[ OK ] Configuration test passed!"
	    else
		echo "[ ERROR ] Configuration test failed!"
		sudo nginx -t
		echo "[ ERROR ] Configuration test failed!"
		echo ""
		echo "Rolling back to previous configuration..."
		if [ -f "$NGINX_BACKUP_DIR/$DOMAIN_NAME.backup."* ]; then
		    local LATEST_BACKUP=$(ls -t "$NGINX_BACKUP_DIR"/$DOMAIN_NAME.backup.* 2>/dev/null | head -n1)
		    if [ -n "$LATEST_BACKUP" ]; then
			cp "$LATEST_BACKUP" "$NGINX_CONF_FILE"
			echo "[ OK ] Rolled back to: $LATEST_BACKUP"
		    fi
		fi
		exit 1
	    fi

	    echo ""
	    echo "[ RESTART ] Reloading Nginx..."
	    if [[ "$OS_TYPE" == "linux" ]]; then
		sudo systemctl reload nginx >/dev/null 2>&1
	    elif [[ "$OS_TYPE" == "darwin" ]]; then
		brew services restart nginx >/dev/null 2>&1
	    fi

	    sleep 2

	    if pgrep -x "nginx" >/dev/null; then
		echo "[ OK ] Nginx reloaded successfully!"
	    else
		echo "[ ERROR ] Nginx failed to reload!"
		exit 1
	    fi
	}

	verify_setup() {
	    local USE_HTTPS="$1"

	    echo ""
	    echo "[ SEARCH ] Verifying setup for $DOMAIN_NAME..."

	    if pgrep -x "nginx" >/dev/null; then
		echo "[ OK ] Nginx process is running"
	    else
		echo "[ ERROR ] Nginx process not found"
		return 1
	    fi

	    echo ""
	    echo "Testing HTTP connection to $DOMAIN_NAME..."
	    local HTTP_CODE
	    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost" -H "Host: $DOMAIN_NAME" 2>/dev/null || echo "000")

	    if [[ "$HTTP_CODE" =~ ^(200|301|302|404)$ ]]; then
		echo "[ OK ] HTTP connection successful (Status: $HTTP_CODE)"
	    else
		echo "[ WARNING ] HTTP connection returned status: $HTTP_CODE"
	    fi

	    if [ "$USE_HTTPS" = "true" ] || [ "$DOMAIN_NAME" != "localhost" ]; then
		echo ""
		echo "Testing HTTPS connection to $DOMAIN_NAME..."
		local HTTPS_CODE
		HTTPS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN_NAME" --insecure 2>/dev/null || echo "000")

		if [[ "$HTTPS_CODE" =~ ^(200|301|302|404)$ ]]; then
		    echo "[ OK ] HTTPS connection successful (Status: $HTTPS_CODE)"
		else
		    echo "[ WARNING ] HTTPS connection returned status: $HTTPS_CODE"
		fi
	    fi

	    echo ""
	    echo "[ INFO ] Log files for $DOMAIN_NAME:"
	    echo "   - Error log:  $LOG_DIR/${DOMAIN_NAME}.error.log"
	    echo "   - Access log: $LOG_DIR/${DOMAIN_NAME}.access.log"

	    if [ -f "$LOG_DIR/${DOMAIN_NAME}.error.log" ]; then
		local ERROR_COUNT
		ERROR_COUNT=$(sudo tail -n 50 "$LOG_DIR/${DOMAIN_NAME}.error.log" 2>/dev/null | grep -c "error" || echo "0")
		if [ "$ERROR_COUNT" -gt 0 ] 2>/dev/null; then
		    echo "   [ WARNING ] Found $ERROR_COUNT recent errors. Check logs with:"
		    echo "      sudo tail -f $LOG_DIR/${DOMAIN_NAME}.error.log"
		fi
	    fi
	}

	print_summary() {
	    local USE_HTTPS="$1"

	    echo ""
	    echo "================================================"
	    echo "[ OK ] Nginx Setup Complete!"
	    echo "================================================"
	    echo ""
	    echo "[ INFO ] Configuration Summary:"
	    echo "   - Domain Name: $DOMAIN_NAME"
	    echo "   - Application Port: $APP_PORT"
	    echo "   - Protocol: $( [ "$USE_HTTPS" = "true" ] || [ "$DOMAIN_NAME" != "localhost" ] && echo "HTTP & HTTPS" || echo "HTTP only")"
	    echo ""

	    if [ "$USE_HTTPS" = "true" ] || [ "$DOMAIN_NAME" != "localhost" ]; then
		echo "[ SSL ] SSL/TLS:"
		echo "   - Certificate: /etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem"
		echo "   - Auto-renewal: Enabled (certbot timer)"
		echo "   - Test renewal: sudo certbot renew --dry-run"
		echo ""
	    fi

	    echo "[ NET ] Access your application:"
	    if [ "$USE_HTTPS" = "true" ] || [ "$DOMAIN_NAME" != "localhost" ]; then
		echo "   - https://$DOMAIN_NAME"
		echo "   - http://$DOMAIN_NAME (redirects to HTTPS)"
	    else
		echo "   - http://$DOMAIN_NAME"
	    fi
	    echo ""

	    echo "[ NGINX ] Nginx Commands:"
	    if [[ "$OS_TYPE" == "linux" ]]; then
		echo "   - Test config:   sudo nginx -t"
		echo "   - Reload:        sudo systemctl reload nginx"
		echo "   - Restart:       sudo systemctl restart nginx"
		echo "   - Status:        sudo systemctl status nginx"
		echo "   - Logs:          sudo journalctl -u nginx -f"
	    elif [[ "$OS_TYPE" == "darwin" ]]; then
		echo "   - Test config:   sudo nginx -t"
		echo "   - Reload:        brew services restart nginx"
		echo "   - Status:        brew services list | grep nginx"
		echo "   - Logs:          tail -f $LOG_DIR/${DOMAIN_NAME}.error.log"
	    fi
	    echo ""

	    echo "[ DIR ] Files:"
	    echo "   - Config:  $( [ "$OS_TYPE" == "linux" ] && echo "$NGINX_CONF_DIR/$DOMAIN_NAME" || echo "$NGINX_CONF_DIR/$DOMAIN_NAME")"
	    echo "   - Backups: $NGINX_BACKUP_DIR/"
	    echo "   - Logs:    $LOG_DIR/"
	    echo ""

	    if [ "$USE_HTTPS" = "false" ] && [ "$DOMAIN_NAME" != "localhost" ]; then
		echo "[ SSL ] To add HTTPS later:"
		echo "   1. Ensure DNS points to this server"
		echo "   2. Run: sudo certbot certonly --nginx -d $DOMAIN_NAME"
		echo "   3. Re-run this script or manually update Nginx config"
		echo ""
	    fi

	    echo ""
	    echo "================================================"
	    echo "  [ URL ] REGISTRATION URL"
	    echo "================================================"
	    echo ""
	    echo "You can register the first organization from the URL below:"
	    echo ""
	    echo "   ========================================================="
	    echo "   |                                                       |"
	    printf "   |  %-52s |\n" "https://$DOMAIN_NAME/register/org"
	    echo "   |                                                       |"
	    echo "   ========================================================="
	    echo ""
	    echo "================================================"
	}

	cleanup_on_error() {
	    echo ""
	    echo "[ ERROR ] Setup failed. Cleaning up..."

	    if [ -f "$NGINX_BACKUP_DIR/$DOMAIN_NAME.backup."* ]; then
		local LATEST_BACKUP=$(ls -t "$NGINX_BACKUP_DIR"/$DOMAIN_NAME.backup.* 2>/dev/null | head -n1)
		if [ -n "$LATEST_BACKUP" ]; then
		    echo "[ RESTART ] Restoring previous configuration..."
		    cp "$LATEST_BACKUP" "$NGINX_CONF_DIR/$DOMAIN_NAME" 2>/dev/null || true
		    sudo nginx -t && sudo systemctl reload nginx 2>/dev/null || brew services restart nginx 2>/dev/null
		fi
	    fi

	    echo "Please check the error messages above and try again."
	    exit 1
	}

	trap cleanup_on_error ERR

	main() {
	    echo "================================================"
	    echo "  HireTrack Nginx Setup Script"
	    echo "================================================"
	    echo ""

	    prompt_for_domain
	    prompt_for_email
	    save_domain_to_config
	    write_env_server_details
        
        echo ""
	    echo "🔒 Requesting administrative privileges..."
	    sudo -v </dev/tty

	    check_dns_resolution
	    check_application
	    install_nginx
	    start_nginx
	    local USE_HTTPS
	    USE_HTTPS=$(setup_ssl_certificate)
	    configure_nginx "$USE_HTTPS"
	    verify_setup "$USE_HTTPS"
	    print_summary "$USE_HTTPS"
	}

	main
NGINXEOF
    local NGINX_EXIT=$?
    if [ "$NGINX_EXIT" -ne 0 ]; then
        echo "[ ERROR ] Nginx setup failed. Check logs and try setting up the domain again by using the --domain command."
        exit 1
    fi
    echo "[ OK ] Nginx setup completed."

        echo "[ OK ] Nginx setup completed."
    write_env_server_details
}

# ------------------------------------------------
# Restart PM2 Service
# ------------------------------------------------
restart_pm2_service() {
    local MATCHING_PROCS
    local ECOSYSTEM_FILE=""

    echo "[ SEARCH ] Checking for existing hiretrack-* PM2 processes..."

    # Capture all running hiretrack-* processes (if any)
    MATCHING_PROCS=$(pm2 list 2>/dev/null | awk '/hiretrack-/ {print $4}' | tr -d '│')

    if [ -n "$MATCHING_PROCS" ]; then
        echo "[ RECYCLE ] Found running hiretrack processes:"
        echo "$MATCHING_PROCS" | sed 's/^/   * /'
        echo "[ RESTART ] Restarting all matching PM2 processes..."

        echo "$MATCHING_PROCS" | while read -r PROC; do
            [ -n "$PROC" ] && pm2 restart "$PROC" --update-env || echo "[ WARNING ] Failed to restart $PROC"
        done
    else
        echo "[ WARNING ] No hiretrack-* process found. Starting ecosystem..."

        if [ -d "$APP_INSTALL_DIR" ]; then
            cd "$APP_INSTALL_DIR" || { echo "[ ERROR ] Failed to enter $APP_INSTALL_DIR"; return 1; }

            if [ -f "ecosystem.config.cjs" ]; then
                ECOSYSTEM_FILE="ecosystem.config.cjs"
            elif [ -f "ecosystem.config.js" ]; then
                ECOSYSTEM_FILE="ecosystem.config.js"
            else
                echo "[ ERROR ] No ecosystem file found in $APP_INSTALL_DIR"
                return 1
            fi

            pm2 start "$ECOSYSTEM_FILE" && echo "[ OK ] PM2 started successfully using $ECOSYSTEM_FILE."
        else
            echo "[ ERROR ] Directory $APP_INSTALL_DIR not found"
            return 1
        fi
    fi
}

# ------------------------------------------------
# Schedule update (run in 2 minutes, detached from app)
# Use from the app UI so the installer is not a child of Node and can stop the app.
# ------------------------------------------------
schedule_update() {
    local SCHEDULE_MINS=2
    local RUN_CMD="PATH=/usr/local/bin:/usr/bin:/bin $SCRIPT_PATH --update manually"
    local LOG_FILE="$LOG_DIR/scheduled_update.log"

    mkdir -p "$LOG_DIR"

    # Cron uses system local time; ignore inherited TZ (e.g. Asia/Kolkata from PM2).
    if command -v at >/dev/null 2>&1; then
        if env -u TZ bash -c "echo 'PATH=/usr/local/bin:/usr/bin:/bin $SCRIPT_PATH --update manually >> $LOG_FILE 2>&1' | at 'now + ${SCHEDULE_MINS} minutes'" 2>/dev/null; then
            echo "[ OK ] Update scheduled in ${SCHEDULE_MINS} minutes. The app will restart automatically."
            echo "   All users will see the new version after the update completes."
            echo "   Log: $LOG_FILE"
            return 0
        fi
    fi

    local CRON_MIN CRON_HOUR
    CRON_MIN=$(env -u TZ date -d "+${SCHEDULE_MINS} minutes" "+%M" 2>/dev/null)
    CRON_HOUR=$(env -u TZ date -d "+${SCHEDULE_MINS} minutes" "+%H" 2>/dev/null)
    if [ -z "$CRON_MIN" ] || [ -z "$CRON_HOUR" ]; then
        CRON_MIN=$(env -u TZ date -v+${SCHEDULE_MINS}M "+%M" 2>/dev/null)
        CRON_HOUR=$(env -u TZ date -v+${SCHEDULE_MINS}M "+%H" 2>/dev/null)
    fi
    if [ -z "$CRON_MIN" ] || [ -z "$CRON_HOUR" ]; then
        echo "[ ERROR ] Could not compute schedule time. Install 'at' (apt install at / brew install at) or use: $SCRIPT_PATH --update manually"
        return 1
    fi

    local CRON_LINE
    CRON_LINE="${CRON_MIN} ${CRON_HOUR} * * * ( $RUN_CMD ; crontab -l 2>/dev/null | grep -v 'hiretrack-scheduled-update' | crontab - ) >> $LOG_FILE 2>&1 # hiretrack-scheduled-update"
    local CURRENT_CRON
    CURRENT_CRON=$(crontab -l 2>/dev/null || echo "")
    CURRENT_CRON=$(echo "$CURRENT_CRON" | grep -v 'hiretrack-scheduled-update' || true)
    (echo "$CURRENT_CRON"; echo "$CRON_LINE") | crontab -

    echo "[ OK ] Update scheduled in ${SCHEDULE_MINS} minutes. The app will restart automatically."
    echo "   All users will see the new version after the update completes."
    echo "   Log: $LOG_FILE"
}

# ------------------------------------------------
# Cron Setup
# ------------------------------------------------
setup_cron() {
    local OS_TYPE=$(uname | tr '[:upper:]' '[:lower:]')
    if [[ "$OS_TYPE" != "linux" && "$OS_TYPE" != "darwin" ]]; then
        echo "[ ERROR ] Unsupported OS: $OS_TYPE. Cannot setup cron."
        return 1
    fi

    mkdir -p "$APP_INSTALL_DIR" "$LOG_DIR"
    ensure_cron_secret_in_env "$APP_INSTALL_DIR/.env" || true

    echo ""
    echo "========================================"
    echo "   HireTrack Scheduler Configuration"
    echo "========================================"
    echo "HireTrack runs automated updates and snapshots at 2:00 AM."
    echo "Please select the timezone this schedule should be based on."
    
    # Trigger the UI prompt
    SELECTED_TZ=""
    prompt_for_timezone
    local TARGET_TZ="$SELECTED_TZ"

    # Failsafe if they somehow bypass the prompt
    if [ -z "$TARGET_TZ" ] || [ ! -f "/usr/share/zoneinfo/$TARGET_TZ" ]; then
        echo "[ WARNING ] Invalid or no timezone selected. Defaulting to UTC."
        TARGET_TZ="UTC"
    fi

    echo "[ OK ] Selected target timezone: $TARGET_TZ"
    echo "[ START ] Calculating offset for local server execution..."

    # The "Double Bounce" Time Translation Variables
    local SNAP_UTC UPD_UTC SNAP_CRON UPD_CRON

    if [[ "$OS_TYPE" == "linux" ]]; then
        # Bounce 1: Convert Target Timezone to UTC
        SNAP_UTC=$(TZ="$TARGET_TZ" date -d "02:00" -u +"%H:%M")
        UPD_UTC=$(TZ="$TARGET_TZ" date -d "02:15" -u +"%H:%M")
        
        # Bounce 2: Convert UTC to Server's Local Cron Format (Minute Hour)
        SNAP_CRON=$(date -d "$SNAP_UTC UTC" +"%M %H")
        UPD_CRON=$(date -d "$UPD_UTC UTC" +"%M %H")
    else 
        # macOS / BSD fallback logic
        SNAP_UTC=$(TZ="$TARGET_TZ" date -j -f "%H:%M" "02:00" -u +"%H:%M")
        UPD_UTC=$(TZ="$TARGET_TZ" date -j -f "%H:%M" "02:15" -u +"%H:%M")
        
        SNAP_CRON=$(date -j -f "%H:%M %Z" "$SNAP_UTC UTC" +"%M %H")
        UPD_CRON=$(date -j -f "%H:%M %Z" "$UPD_UTC UTC" +"%M %H")
    fi

    echo "Target Update Time : 02:15 AM ($TARGET_TZ)"
    echo "Local Server Cron  : $UPD_CRON * * *"

    local CRON_NAME="hiretrack-autoupdate"
    local SNAPSHOT_CRON_NAME="hiretrack-snapshot"
    
    local CRON_ENTRY="$UPD_CRON * * * PATH=/usr/local/bin:/usr/bin:/bin $SCRIPT_PATH --update >> $CRON_LOG_FILE 2>&1"
    local SNAPSHOT_CRON_ENTRY="$SNAP_CRON * * * PATH=/usr/local/bin:/usr/bin:/bin node $SNAPSHOT_SCRIPT >> $SNAPSHOT_LOG_FILE 2>&1"

    # Resolve PM2 binary path to ensure the reboot line works reliably
    local PM2_BIN
    PM2_BIN=$(command -v pm2 2>/dev/null || echo "/usr/local/bin/pm2")
    local PM2_REBOOT_LINE="@reboot $PM2_BIN resurrect >> $HOME/pm2-startup.log 2>&1"

    # Safely remove old cron jobs (including old/commented pm2 resurrect lines)
    local CURRENT_CRON=$(crontab -l 2>/dev/null || echo "")
    CURRENT_CRON=$(echo "$CURRENT_CRON" | grep -v 'hiretrack-autoupdate' | grep -v 'hiretrack-snapshot' | grep -v 'take-snapshot.js' | grep -v 'installer.sh --update' | grep -v 'pm2 resurrect' | grep -v 'hiretrack-reminders-ping' || true)

    local REM_LINE=""
    if can_install_reminders_ping_cron; then
        write_reminders_ping_script
        REM_LINE=$(hiretrack_reminders_cron_line)
    fi

    # Inject the new translated offsets AND the pm2 reboot line (and reminders ping when .env is ready)
    if [ -n "$REM_LINE" ]; then
        (echo "$CURRENT_CRON"; echo "# CRON_NAME:$SNAPSHOT_CRON_NAME"; echo "$SNAPSHOT_CRON_ENTRY"; echo "# CRON_NAME:$CRON_NAME"; echo "$CRON_ENTRY"; echo "$PM2_REBOOT_LINE"; echo "$REM_LINE") | crontab -
    else
        (echo "$CURRENT_CRON"; echo "# CRON_NAME:$SNAPSHOT_CRON_NAME"; echo "$SNAPSHOT_CRON_ENTRY"; echo "# CRON_NAME:$CRON_NAME"; echo "$CRON_ENTRY"; echo "$PM2_REBOOT_LINE") | crontab -
    fi

    echo "[ OK ] Cron jobs successfully installed and dynamically mapped to $TARGET_TZ!"
}

# ------------------------------------------------
# Full Installation
# ------------------------------------------------
install_all() {
    local EMAIL="${1:-}"
    echo "==== Starting HireTrack installation ===="

    persist_github_release_repo || exit 1
    check_resources 100 2000 "Initial Setup" || exit 1

    create_default_config "$EMAIL"
    setup_database
    create_snapshot_script
    check_update_and_install
    setup_cron
    setup_nginx
    write_env_server_details
    restart_pm2_service
    echo "==== Installation complete! ===="
    exit 0
}

# Split a release tarball into ~50MB parts + manifest.json (CI / release pipeline).
# Args: tarball_path [version] [part_size_mb]
release_chunk_assets() {
    local tarball="${1:?tarball path required}"
    local version="${2:-}"
    local part_mb="${3:-50}"

    if [ ! -f "$tarball" ]; then
        echo "[ ERROR ] Tarball not found: $tarball" >&2
        return 1
    fi

    if ! command -v split >/dev/null 2>&1; then
        echo "[ ERROR ] split command not found (install coreutils)." >&2
        return 1
    fi

    local part_prefix="${tarball}.part-"
    local manifest="${tarball}.manifest.json"

    echo "[ PACKAGE ] Splitting $(basename "$tarball") into ${part_mb}MB parts..."
    rm -f "${part_prefix}"*
    split -b "${part_mb}M" -d -a 3 "$tarball" "$part_prefix"

    local total sha256 part_count part_bytes
    total=$(file_byte_size "$tarball")
    if command -v sha256sum >/dev/null 2>&1; then
        sha256=$(sha256sum "$tarball" | awk '{print $1}')
    else
        sha256=$(shasum -a 256 "$tarball" | awk '{print $1}')
    fi

    part_count=0
    local _part_file
    for _part_file in "${part_prefix}"*; do
        [ -f "$_part_file" ] || continue
        part_count=$((part_count + 1))
    done

    if [ "$part_count" -eq 0 ]; then
        echo "[ ERROR ] split produced no parts for $tarball" >&2
        return 1
    fi

    part_bytes=$((part_mb * 1024 * 1024))

    jq -n \
        --arg filename "$(basename "$tarball")" \
        --arg version "$version" \
        --argjson partSizeBytes "$part_bytes" \
        --argjson parts "$part_count" \
        --argjson totalBytes "$total" \
        --arg sha256 "$sha256" \
        --arg partPrefix "$(basename "${part_prefix}")" \
        --argjson partPad 3 \
        '{
            filename: $filename,
            version: $version,
            chunked: true,
            partSizeBytes: $partSizeBytes,
            parts: $parts,
            totalBytes: $totalBytes,
            sha256: $sha256,
            partPrefix: $partPrefix,
            partPad: $partPad
        }' > "$manifest"

    echo "[ OK ] Created ${part_count} parts (${part_mb}MB each) and $(basename "$manifest")"
    echo "[ INFO ] totalBytes=${total} sha256=${sha256:0:16}..."
    return 0
}

# ------------------------------------------------
# Help (no dependency checks when showing help)
# ------------------------------------------------
show_help() {
    echo "Usage:"
    echo "  $0 [command] [options]"
    echo
    echo "Releases:"
    echo "  Default GitHub repo: ${DEFAULT_GITHUB_RELEASE_REPO} (override with GITHUB_RELEASE_REPO only if you fork)."
    echo "  Optional GITHUB_TOKEN for private repositories or higher GitHub API limits."
    echo
    echo "Commands:"
    echo "  --update [mode]                Check for and install updates"
    echo "                                 Use 'manually' to skip auto-update validation check"
    echo "                                 Example: $0 --update manually"
    echo
    echo "  --schedule-update              Schedule an update in 2 minutes (for in-app trigger)."
    echo "                                 Use from the app UI so the update runs detached and can"
    echo "                                 stop the app to free memory. All users get the new version."
    echo "                                 Example: $0 --schedule-update"
    echo
    echo "  --run-migrations [from] [to]  Run database migrations between versions"
    echo "                                 Example: $0 --run-migrations 2.2.25 2.2.26"
    echo
    echo "  --rollback                    Roll back to previous version (from config.json)"
    echo "                                Example: $0 --rollback"
    echo
    echo "  --setup-cron                  Set up automatic update cron job"
    echo "                                Configures cron to check for updates automatically"
    echo
    echo "  --domain                      Configure domain and Nginx setup"
    echo "                                Sets up domain, SSL certificate, and Nginx reverse proxy"
    echo
    echo "  --backup                      Create backup of .hiretrack (excludes node_modules)"
    echo "                                Example: $0 --backup"
    echo
    echo "  --beta-on                     Use beta repository (same as --channel beta)"
    echo "  --beta-off                    Use production repository (same as --channel production)"
    echo "  --staging-on                  Use staging repository"
    echo "  --staging-off                 Use production repository"
    echo
    echo "  --release-chunk-assets <tarball> [version] [part_mb]"
    echo "                                Split release tarball for chunked installer downloads"
    echo "                                Example: $0 --release-chunk-assets hiretrack-v1.1.9.tar.gz v1.1.9 50"
    echo
    echo "  --help                        Show this help message and exit"
    echo
    echo "  --skip-markdown-parser          Skip local PDF→Markdown PM2 service (bulk CV)"
    echo
    echo "  --demo-init [--force]           Mark host as public demo, sync demo env, seed DB"
    echo "                                 Use only on dedicated demo servers (not production)"
    echo
}

# ------------------------------------------------
# Main Entry Point
# ------------------------------------------------
# If --help or -h, show help and exit without running dependency checks
if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
    show_help
    exit 0
fi

# Release pipeline only (CI): split tarball — no PM2/markdown/tesseract setup
if [ "${1:-}" = "--release-chunk-assets" ]; then
    check_dep jq
    release_chunk_assets "${2:?tarball path required}" "${3:-}" "${4:-50}" || exit 1
    exit 0
fi

for _installer_arg in "$@"; do
    if [ "$_installer_arg" = "--skip-markdown-parser" ]; then
        SKIP_MARKDOWN_PARSER=1
        break
    fi
done

check_dep curl
check_dep jq
check_dep tar
check_dep shasum
ensure_tesseract_for_cv_ocr
ensure_python_venv_packages
check_pm2
ensure_markdown_parser_service

# Initialize channel (production / beta / staging) from config.json (with command line override)
init_channel_mode "$@"

case "${1:-}" in
    --install)
        install_all "${2:-}"
        ;;
    --register|--update-license)
        license_removed_notice
        ;;
    --update)
        check_update_and_install "${2:-}"
        ;;
    --schedule-update)
        schedule_update
        ;;
    --run-migrations)
        run_migrations "${2:-}" "${3:-}"
        ;;
    --rollback)
        # Version is automatically detected from config.json (previousVersion)
        rollback
        ;;
    --setup-cron)
        setup_cron
        ;;
    --domain)
        setup_nginx
        ;;
    --backup)
        run_backup
        ;;
    --beta-on)
        set_channel_config "beta"
        ;;
    --beta-off)
        set_channel_config "production"
        ;;
    --staging-on)
        set_channel_config "staging"
        ;;
    --staging-off)
        set_channel_config "production"
        ;;
    --demo-init)
        if command -v demo_init >/dev/null 2>&1; then
            demo_init "${2:-}"
        else
            echo "[ ERROR ] Demo support not loaded. Ensure scripts/installer-env.sh is present."
            exit 1
        fi
        ;;
    --help)
        show_help
        exit 0
        ;;
    -h)
        show_help
        exit 0
        ;;
    *)
        install_all "${2:-}"
        ;;
esac