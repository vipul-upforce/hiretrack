#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="${MARKDOWN_PARSER_DIR:-$HOME/.hiretrack/markdown-parser}"
PORT="${MARKDOWN_PARSER_PORT:-8000}"
PM2_NAME="${MARKDOWN_PARSER_PM2_NAME:-markdown-parser}"
ENV_FILE=""
USE_PM2=1

log_info() { printf '[INFO] %s\n' "$1"; }
log_ok() { printf '[OK] %s\n' "$1"; }
log_warn() { printf '[WARN] %s\n' "$1"; }
log_err() { printf '[ERROR] %s\n' "$1" >&2; }

usage() {
  cat <<EOF
Usage: $0 [--env-file /path/to/.env.local] [--port 8000] [--dir /custom/path] [--no-pm2]

Examples:
  $0 --env-file "/Users/you/project/.env.local"
  $0 --port 8010 --dir "$HOME/.hiretrack/markdown-parser"
  $0 --no-pm2
EOF
}

resolve_pm2_bin() {
  if command -v pm2 >/dev/null 2>&1; then
    command -v pm2
    return 0
  fi

  if command -v npm >/dev/null 2>&1; then
    local npm_prefix=""
    npm_prefix="$(npm prefix -g 2>/dev/null || true)"
    if [ -n "$npm_prefix" ] && [ -x "$npm_prefix/bin/pm2" ]; then
      echo "$npm_prefix/bin/pm2"
      return 0
    fi
  fi

  if [ -x "/usr/local/bin/pm2" ]; then
    echo "/usr/local/bin/pm2"
    return 0
  fi

  return 1
}

pm2_configure_autostart() {
  local pm2_bin="$1"

  "$pm2_bin" set pm2:autodump true >/dev/null 2>&1 || true

  if ! command -v crontab >/dev/null 2>&1; then
    log_warn "crontab not available; skipping PM2 autostart setup."
    return 0
  fi

  local reboot_line current_cron tmp_cron
  reboot_line="@reboot $pm2_bin resurrect >> $HOME/pm2-startup.log 2>&1"
  current_cron="$(crontab -l 2>/dev/null || true)"

  if printf '%s\n' "$current_cron" | grep -Fqx "$reboot_line"; then
    return 0
  fi

  tmp_cron="$(mktemp)"
  printf '%s\n' "$current_cron" | grep -v 'pm2 resurrect' > "$tmp_cron" || true
  printf '%s\n' "$reboot_line" >> "$tmp_cron"
  crontab "$tmp_cron"
  rm -f "$tmp_cron"
}

ensure_env_docling_url() {
  local env_file="$1"
  local parser_url="http://127.0.0.1:${PORT}/parse"
  local tmp_file

  mkdir -p "$(dirname "$env_file")"
  touch "$env_file"

  tmp_file="$(mktemp)"
  grep -v '^DOCLING_PARSE_URL=' "$env_file" > "$tmp_file" || true
  printf 'DOCLING_PARSE_URL=%s\n' "$parser_url" >> "$tmp_file"
  mv "$tmp_file" "$env_file"

  log_ok "Set DOCLING_PARSE_URL=${parser_url} in $env_file"
}

while [ $# -gt 0 ]; do
  case "$1" in
    --env-file)
      ENV_FILE="${2:-}"
      shift 2
      ;;
    --port)
      PORT="${2:-}"
      shift 2
      ;;
    --dir)
      INSTALL_DIR="${2:-}"
      shift 2
      ;;
    --no-pm2)
      USE_PM2=0
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      log_err "Unknown argument: $1"
      usage
      exit 1
      ;;
  esac
done

if ! command -v python3 >/dev/null 2>&1; then
  log_err "python3 is required. On macOS: brew install python"
  exit 1
fi

if ! python3 -m venv --help >/dev/null 2>&1; then
  log_err "python3 venv support is missing."
  exit 1
fi

mkdir -p "$INSTALL_DIR"

if [ ! -d "$INSTALL_DIR/venv" ]; then
  log_info "Creating virtual environment at $INSTALL_DIR/venv"
  python3 -m venv "$INSTALL_DIR/venv"
fi

if [ ! -x "$INSTALL_DIR/venv/bin/pip" ]; then
  log_err "venv pip missing at $INSTALL_DIR/venv"
  exit 1
fi

log_info "Installing FastAPI, uvicorn, python-multipart, pymupdf4llm"
"$INSTALL_DIR/venv/bin/pip" install --quiet --upgrade pip
"$INSTALL_DIR/venv/bin/pip" install --quiet fastapi uvicorn python-multipart pymupdf4llm

log_info "Writing $INSTALL_DIR/main.py"
cat > "$INSTALL_DIR/main.py" <<'PY'
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import os
import tempfile

import pymupdf4llm

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
    except Exception as exc:
        return {"status": "error", "message": str(exc)}
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
PY

if [ -n "$ENV_FILE" ]; then
  ensure_env_docling_url "$ENV_FILE"
fi

PARSER_URL="http://127.0.0.1:${PORT}/parse"

if [ "$USE_PM2" -eq 0 ]; then
  log_ok "Setup complete."
  echo
  echo "Start it manually with:"
  echo "  cd \"$INSTALL_DIR\""
  echo "  \"$INSTALL_DIR/venv/bin/uvicorn\" main:app --host 127.0.0.1 --port \"$PORT\""
  echo
  echo "Parser URL: $PARSER_URL"
  exit 0
fi

if ! command -v npm >/dev/null 2>&1; then
  log_err "npm is required for PM2. On macOS: brew install node"
  exit 1
fi

PM2_BIN="$(resolve_pm2_bin || true)"
if [ -z "$PM2_BIN" ]; then
  log_info "Installing PM2 globally"
  npm install -g pm2
  PM2_BIN="$(resolve_pm2_bin || true)"
fi

if [ -z "$PM2_BIN" ]; then
  log_err "PM2 could not be resolved after installation."
  exit 1
fi

"$PM2_BIN" delete "$PM2_NAME" >/dev/null 2>&1 || true

log_info "Starting markdown parser on 127.0.0.1:${PORT}"
(
  cd "$INSTALL_DIR"
  "$PM2_BIN" start "$INSTALL_DIR/venv/bin/uvicorn" \
    --name "$PM2_NAME" \
    --cwd "$INSTALL_DIR" \
    --interpreter none \
    -- main:app --host 127.0.0.1 --port "$PORT"
)

pm2_configure_autostart "$PM2_BIN"
"$PM2_BIN" save --force >/dev/null 2>&1 || true

ready=0
for _ in $(seq 1 30); do
  if curl -sf "http://127.0.0.1:${PORT}/docs" >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done

if [ "$ready" -eq 1 ]; then
  log_ok "Markdown parser online at $PARSER_URL"
else
  log_warn "Parser started but health check failed. Check: pm2 logs $PM2_NAME"
fi
