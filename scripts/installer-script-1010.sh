#!/bin/bash
set -euo pipefail

# ------------------------------------------------
# Constants and Environment Variables
# ------------------------------------------------
INSTALLER_DEST="$HOME/.myapp/installer.sh"
APP_INSTALL_DIR="$HOME/.myapp/APP"
BACKUP_DIR="$HOME/.myapp/backup"
RELEASES_DIR="$HOME/.myapp/releases"
TMP_INSTALL_DIR="$HOME/.myapp/tmp_install"
CONFIG_PATH="$HOME/.myapp/config.json"
LICENSE_PATH="$HOME/.myapp/license.json"
SCRIPT_PATH="$HOME/.myapp/installer.sh"
LOG_DIR="$HOME/.myapp/logs"
CRON_LOG_FILE="$LOG_DIR/cron_update.log"

API_URL="https://hiretrack-super-j6ca.vercel.app/api/license/register"
VALIDATE_API="https://hiretrack-super-j6ca.vercel.app/api/license/validate"
LATEST_VERSION_API="https://hiretrack-super-j6ca.vercel.app/api/version/list"

MONGODB_VERSION="${MONGODB_VERSION:-7.0}"
NODE_VERSION_DEFAULT=20

mkdir -p "$APP_INSTALL_DIR" "$BACKUP_DIR" "$RELEASES_DIR" "$TMP_INSTALL_DIR" "$LOG_DIR"

# ------------------------------------------------
# Auto-copy Installer
# ------------------------------------------------
if [ "$(realpath "$0")" != "$INSTALLER_DEST" ]; then
    echo "📦 Copying installer to $HOME/.myapp..."
    mkdir -p "$HOME/.myapp"
    cp "$0" "$INSTALLER_DEST"
    chmod +x "$INSTALLER_DEST"
    echo "✅ Installer ready at $INSTALLER_DEST"
    #echo "▶️ Please re-run the installer: $INSTALLER_DEST --install"
    echo "🚀 Auto-running installer with --install..."
    #exec "$INSTALLER_DEST" --install
    exec "$INSTALLER_DEST" "$@"
    exit 0
fi

# ------------------------------------------------
# Utility Functions
# ------------------------------------------------
check_dep() {
    local CMD="$1"
    if ! command -v "$CMD" >/dev/null 2>&1; then
        echo "⚠ $CMD not found. Installing..."
        if command -v apt-get >/dev/null 2>&1; then
            sudo apt-get update
            sudo apt-get install -y "$CMD"
        elif command -v yum >/dev/null 2>&1; then
            sudo yum install -y "$CMD"
        else
            echo "❌ Cannot install $CMD automatically. Please install it manually."
            exit 1
        fi
    fi
    echo "✅ $CMD is available."
}

get_machine_code() {
    local OS_TYPE
    OS_TYPE=$(uname | tr '[:upper:]' '[:lower:]')
    if [[ "$OS_TYPE" == "linux" ]]; then
        if [ -f /etc/machine-id ]; then
            cat /etc/machine-id
        else
            hostname | sha256sum | awk '{print $1}'
        fi
    elif [[ "$OS_TYPE" == "darwin" ]]; then
        hostname | shasum -a 256 | awk '{print $1}'
    else
        echo "❌ Unsupported OS: $OS_TYPE"
        exit 1
    fi
}

prompt_for_email() {
    read -p "Enter your email: " EMAIL
    if [ -z "$EMAIL" ]; then
        echo "❌ Email cannot be empty."
        exit 1
    fi
    echo "$EMAIL"
}

prompt_for_version() {
    read -p "Enter the version to install: " VERSION
    if [ -z "$VERSION" ]; then
        echo "❌ Version cannot be empty."
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
    echo "✅ MongoDB URL updated in $ENV_FILE"
}

write_config() {
    local KEY="$1"
    local VALUE="$2"
    jq --arg k "$KEY" --arg v "$VALUE" '.[$k]=$v' "$CONFIG_PATH" > "${CONFIG_PATH}.tmp" && mv "${CONFIG_PATH}.tmp" "$CONFIG_PATH"
}

# ------------------------------------------------
# Dependency Installation
# ------------------------------------------------
install_node() {
    local APP_DIR="$1"
    local NODE_VERSION

    if [ -n "$APP_DIR" ] && [ -f "$APP_DIR/.env" ]; then
        NODE_VERSION=$(grep -E '^NODE_VERSION=' "$APP_DIR/.env" | cut -d '=' -f2)
    fi
    NODE_VERSION=${NODE_VERSION:-$NODE_VERSION_DEFAULT}
    local NODE_MAJOR_VERSION
    NODE_MAJOR_VERSION=$(echo "$NODE_VERSION" | sed 's/v\([0-9]*\).*/\1/')

    if command -v node >/dev/null 2>&1; then
        local CURRENT_VERSION
        CURRENT_VERSION=$(node -v | sed 's/v\([0-9]*\).*/\1/')
        if [ "$CURRENT_VERSION" = "$NODE_MAJOR_VERSION" ]; then
            echo "✅ Node.js version $NODE_MAJOR_VERSION.x already installed (found $(node -v))."
            return
        else
            echo "⚠ Node.js version $CURRENT_VERSION found, but version $NODE_MAJOR_VERSION.x required."
        fi
    else
        echo "⚠ Node.js not found."
    fi

    echo "📦 Installing Node.js version $NODE_MAJOR_VERSION globally..."
    local OS_TYPE
    OS_TYPE=$(uname | tr '[:upper:]' '[:lower:]')
    local CODENAME

    if [[ "$OS_TYPE" == "linux" ]]; then
        if command -v apt-get >/dev/null 2>&1; then
            CODENAME=$(lsb_release -cs 2>/dev/null || echo "focal")
            curl -fsSL "https://deb.nodesource.com/setup_$NODE_MAJOR_VERSION.x" | sudo -E bash -
            sudo apt-get install -y nodejs
        elif command -v yum >/dev/null 2>&1; then
            curl -fsSL "https://rpm.nodesource.com/setup_$NODE_MAJOR_VERSION.x" | sudo -E bash -
            sudo yum install -y nodejs
        else
            echo "❌ Unsupported Linux package manager. Install Node.js manually."
            exit 1
        fi
    elif [[ "$OS_TYPE" == "darwin" ]]; then
        if ! command -v brew >/dev/null 2>&1; then
            echo "❌ Homebrew not found. Install Homebrew first."
            exit 1
        fi
        brew install node@$NODE_MAJOR_VERSION
        brew link node@$NODE_MAJOR_VERSION --force
    else
        echo "❌ Unsupported OS: $OS_TYPE"
        exit 1
    fi

    if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
        local INSTALLED_VERSION
        INSTALLED_VERSION=$(node -v | sed 's/v\([0-9]*\).*/\1/')
        if [ "$INSTALLED_VERSION" = "$NODE_MAJOR_VERSION" ]; then
            echo "✅ Node.js $NODE_MAJOR_VERSION and npm $(npm -v) installed successfully."
        else
            echo "❌ Failed to install Node.js $NODE_MAJOR_VERSION. Found version: $(node -v)."
            exit 1
        fi
    else
        echo "❌ Node.js installation failed."
        exit 1
    fi
}

check_pm2() {
    install_node ""
    if command -v pm2 >/dev/null 2>&1; then
        echo "✅ PM2 already installed."
    else
        echo "📦 Installing PM2 globally..."
        npm install -g pm2
        if command -v pm2 >/dev/null 2>&1; then
            echo "✅ PM2 installed."
        else
            echo "❌ Failed to install PM2."
            exit 1
        fi
    fi
}

install_and_start_mongodb() {
    local OS_TYPE
    OS_TYPE=$(uname | tr '[:upper:]' '[:lower:]')
    local LATEST_VERSION=""

    if command -v mongod >/dev/null 2>&1; then
        echo "✅ MongoDB already installed."
        [[ "$OS_TYPE" == "darwin" ]] && LATEST_VERSION=$(brew list --formula | grep -E '^mongodb-community@[0-9]+\.[0-9]+' | sort -V | tail -n 1)
    else
        echo "📦 Installing MongoDB $MONGODB_VERSION..."
        if [[ "$OS_TYPE" == "darwin" ]]; then
            [ ! -x "$(command -v brew)" ] && { echo "❌ Install Homebrew first"; exit 1; }
            brew tap mongodb/brew
            LATEST_VERSION=$(brew search mongodb-community@ | grep -Eo 'mongodb-community@[0-9]+\.[0-9]+' | sort -V | tail -n 1)
            [ -z "$LATEST_VERSION" ] && { echo "❌ MongoDB formula not found"; exit 1; }
            brew install "$LATEST_VERSION"
        elif [[ "$OS_TYPE" == "linux" ]]; then
            if command -v apt-get >/dev/null 2>&1; then
                sudo rm -f /etc/apt/sources.list.d/mongodb-org-*.list
                curl -fsSL https://www.mongodb.org/static/pgp/server-$MONGODB_VERSION.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-$MONGODB_VERSION.gpg
                local CODENAME=$(lsb_release -cs)
                if [[ "$CODENAME" == "noble" ]]; then
                    echo "⚠ Ubuntu Noble (24.04) detected. Using Jammy (22.04) repository for MongoDB $MONGODB_VERSION."
                    CODENAME="jammy"
                fi
                echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-$MONGODB_VERSION.gpg ] https://repo.mongodb.org/apt/ubuntu $CODENAME/mongodb-org/$MONGODB_VERSION multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-$MONGODB_VERSION.list
                sudo apt-get update
                if ! sudo apt-get install -y mongodb-org; then
                    echo "❌ Failed to install MongoDB $MONGODB_VERSION. Trying MongoDB 6.0 as fallback..."
                    MONGODB_VERSION="6.0"
                    sudo rm -f /etc/apt/sources.list.d/mongodb-org-$MONGODB_VERSION.list
                    curl -fsSL https://www.mongodb.org/static/pgp/server-6.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-6.0.gpg
                    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu $CODENAME/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
                    sudo apt-get update
                    if ! sudo apt-get install -y mongodb-org; then
                        echo "❌ Failed to install MongoDB. Please install it manually from https://www.mongodb.com/docs/manual/installation/"
                        exit 1
                    fi
                fi
            elif command -v yum >/dev/null 2>&1; then
                sudo yum install -y mongodb-org
            else
                echo "❌ Unsupported Linux. Install MongoDB manually."
                exit 1
            fi
        else
            echo "❌ Unsupported OS: $OS_TYPE"
            exit 1
        fi
    fi

    echo "▶️ Starting MongoDB service..."
    if [[ "$OS_TYPE" == "darwin" ]]; then
        [ -z "$LATEST_VERSION" ] && LATEST_VERSION="mongodb-community@$MONGODB_VERSION"
        brew services start "$LATEST_VERSION" || { echo "❌ Failed to start MongoDB via Homebrew"; exit 1; }
    elif [[ "$OS_TYPE" == "linux" ]]; then
        sudo systemctl start mongod || { echo "❌ Failed to start MongoDB"; exit 1; }
        sudo systemctl enable mongod || { echo "❌ Failed to enable MongoDB"; exit 1; }
    fi
    sleep 5
    if pgrep -x "mongod" >/dev/null; then
        echo "✅ MongoDB running"
        if command -v mongo >/dev/null 2>&1; then
            mongo --eval "db.adminCommand('ping')" >/dev/null 2>&1 && echo "✅ MongoDB connection verified" || { echo "❌ MongoDB connection failed"; exit 1; }
        else
            echo "⚠ MongoDB shell not found, skipping connection test"
        fi
    else
        echo "❌ MongoDB failed to start. Check logs at /var/log/mongodb/mongod.log"
        exit 1
    fi
}

# ------------------------------------------------
# Config and License Management
# ------------------------------------------------
create_default_config() {
    local PASSED_EMAIL="${1:-}"
    if [ ! -f "$CONFIG_PATH" ]; then
        echo '{"autoUpdate": true, "installedVersion": "none"}' > "$CONFIG_PATH"
        echo "✅ Default config created at $CONFIG_PATH"
    fi

    if [ -n "$PASSED_EMAIL" ]; then
        if ! echo "$PASSED_EMAIL" | grep -E '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' >/dev/null 2>&1; then
            echo "❌ Invalid email format: $PASSED_EMAIL"
            exit 1
        fi
        local EXISTING_EMAIL
        EXISTING_EMAIL=$(jq -r '.email // empty' "$CONFIG_PATH" 2>/dev/null || echo "")
        if [ -n "$EXISTING_EMAIL" ]; then
            echo "Existing email"
            exit 1
        fi
    fi
}

register_license() {
    local EMAIL="$1"
    [ -z "$EMAIL" ] && EMAIL=$(prompt_for_email)
    local MACHINE_CODE=$(get_machine_code)

    local EXISTING_DB_CHOICE
    EXISTING_DB_CHOICE=$(jq -r '.dbChoice // empty' "$CONFIG_PATH")
    local SKIP_DB_SETUP=""
    if [ -n "$EXISTING_DB_CHOICE" ]; then
        echo "✅ Database preference already set: $EXISTING_DB_CHOICE"
        local EXISTING_DB_URL
        EXISTING_DB_URL=$(jq -r '.dbUrl // empty' "$CONFIG_PATH")
        [ -n "$EXISTING_DB_URL" ] && echo "🔗 Existing DB URL: $EXISTING_DB_URL"
        read -p "Do you want to override the database preference and URL? [y/N]: " OVERRIDE
        OVERRIDE=${OVERRIDE:-N}
        if [[ ! "$OVERRIDE" =~ ^[Yy]$ ]]; then
            SKIP_DB_SETUP=1
            # Ensure current .env reflects existing DB URL if present
            if [ -n "$EXISTING_DB_URL" ]; then
                write_env_mongo_url "$APP_INSTALL_DIR" "$EXISTING_DB_URL"
            fi
        fi
    fi

    if [ -z "$SKIP_DB_SETUP" ]; then
        echo "📦 Choose MongoDB option:"
        echo "1) MongoDB Atlas (cloud)"
        echo "2) Local MongoDB"
        read -p "Enter choice [1/2]: " DB_CHOICE

        local APP_DIR="$APP_INSTALL_DIR"
        local DB_URL
        if [ "$DB_CHOICE" == "1" ]; then
            read -p "Enter your MongoDB Atlas connection URL: " ATLAS_URL
            [ -z "$ATLAS_URL" ] && { echo "❌ MongoDB Atlas URL cannot be empty."; exit 1; }
            DB_URL="$ATLAS_URL"
            write_config "dbChoice" "atlas"
        elif [ "$DB_CHOICE" == "2" ]; then
            install_and_start_mongodb
            DB_URL="mongodb://localhost:27017/hiretrack"
            write_config "dbChoice" "local"
        else
            echo "❌ Invalid choice."
            exit 1
        fi
        write_env_mongo_url "$APP_DIR" "$DB_URL"
        write_config "dbUrl" "$DB_URL"
    fi

    local RESPONSE
    RESPONSE=$(curl -s -X POST "$API_URL" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\",\"machineCode\":\"$MACHINE_CODE\"}")
    echo "RESPONSE-REGISTERATION: $RESPONSE"

    if [ -z "$RESPONSE" ] || ! echo "$RESPONSE" | jq . >/dev/null 2>&1; then
        echo "❌ License registration failed: Invalid response."
        exit 1
    fi

    local LICENSE_KEY EMAIL_RES
    LICENSE_KEY=$(echo "$RESPONSE" | jq -r '.license.licenseKey')
    EMAIL_RES=$(echo "$RESPONSE" | jq -r '.license.email')
    if [ -z "$LICENSE_KEY" ] || [ "$LICENSE_KEY" == "null" ] || [ -z "$EMAIL_RES" ] || [ "$EMAIL_RES" == "null" ]; then
        echo "❌ License registration failed."
        exit 1
    fi

    echo "{\"licenseKey\":\"$LICENSE_KEY\"}" > "$LICENSE_PATH"
    echo "✅ License saved at $LICENSE_PATH"
    if [ -n "$EMAIL_RES" ] && [ "$EMAIL_RES" != "null" ]; then
        write_config "email" "$EMAIL_RES"
    fi
}

validate_license_and_get_asset() {
    local VERSION="${1:-}"
    if [ ! -f "$LICENSE_PATH" ]; then
        echo "❌ License not found. Please register first."
        exit 1
    fi

    local LICENSE_KEY=$(jq -r '.licenseKey' "$LICENSE_PATH")
    local MACHINE_CODE=$(get_machine_code)
    local INSTALLED_VERSION=$(jq -r '.installedVersion // "none"' "$CONFIG_PATH")
    local VERSION_TO_SEND="${VERSION:-$INSTALLED_VERSION}"
    local RESPONSE
    RESPONSE=$(curl -s -X POST "$VALIDATE_API" -H "Content-Type: application/json" -d "{\"licenseKey\":\"$LICENSE_KEY\",\"machineCode\":\"$MACHINE_CODE\",\"installedVersion\":\"$VERSION_TO_SEND\"}")
    if [ -z "$RESPONSE" ] || ! echo "$RESPONSE" | jq . >/dev/null 2>&1; then
        echo "❌ License validation failed: Invalid response."
        exit 1
    fi

    local VALID ASSET_URL
    VALID=$(echo "$RESPONSE" | jq -r '.valid')
    ASSET_URL=$(echo "$RESPONSE" | jq -r '.asset')
    if [ "$VALID" != "true" ]; then
        echo "❌ License invalid or expired."
        exit 1
    fi
    echo "$ASSET_URL"
}

# ------------------------------------------------
# Version Management
# ------------------------------------------------
check_latest_version() {
    local RESPONSE=$(curl -s "$LATEST_VERSION_API")
    if [ -z "$RESPONSE" ] || ! echo "$RESPONSE" | jq . >/dev/null 2>&1; then
        echo "❌ Failed to get latest version info."
        exit 1
    fi
    local LATEST_VERSION=$(echo "$RESPONSE" | jq -r '.latestVerson // .latestVersion // empty')
    if [ -z "$LATEST_VERSION" ] || [ "$LATEST_VERSION" == "null" ]; then
        echo "❌ No latest version found."
        exit 1
    fi
    echo "$LATEST_VERSION"
}

check_update_and_install() {
    create_default_config
    local AUTO_UPDATE=$(jq -r '.autoUpdate' "$CONFIG_PATH")
    local INSTALLED_VERSION=$(jq -r '.installedVersion // "none"' "$CONFIG_PATH")

    if [ "$AUTO_UPDATE" != "true" ]; then
        echo "✅ Auto-update disabled. Keeping version: $INSTALLED_VERSION"
        return
    fi

    local LATEST_VERSION=$(check_latest_version)
    local NORMALIZED_INSTALLED=$(echo "${INSTALLED_VERSION#v}" | tr -d '[:space:]')
    local NORMALIZED_LATEST=$(echo "${LATEST_VERSION#v}" | tr -d '[:space:]')

    echo "🔍 Debug: INSTALLED_VERSION='$INSTALLED_VERSION'"
    echo "🔍 Debug: LATEST_VERSION='$LATEST_VERSION'"
    echo "🔍 Debug: NORMALIZED_INSTALLED='$NORMALIZED_INSTALLED'"
    echo "�� Debug: NORMALIZED_LATEST='$NORMALIZED_LATEST'"

    if [ "$INSTALLED_VERSION" != "none" ] && [ "$NORMALIZED_INSTALLED" = "$NORMALIZED_LATEST" ]; then
        echo "✅ Already up to date! Installed version: $INSTALLED_VERSION"
        exit 0
    fi

    echo "📋 Current version: $INSTALLED_VERSION"
    echo "📋 Latest version: $LATEST_VERSION"
    echo "�� Update available! Proceeding with update..."

    local ASSET_URL=$(validate_license_and_get_asset "$LATEST_VERSION")
    echo "ASSET URL: $ASSET_URL"
    if [ -z "$ASSET_URL" ] || [ "$ASSET_URL" = "null" ]; then
        echo "❌ Failed to get asset URL for update."
        exit 1
    fi

    local TMP_FILE="$HOME/.myapp/tmp_asset.tar.gz"
    echo "asset url: $ASSET_URL"
    echo "temp file: $TMP_FILE" 
    curl -L "$ASSET_URL" -o "$TMP_FILE" || { echo "❌ Failed to download release."; exit 1; }

    local FILENAME=$(basename "$ASSET_URL")
    local VERSION_NAME="${FILENAME%.tar.gz}"
    VERSION_NAME=${VERSION_NAME#hiretrack-}
    local OLD_DIR="$BACKUP_DIR/hiretrack-$INSTALLED_VERSION"

    if [ "$INSTALLED_VERSION" != "none" ] && [ -d "$APP_INSTALL_DIR" ] && [ "$(ls -A "$APP_INSTALL_DIR")" ]; then
        echo "📦 Backing up current version $INSTALLED_VERSION..."
        rm -rf "$OLD_DIR"
        cp -r "$APP_INSTALL_DIR" "$OLD_DIR"
        echo "✅ Backup created at $OLD_DIR"
    else
        echo "⚠️ No existing installation to backup."
    fi

    rm -rf "$APP_INSTALL_DIR"
    mkdir -p "$APP_INSTALL_DIR"
    tar -xzf "$TMP_FILE" -C "$APP_INSTALL_DIR" || {
        echo "❌ Failed to extract release."
        rm "$TMP_FILE"
        if [ -d "$OLD_DIR" ]; then
            cp -r "$OLD_DIR" "$APP_INSTALL_DIR"
            pm2 start "npm run start" --name "hiretrack-$INSTALLED_VERSION" --cwd "$APP_INSTALL_DIR" || true
        else
            pm2 kill || true
        fi
        exit 1
    }
    rm "$TMP_FILE"

    local DB_URL=$(jq -r '.dbUrl // empty' "$CONFIG_PATH")
    if [ -n "$DB_URL" ]; then
        write_env_mongo_url "$APP_INSTALL_DIR" "$DB_URL"
    fi

    if [ ! -f "$APP_INSTALL_DIR/package.json" ]; then
        echo "❌ package.json not found. Aborting."
        rm -rf "$APP_INSTALL_DIR"
        if [ -d "$OLD_DIR" ]; then
            cp -r "$OLD_DIR" "$APP_INSTALL_DIR"
            pm2 start "npm run start" --name "hiretrack-$INSTALLED_VERSION" --cwd "$APP_INSTALL_DIR" || true
        else
            pm2 kill || true
        fi
        exit 1
    fi

    install_node "$APP_INSTALL_DIR"
    local DB_CHOICE=$(jq -r '.dbChoice // empty' "$CONFIG_PATH")
    if [ "$DB_CHOICE" == "local" ]; then
        install_and_start_mongodb
    elif [ "$DB_CHOICE" == "atlas" ]; then
        echo "✅ Using MongoDB Atlas."
    else
        echo "❌ Invalid dbChoice."
        exit 1
    fi

    cd "$APP_INSTALL_DIR" || exit
    npm install --legacy-peer-deps || {
        echo "❌ npm install failed. Rolling back..."
        rm -rf "$APP_INSTALL_DIR"
        if [ -d "$OLD_DIR" ]; then
            cp -r "$OLD_DIR" "$APP_INSTALL_DIR"
            pm2 start "npm run start" --name "hiretrack-$INSTALLED_VERSION" --cwd "$APP_INSTALL_DIR" || true
        else
            pm2 kill || true
        fi
        exit 1
    }

    echo "🚀 Starting new version with PM2... version is $VERSION_NAME"
    pm2 stop "hiretrack-$VERSION_NAME" || true
    pm2 delete "hiretrack-$VERSION_NAME" || true
    pm2 start "npm run start" --name "hiretrack-$VERSION_NAME" --cwd "$APP_INSTALL_DIR" || {
        echo "❌ Failed to start. Rolling back..."
        pm2 delete "hiretrack-$VERSION_NAME" || true
        rm -rf "$APP_INSTALL_DIR"
        if [ -d "$OLD_DIR" ]; then
            cp -r "$OLD_DIR" "$APP_INSTALL_DIR"
            pm2 start "npm run start" --name "hiretrack-$INSTALLED_VERSION" --cwd "$APP_INSTALL_DIR" || true
        else
            pm2 kill || true
        fi
        exit 1
    }

    sleep 5
    pm2 describe "hiretrack-$VERSION_NAME" >/dev/null 2>&1 || {
        echo "❌ Failed to start (PM2 describe failed). Rolling back..."
        pm2 delete "hiretrack-$VERSION_NAME" || true
        rm -rf "$APP_INSTALL_DIR"
        if [ -d "$OLD_DIR" ]; then
            cp -r "$OLD_DIR" "$APP_INSTALL_DIR"
            pm2 start "npm run start" --name "hiretrack-$INSTALLED_VERSION" --cwd "$APP_INSTALL_DIR" || true
        else
            pm2 kill || true
        fi
        exit 1
    }

    echo "✅ New version started successfully."
    write_config "installedVersion" "$VERSION_NAME"

    # Clean up old PM2 processes safely
    echo "🧹 Cleaning up old PM2 processes..."
    mapfile -t old_processes < <(pm2 jlist | jq -r '.[] | select(.name | startswith("hiretrack-")) | .name' | grep -v "hiretrack-$VERSION_NAME")

    if [ ${#old_processes[@]} -eq 0 ]; then
        echo "ℹ️ No old hiretrack processes found to clean up."
    else
        for process_name in "${old_processes[@]}"; do
            if [ -n "$process_name" ]; then
                echo "⏹ Stopping and deleting old process: $process_name"
                pm2 stop "$process_name" || true
                pm2 delete "$process_name" || true
            fi
        done
        echo "✅ Cleanup completed for ${#old_processes[@]} old process(es)."
    fi

    pm2 save --force
    echo "✅ PM2 cleanup completed. Installed/Updated to $VERSION_NAME at $APP_INSTALL_DIR"

    # Optional: clean old backup
    if [ -d "$OLD_DIR" ]; then
        echo "🧹 Cleaning up old backup at $OLD_DIR..."
        rm -rf "$OLD_DIR"
    fi
}

install_specific_version() {
    local VERSION="$1"
    [ -z "$VERSION" ] && VERSION=$(prompt_for_version)
    local VERSION_NAME=${VERSION#hiretrack-}
    echo "📦 Installing version: $VERSION_NAME"

    local BACKUP_FILE="$BACKUP_DIR/hiretrack-app-backup.tar.gz"
    if [ -d "$APP_INSTALL_DIR" ] && [ "$(ls -A "$APP_INSTALL_DIR")" ]; then
        tar -czf "$BACKUP_FILE" -C "$APP_INSTALL_DIR" .
        echo "📦 Backup saved: $BACKUP_FILE"
    else
        echo "⚠️ No existing APP to backup."
    fi

    local RELEASE_FILE="$RELEASES_DIR/hiretrack-$VERSION_NAME.tar.gz"
    if [ ! -f "$RELEASE_FILE" ]; then
        echo "📥 Downloading release $VERSION_NAME..."
        local ASSET_URL=$(validate_license_and_get_asset "$VERSION_NAME")
        curl -L "$ASSET_URL" -o "$RELEASE_FILE" || { echo "❌ Failed to download."; return 1; }
        echo "✅ Release tarball saved: $RELEASE_FILE"
    else
        echo "✅ Using cached release: $RELEASE_FILE"
    fi

    rm -rf "$TMP_INSTALL_DIR"/*
    tar -xzf "$RELEASE_FILE" -C "$TMP_INSTALL_DIR" || {
        echo "❌ Failed to extract. Rolling back..."
        rm -rf "$APP_INSTALL_DIR"/*
        tar -xzf "$BACKUP_FILE" -C "$APP_INSTALL_DIR"
        return 1
    }

    local MONGO_URL=$(jq -r '.dbUrl // empty' "$CONFIG_PATH")
    export MONGODB_URI="$MONGO_URL"
    echo "✅ Using MongoDB: $MONGO_URL"

    local INSTALLED_VERSION=$(jq -r '.installedVersion // empty' "$CONFIG_PATH")
    if [ -n "$INSTALLED_VERSION" ] && pm2 list | grep -q "hiretrack-$INSTALLED_VERSION"; then
        echo "⏹ Stopping old version hiretrack-$INSTALLED_VERSION..."
        pm2 stop "hiretrack-$INSTALLED_VERSION" || true
        pm2 delete "hiretrack-$INSTALLED_VERSION" || true
    fi

    rm -rf "$APP_INSTALL_DIR"/*
    cp -r "$TMP_INSTALL_DIR"/* "$APP_INSTALL_DIR/" || {
        echo "❌ Failed to copy. Rolling back..."
        rm -rf "$APP_INSTALL_DIR"/*
        tar -xzf "$BACKUP_FILE" -C "$APP_INSTALL_DIR"
        return 1
    }

    cd "$APP_INSTALL_DIR" || exit
    npm install --legacy-peer-deps || {
        echo "❌ npm install failed. Rolling back..."
        rm -rf "$APP_INSTALL_DIR"/*
        tar -xzf "$BACKUP_FILE" -C "$APP_INSTALL_DIR"
        return 1
    }

    echo "🚀 Starting hiretrack-$VERSION_NAME with PM2..."
    pm2 start "npm run start" --name "hiretrack-$VERSION_NAME" --cwd "$APP_INSTALL_DIR" || {
        echo "❌ Failed to start. Rolling back..."
        rm -rf "$APP_INSTALL_DIR"/*
        tar -xzf "$BACKUP_FILE" -C "$APP_INSTALL_DIR"
        pm2 start "npm run start" --name "hiretrack-$INSTALLED_VERSION" --cwd "$APP_INSTALL_DIR"
        return 1
    }
    pm2 save --force

    write_config "installedVersion" "$VERSION_NAME"
    echo "✅ Installed version $VERSION_NAME and started as PM2 service hiretrack-$VERSION_NAME"
}

# ------------------------------------------------
# Nginx Setup Script
# ------------------------------------------------
setup_nginx() {
    local NGINX_SCRIPT="$HOME/.myapp/nginx_setup.sh"
    echo "🚀 Generating and running Nginx setup script..."

    cat <<-EOF > "$NGINX_SCRIPT"
	#!/bin/bash
	set -euo pipefail

	# ================================================
	# Nginx Setup Script for HireTrack Application
	# ================================================
	# This script must be run AFTER the main installation
	# It handles:
	# 1. Domain name collection from user
	# 2. Nginx installation
	# 3. SSL certificate setup (Let's Encrypt)
	# 4. Nginx configuration with proper proxy setup
	# 5. Include HTTPS block in configuration
	# ================================================

	echo "🚀 Starting Nginx Setup..."

	# ------------------------------------------------
	# Configuration Paths
	# ------------------------------------------------
	CONFIG_PATH="$HOME/.myapp/config.json"
	APP_PORT="\${APP_PORT:-3000}"
	NGINX_BACKUP_DIR="$HOME/.myapp/nginx-backups"
	NGINX_CONF_DIR="/etc/nginx/sites-available"
	NGINX_ENABLED_DIR="/etc/nginx/sites-enabled"

	# Global variables
	DOMAIN_NAME=""
	EMAIL=""

	# ------------------------------------------------
	# Detect OS
	# ------------------------------------------------
	OS_TYPE=\$(uname | tr '[:upper:]' '[:lower:]')
	echo "🖥️  Detected OS: \$OS_TYPE"

	# ------------------------------------------------
	# Set OS-specific paths
	# ------------------------------------------------
	if [[ "\$OS_TYPE" == "darwin" ]]; then
	    NGINX_CONF_DIR="/usr/local/etc/nginx/servers"
	    NGINX_ENABLED_DIR=""  # macOS doesn't use sites-enabled
	    LOG_DIR="/usr/local/var/log/nginx"
	else
	    LOG_DIR="/var/log/nginx"
	fi

	mkdir -p "\$NGINX_BACKUP_DIR"
	mkdir -p "\$LOG_DIR" 2>/dev/null || sudo mkdir -p "\$LOG_DIR"

	# ------------------------------------------------
	# Dependency check function
	# ------------------------------------------------
	check_dep() {
	    local CMD=\$1
	    if ! command -v "\$CMD" >/dev/null 2>&1; then
		echo "⚠️  \$CMD not found. Installing..."
		if command -v apt-get >/dev/null 2>&1; then
		    sudo apt-get update
		    sudo apt-get install -y "\$CMD"
		elif command -v yum >/dev/null 2>&1; then
		    sudo yum install -y "\$CMD"
		elif [[ "\$OS_TYPE" == "darwin" ]] && command -v brew >/dev/null 2>&1; then
		    brew install "\$CMD"
		else
		    echo "❌ Cannot install \$CMD automatically. Please install it manually."
		    exit 1
		fi
	    fi
	    echo "✅ \$CMD is available."
	}

	check_dep curl
	check_dep jq

	# ------------------------------------------------
	# Prompt for domain name
	# ------------------------------------------------
	prompt_for_domain() {
	    echo ""
	    echo "════════════════════════════════════════════════"
	    echo "  Domain Configuration"
	    echo "════════════════════════════════════════════════"
	    echo ""
	    echo "Please enter the domain name for your HireTrack instance."
	    echo "Examples:"
	    echo "  - release.hiretrack.in"
	    echo "  - demo.yourcompany.com"
	    echo "  - localhost (for local testing only)"
	    echo ""

	    while true; do
		read -p "🌐 Enter domain name: " DOMAIN_NAME

		# Trim whitespace
		DOMAIN_NAME=\$(echo "\$DOMAIN_NAME" | xargs)

		# Check if empty
		if [ -z "\$DOMAIN_NAME" ]; then
		    echo "❌ Domain name cannot be empty. Please try again."
		    echo ""
		    continue
		fi

		# Basic domain validation
		if [[ "\$DOMAIN_NAME" == "localhost" ]]; then
		    echo "⚠️  Using localhost (HTTP only, no SSL)"
		    break
		elif echo "\$DOMAIN_NAME" | grep -qE '^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\$'; then
		    echo "✅ Domain accepted: \$DOMAIN_NAME"
		    break
		else
		    echo "❌ Invalid domain format. Please use a valid domain like 'release.hiretrack.in'"
		    echo ""
		fi
	    done

	    # Confirm domain
	    echo ""
	    echo "📋 Domain Summary:"
	    echo "   Domain: \$DOMAIN_NAME"
	    echo ""
	    read -p "Is this correct? (Y/n): " CONFIRM

	    if [[ "\$CONFIRM" =~ ^[Nn]\$ ]]; then
		echo "❌ Aborted. Please run the script again."
		exit 1
	    fi

	    echo ""
	    echo "✅ Domain confirmed: \$DOMAIN_NAME"
	}

	# ------------------------------------------------
	# Prompt for email
	# ------------------------------------------------
	prompt_for_email() {
	    # Try to get email from config first
	    if [ -f "\$CONFIG_PATH" ]; then
		EMAIL=\$(jq -r '.email // empty' "\$CONFIG_PATH" 2>/dev/null || echo "")
	    fi

	    if [ -n "\$EMAIL" ]; then
		echo "✅ Using email from config: \$EMAIL"
		return
	    fi

	    echo ""
	    echo "📧 Email is required for SSL certificate registration (Let's Encrypt)"
	    echo ""

	    while true; do
		read -p "Enter your email address: " EMAIL

		# Trim whitespace
		EMAIL=\$(echo "\$EMAIL" | xargs)

		# Validate email format
		if [ -z "\$EMAIL" ]; then
		    echo "❌ Email cannot be empty."
		    continue
		elif echo "\$EMAIL" | grep -qE '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\$'; then  
		    echo "✅ Email accepted: \$EMAIL"
		    break
		else
		    echo "❌ Invalid email format. Please try again."
		fi
	    done
	}

	# ------------------------------------------------
	# Save domain to config
	# ------------------------------------------------
	save_domain_to_config() {
	    if [ -f "\$CONFIG_PATH" ]; then
		# Update existing config
		local TEMP_FILE
		TEMP_FILE=\$(mktemp)
		jq --arg domain "\$DOMAIN_NAME" '.serverName=\$domain' "\$CONFIG_PATH" > "\$TEMP_FILE"      
		mv "\$TEMP_FILE" "\$CONFIG_PATH"
		echo "✅ Domain saved to config: \$CONFIG_PATH"
	    else
		# Create new config
		mkdir -p "\$(dirname "\$CONFIG_PATH")"
		echo "{\"serverName\": \"\$DOMAIN_NAME\", \"email\": \"\$EMAIL\"}" > "\$CONFIG_PATH"       
		echo "✅ Config created with domain and email: \$CONFIG_PATH"
	    fi
	}

	# ------------------------------------------------
	# Check DNS resolution
	# ------------------------------------------------
	check_dns_resolution() {
	    if [ "\$DOMAIN_NAME" == "localhost" ]; then
		return 0
	    fi

	    echo ""
	    echo "🔍 Checking DNS resolution for \$DOMAIN_NAME..."

	    local DNS_IP
	    DNS_IP=\$(host "\$DOMAIN_NAME" 2>/dev/null | grep "has address" | head -n1 | awk '{print \$NF}')

	    if [ -z "\$DNS_IP" ]; then
		DNS_IP=\$(nslookup "\$DOMAIN_NAME" 2>/dev/null | grep "Address:" | tail -n1 | awk '{print \$NF}')
	    fi

	    if [ -n "\$DNS_IP" ]; then
		echo "✅ Domain resolves to: \$DNS_IP"

		# Get server's public IP
		local SERVER_IP
		SERVER_IP=\$(curl -s ifconfig.me 2>/dev/null || curl -s icanhazip.com 2>/dev/null || echo "unknown")

		if [ "\$SERVER_IP" != "unknown" ]; then
		    echo "   Server's public IP: \$SERVER_IP"

		    if [ "\$DNS_IP" == "\$SERVER_IP" ]; then
			echo "   ✅ DNS points to this server!"
		    else
			echo "   ⚠️  WARNING: DNS (\$DNS_IP) does not point to this server (\$SERVER_IP)" 
			echo "   SSL certificate generation may fail."
			echo ""
			read -p "Continue anyway? (y/N): " CONTINUE
			if [[ ! "\$CONTINUE" =~ ^[Yy]\$ ]]; then
			    echo "❌ Aborted. Please update your DNS records first."
			    exit 1
			fi
		    fi
		fi
	    else
		echo "⚠️  WARNING: Cannot resolve \$DOMAIN_NAME"
		echo "   Please ensure DNS is configured correctly."
		echo "   Your domain must point to this server's IP address."
		echo ""
		read -p "Continue anyway? (y/N): " CONTINUE
		if [[ ! "\$CONTINUE" =~ ^[Yy]\$ ]]; then
		    echo "❌ Aborted. Please configure DNS first."
		    exit 1
		fi
	    fi
	}

	# ------------------------------------------------
	# Check if application is running
	# ------------------------------------------------
	check_application() {
	    echo ""
	    echo "🔍 Checking if application is running on port \$APP_PORT..."
	    if ! lsof -Pi :\$APP_PORT -sTCP:LISTEN -t >/dev/null 2>&1 && ! netstat -an 2>/dev/null | grep -q ":\$APP_PORT.*LISTEN"; then
		echo "⚠️  WARNING: No service detected on port \$APP_PORT"
		echo "Please ensure your HireTrack application is running before continuing."
		read -p "Continue anyway? (y/N): " CONTINUE
		if [[ ! "\$CONTINUE" =~ ^[Yy]\$ ]]; then
		    echo "❌ Aborted. Please start your application first with:"
		    echo "   pm2 list  # Check running apps"
		    exit 1
		fi
	    else
		echo "✅ Application is running on port \$APP_PORT"
	    fi
	}

	# ------------------------------------------------
	# Install Nginx
	# ------------------------------------------------
	install_nginx() {
	    if command -v nginx >/dev/null 2>&1; then
		echo "✅ Nginx already installed (\$(nginx -v 2>&1 | cut -d'/' -f2))"
		return
	    fi

	    echo ""
	    echo "📦 Installing Nginx..."
	    if [[ "\$OS_TYPE" == "linux" ]]; then
		if command -v apt-get >/dev/null 2>&1; then
		    sudo apt-get update
		    sudo apt-get install -y nginx
		elif command -v yum >/dev/null 2>&1; then
		    sudo yum install -y epel-release
		    sudo yum install -y nginx
		else
		    echo "❌ Unsupported Linux package manager. Install Nginx manually."
		    exit 1
		fi
	    elif [[ "\$OS_TYPE" == "darwin" ]]; then
		if ! command -v brew >/dev/null 2>&1; then
		    echo "❌ Homebrew not found. Install Homebrew first from https://brew.sh"
		    exit 1
		fi
		brew install nginx
	    else
		echo "❌ Unsupported OS: \$OS_TYPE"
		exit 1
	    fi

	    if ! command -v nginx >/dev/null 2>&1; then
		echo "❌ Nginx installation failed."
		exit 1
	    fi

	    echo "✅ Nginx installed successfully."
	}

	# ------------------------------------------------
	# Start Nginx service
	# ------------------------------------------------
	start_nginx() {
	    echo ""
	    echo "▶️  Starting Nginx service..."

	    if [[ "\$OS_TYPE" == "linux" ]]; then
		sudo systemctl start nginx 2>/dev/null || true
		sudo systemctl enable nginx 2>/dev/null || true
	    elif [[ "\$OS_TYPE" == "darwin" ]]; then
		# Ensure nginx.conf includes servers directory
		if ! grep -q "include.*servers/\*" /usr/local/etc/nginx/nginx.conf 2>/dev/null; then    
		    echo "📝 Configuring Nginx to include servers directory..."
		    sudo sed -i '' '/http {/a\
    include /usr/local/etc/nginx/servers/*;
' /usr/local/etc/nginx/nginx.conf 2>/dev/null || {
			echo "⚠️  Please manually add this line to /usr/local/etc/nginx/nginx.conf:"    
			echo "   include /usr/local/etc/nginx/servers/*;"
			echo "   (inside the http {} block)"
		    }
		fi
		brew services start nginx
	    fi

	    sleep 2

	    if pgrep -x "nginx" >/dev/null; then
		echo "✅ Nginx is running"
	    else
		echo "❌ Nginx failed to start. Checking for errors..."
		sudo nginx -t
		exit 1
	    fi
	}

	# ------------------------------------------------
	# Setup SSL Certificate (Let's Encrypt)
	# ------------------------------------------------
	setup_ssl_certificate() {
	    local USE_HTTPS="false"
	    local CERT_PATH="/etc/letsencrypt/live/\$DOMAIN_NAME/fullchain.pem"
	    local KEY_PATH="/etc/letsencrypt/live/\$DOMAIN_NAME/privkey.pem"

	    echo ""
	    echo "🔐 Setting up SSL Certificate for \$DOMAIN_NAME..."

	    # Skip SSL for localhost
	    if [ "\$DOMAIN_NAME" == "localhost" ]; then
		echo "⚠️  Localhost detected. Skipping SSL setup (will use HTTP only)."
		echo "false"
		return
	    fi

	    # Install certbot if not present
	    echo "📦 Installing certbot for Let's Encrypt..."
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
		    echo "❌ Cannot install certbot automatically."
		    echo "Please install certbot manually: https://certbot.eff.org/"
		    USE_HTTPS="false"
		    echo "\$USE_HTTPS"
		    return
		fi
	    fi

	    if ! command -v certbot >/dev/null 2>&1; then
		echo "❌ Certbot installation failed. Using HTTP only."
		USE_HTTPS="false"
		echo "\$USE_HTTPS"
		return
	    fi

	    echo "✅ Certbot is ready"

	    # Pre-flight checks
	    echo ""
	    echo "🔍 Pre-flight checks for SSL certificate..."
	    echo "   1. Domain: \$DOMAIN_NAME"
	    echo "   2. Email: \$EMAIL"

	    # Check port 80
	    echo "   3. Checking if port 80 is accessible..."
	    if sudo netstat -tlnp 2>/dev/null | grep -q ":80" || sudo lsof -i :80 2>/dev/null | grep -q nginx; then
		echo "   ✅ Port 80 is accessible"
	    else
		echo "   ⚠️  Port 80 may not be accessible (needed for Let's Encrypt verification)"     
	    fi

	    # Obtain or renew certificate
	    echo ""
	    echo "🔐 Obtaining/renewing Let's Encrypt certificate for \$DOMAIN_NAME..."
	    echo ""
	    echo "This will:"
	    echo "  - Verify domain ownership via HTTP-01 challenge"
	    echo "  - Install certificates at /etc/letsencrypt/live/\$DOMAIN_NAME/"
	    echo "  - Setup auto-renewal via certbot timer"
	    echo ""
	    read -p "Proceed with SSL certificate generation/renewal? (Y/n): " PROCEED_SSL

	    if [[ "\$PROCEED_SSL" =~ ^[Nn]\$ ]]; then
		echo "⚠️  Skipping SSL setup. Using HTTP only."
		USE_HTTPS="false"
		echo "\$USE_HTTPS"
		return
	    fi

	    # Try standalone mode
	    if sudo certbot certonly \
		--standalone \
		--non-interactive \
		--agree-tos \
		--email "\$EMAIL" \
		--preferred-challenges http \
		-d "\$DOMAIN_NAME" \
		--pre-hook "systemctl stop nginx 2>/dev/null || true" \
		--post-hook "systemctl start nginx 2>/dev/null || true" 2>&1 | tee /tmp/certbot_\$DOMAIN_NAME.log; then

		USE_HTTPS="true"
		echo ""
		echo "✅ Successfully obtained/renewed Let's Encrypt certificate for \$DOMAIN_NAME!"     
		echo "   Certificate: \$CERT_PATH"
		echo "   Private Key: \$KEY_PATH"
		echo "   Auto-renewal is configured via certbot timer."
	    else
		echo ""
		echo "❌ Failed to obtain/renew Let's Encrypt certificate for \$DOMAIN_NAME."
		echo ""
		echo "Common issues:"
		echo "  1. Domain '\$DOMAIN_NAME' doesn't point to this server"
		echo "  2. Firewall blocking port 80/443"
		echo "  3. Another service using port 80"
		echo ""
		echo "Check logs at: /tmp/certbot_\$DOMAIN_NAME.log"
		echo ""

		read -p "Proceed with HTTP only? (Y/n): " PROCEED_HTTP
		if [[ "\$PROCEED_HTTP" =~ ^[Nn]\$ ]]; then
		    echo "❌ Aborting. Please fix DNS/firewall issues and try again."
		    exit 1
		fi

		echo "⚠️  Proceeding with HTTP only for \$DOMAIN_NAME."
		echo "   You can add HTTPS later with:"
		echo "   sudo certbot certonly --nginx -d \$DOMAIN_NAME"
		USE_HTTPS="false"
	    fi

	    echo "\$USE_HTTPS"
	}

	# ------------------------------------------------
	# Configure Nginx
	# ------------------------------------------------
	configure_nginx() {
	    local USE_HTTPS="\$1"
	    local NGINX_CONF_FILE
	    local CERT_PATH="/etc/letsencrypt/live/\$DOMAIN_NAME/fullchain.pem"
	    local KEY_PATH="/etc/letsencrypt/live/\$DOMAIN_NAME/privkey.pem"

	    echo ""
	    echo "📝 Configuring Nginx for \$DOMAIN_NAME..."

	    # Set configuration file path
	    if [[ "\$OS_TYPE" == "linux" ]]; then
		NGINX_CONF_FILE="\$NGINX_CONF_DIR/\$DOMAIN_NAME"
		NGINX_ENABLED_FILE="\$NGINX_ENABLED_DIR/\$DOMAIN_NAME"
	    elif [[ "\$OS_TYPE" == "darwin" ]]; then
		NGINX_CONF_FILE="\$NGINX_CONF_DIR/\$DOMAIN_NAME"
		mkdir -p "\$NGINX_CONF_DIR"
	    fi

	    # Backup existing configuration
	    if [ -f "\$NGINX_CONF_FILE" ]; then
		local BACKUP_FILE="\$NGINX_BACKUP_DIR/\$DOMAIN_NAME.backup.\$(date +%s)"
		sudo cp "\$NGINX_CONF_FILE" "\$BACKUP_FILE"
		echo "📦 Backed up existing config to: \$BACKUP_FILE"
	    fi

	    # Generate HTTP configuration
	    local NGINX_CONF_CONTENT=\$(cat <<INNEREOF
# HireTrack Nginx Configuration
# Generated on: \$(date)
# Domain: \$DOMAIN_NAME
# Port: \$APP_PORT

server {
    listen 80;
    listen [::]:80;
    server_name \$DOMAIN_NAME;

    # Redirect HTTP to HTTPS if HTTPS is enabled
    \$( [ "\$USE_HTTPS" = "true" ] && echo "return 301 https://\\\$server_name\\\$request_uri;" || echo "" )

    client_max_body_size 500M;
    chunked_transfer_encoding on;

    # Buffer sizes
    proxy_buffer_size 256k;
    proxy_buffers 8 256k;
    proxy_busy_buffers_size 512k;
    large_client_header_buffers 4 16k;

    location / {
        proxy_pass http://localhost:\$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
        proxy_cache_bypass \\\$http_upgrade;
        proxy_buffering off;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    # Specific location for assets
    location /assets {
        proxy_pass http://localhost:\$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
        proxy_cache_bypass \\\$http_upgrade;
        proxy_buffering off;
        gzip off;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    error_log \$LOG_DIR/\${DOMAIN_NAME}.error.log;
    access_log \$LOG_DIR/\${DOMAIN_NAME}.access.log;
}
INNEREOF
)

	    # Append HTTPS block if not localhost
	    if [ "\$DOMAIN_NAME" != "localhost" ]; then
		NGINX_CONF_CONTENT+=\$(cat <<INNEREOF

# HTTPS server block
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name \$DOMAIN_NAME;

    client_max_body_size 500M;
    chunked_transfer_encoding on;

    # SSL configuration
    ssl_certificate \$CERT_PATH;
    ssl_certificate_key \$KEY_PATH;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;
    add_header Strict-Transport-Security "max-age=63072000; includeSubdomains; preload";

    # Buffer sizes
    proxy_buffer_size 256k;
    proxy_buffers 8 256k;
    proxy_busy_buffers_size 512k;
    large_client_header_buffers 4 16k;

    location / {
        proxy_pass http://localhost:\$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
        proxy_cache_bypass \\\$http_upgrade;
        proxy_buffering off;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    # Specific location for assets
    location /assets {
        proxy_pass http://localhost:\$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
        proxy_cache_bypass \\\$http_upgrade;
        proxy_buffering off;
        gzip off;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    error_log \$LOG_DIR/\${DOMAIN_NAME}.error.log;
    access_log \$LOG_DIR/\${DOMAIN_NAME}.access.log;
}
INNEREOF
)
	    fi

	    # Write configuration file
	    echo "\$NGINX_CONF_CONTENT" | sudo tee "\$NGINX_CONF_FILE" >/dev/null
	    echo "✅ Configuration written to: \$NGINX_CONF_FILE"

	    # Enable site on Linux
	    if [[ "\$OS_TYPE" == "linux" ]]; then
		if [ ! -L "\$NGINX_ENABLED_FILE" ]; then
		    sudo ln -sf "\$NGINX_CONF_FILE" "\$NGINX_ENABLED_FILE"
		    echo "✅ Site enabled at: \$NGINX_ENABLED_FILE"
		fi
	    fi

	    # Test configuration
	    echo ""
	    echo "🧪 Testing Nginx configuration..."
	    if sudo nginx -t; then
		echo "✅ Configuration test passed!"
	    else
		echo "❌ Configuration test failed!"
		echo ""
		echo "Rolling back to previous configuration..."
		if [ -f "\$NGINX_BACKUP_DIR/\$DOMAIN_NAME.backup."* ]; then
		    local LATEST_BACKUP=\$(ls -t "\$NGINX_BACKUP_DIR"/\$DOMAIN_NAME.backup.* 2>/dev/null | head -n1)
		    if [ -n "\$LATEST_BACKUP" ]; then
			sudo cp "\$LATEST_BACKUP" "\$NGINX_CONF_FILE"
			echo "✅ Rolled back to: \$LATEST_BACKUP"
		    fi
		fi
		exit 1
	    fi

	    # Reload Nginx
	    echo ""
	    echo "🔄 Reloading Nginx..."
	    if [[ "\$OS_TYPE" == "linux" ]]; then
		sudo systemctl reload nginx
	    elif [[ "\$OS_TYPE" == "darwin" ]]; then
		brew services restart nginx
	    fi

	    sleep 2

	    if pgrep -x "nginx" >/dev/null; then
		echo "✅ Nginx reloaded successfully!"
	    else
		echo "❌ Nginx failed to reload!"
		exit 1
	    fi
	}

	# ------------------------------------------------
	# Verify setup
	# ------------------------------------------------
	verify_setup() {
	    local USE_HTTPS="\$1"

	    echo ""
	    echo "🔍 Verifying setup for \$DOMAIN_NAME..."

	    # Check Nginx process
	    if pgrep -x "nginx" >/dev/null; then
		echo "✅ Nginx process is running"
	    else
		echo "❌ Nginx process not found"
		return 1
	    fi

	    # Test HTTP
	    echo ""
	    echo "Testing HTTP connection to \$DOMAIN_NAME..."
	    local HTTP_CODE
	    HTTP_CODE=\$(curl -s -o /dev/null -w "%{http_code}" "http://localhost" -H "Host: \$DOMAIN_NAME" 2>/dev/null || echo "000")

	    if [[ "\$HTTP_CODE" =~ ^(200|301|302|404)\$ ]]; then
		echo "✅ HTTP connection successful (Status: \$HTTP_CODE)"
	    else
		echo "⚠️  HTTP connection returned status: \$HTTP_CODE"
	    fi

	    # Test HTTPS if enabled
	    if [ "\$USE_HTTPS" = "true" ] || [ "\$DOMAIN_NAME" != "localhost" ]; then
		echo ""
		echo "Testing HTTPS connection to \$DOMAIN_NAME..."
		local HTTPS_CODE
		HTTPS_CODE=\$(curl -s -o /dev/null -w "%{http_code}" "https://\$DOMAIN_NAME" --insecure 2>/dev/null || echo "000")

		if [[ "\$HTTPS_CODE" =~ ^(200|301|302|404)\$ ]]; then
		    echo "✅ HTTPS connection successful (Status: \$HTTPS_CODE)"
		else
		    echo "⚠️  HTTPS connection returned status: \$HTTPS_CODE"
		fi
	    fi

	    # Show log file paths
	    echo ""
	    echo "📋 Log files for \$DOMAIN_NAME:"
	    echo "   - Error log:  \$LOG_DIR/\${DOMAIN_NAME}.error.log"
	    echo "   - Access log: \$LOG_DIR/\${DOMAIN_NAME}.access.log"

	    # Show recent errors if any
	    if [ -f "\$LOG_DIR/\${DOMAIN_NAME}.error.log" ]; then
		local ERROR_COUNT
		ERROR_COUNT=\$(sudo tail -n 50 "\$LOG_DIR/\${DOMAIN_NAME}.error.log" 2>/dev/null | grep -c "error" || echo "0")
		if [ "\$ERROR_COUNT" -gt 0 ] 2>/dev/null; then
		    echo "   ⚠️  Found \$ERROR_COUNT recent errors. Check logs with:"
		    echo "      sudo tail -f \$LOG_DIR/\${DOMAIN_NAME}.error.log"
		fi
	    fi
	}

	# ------------------------------------------------
	# Print summary
	# ------------------------------------------------
	print_summary() {
	    local USE_HTTPS="\$1"

	    echo ""
	    echo "════════════════════════════════════════════════"
	    echo "✅ Nginx Setup Complete!"
	    echo "════════════════════════════════════════════════"
	    echo ""
	    echo "📋 Configuration Summary:"
	    echo "   - Domain Name: \$DOMAIN_NAME"
	    echo "   - Application Port: \$APP_PORT"
	    echo "   - Protocol: \$( [ "\$USE_HTTPS" = "true" ] || [ "\$DOMAIN_NAME" != "localhost" ] && echo "HTTP & HTTPS" || echo "HTTP only")"
	    echo ""

	    if [ "\$USE_HTTPS" = "true" ] || [ "\$DOMAIN_NAME" != "localhost" ]; then
		echo "🔐 SSL/TLS:"
		echo "   - Certificate: /etc/letsencrypt/live/\$DOMAIN_NAME/fullchain.pem"
		echo "   - Auto-renewal: Enabled (certbot timer)"
		echo "   - Test renewal: sudo certbot renew --dry-run"
		echo ""
	    fi

	    echo "🌐 Access your application:"
	    if [ "\$USE_HTTPS" = "true" ] || [ "\$DOMAIN_NAME" != "localhost" ]; then
		echo "   - https://\$DOMAIN_NAME"
		echo "   - http://\$DOMAIN_NAME (redirects to HTTPS)"
	    else
		echo "   - http://\$DOMAIN_NAME"
	    fi
	    echo ""

	    echo "📝 Nginx Commands:"
	    if [[ "\$OS_TYPE" == "linux" ]]; then
		echo "   - Test config:   sudo nginx -t"
		echo "   - Reload:        sudo systemctl reload nginx"
		echo "   - Restart:       sudo systemctl restart nginx"
		echo "   - Status:        sudo systemctl status nginx"
		echo "   - Logs:          sudo journalctl -u nginx -f"
	    elif [[ "\$OS_TYPE" == "darwin" ]]; then
		echo "   - Test config:   sudo nginx -t"
		echo "   - Reload:        brew services restart nginx"
		echo "   - Status:        brew services list | grep nginx"
		echo "   - Logs:          tail -f \$LOG_DIR/\${DOMAIN_NAME}.error.log"
	    fi
	    echo ""

	    echo "📁 Files:"
	    echo "   - Config:  \$( [ "\$OS_TYPE" == "linux" ] && echo "\$NGINX_CONF_DIR/\$DOMAIN_NAME" || echo "\$NGINX_CONF_DIR/\$DOMAIN_NAME")"
	    echo "   - Backups: \$NGINX_BACKUP_DIR/"
	    echo "   - Logs:    \$LOG_DIR/"
	    echo ""

	    if [ "\$USE_HTTPS" = "false" ] && [ "\$DOMAIN_NAME" != "localhost" ]; then
		echo "🔐 To add HTTPS later:"
		echo "   1. Ensure DNS points to this server"
		echo "   2. Run: sudo certbot certonly --nginx -d \$DOMAIN_NAME"
		echo "   3. Re-run this script or manually update Nginx config"
		echo ""
	    fi

	    echo "You can register the first organization from the URL given below: "
            echo "https://\$DOMAIN_NAME/register/org"

	    echo "════════════════════════════════════════════════"
	}

	# ------------------------------------------------
	# Cleanup function for errors
	# ------------------------------------------------
	cleanup_on_error() {
	    echo ""
	    echo "❌ Setup failed. Cleaning up..."

	    # Restore backup if exists
	    if [ -f "\$NGINX_BACKUP_DIR/\$DOMAIN_NAME.backup."* ]; then
		local LATEST_BACKUP=\$(ls -t "\$NGINX_BACKUP_DIR"/\$DOMAIN_NAME.backup.* 2>/dev/null | head -n1)
		if [ -n "\$LATEST_BACKUP" ]; then
		    echo "🔄 Restoring previous configuration..."
		    sudo cp "\$LATEST_BACKUP" "\$NGINX_CONF_DIR/\$DOMAIN_NAME" 2>/dev/null || true
		    sudo nginx -t && sudo systemctl reload nginx 2>/dev/null || brew services restart nginx 2>/dev/null
		fi
	    fi

	    echo "Please check the error messages above and try again."
	    exit 1
	}

	trap cleanup_on_error ERR

	# ------------------------------------------------
	# Main execution flow
	# ------------------------------------------------
	main() {
	    echo "════════════════════════════════════════════════"
	    echo "  HireTrack Nginx Setup Script"
	    echo "════════════════════════════════════════════════"
	    echo ""

	    # Step 1: Prompt for domain name
	    prompt_for_domain

	    # Step 2: Prompt for email
	    prompt_for_email

	    # Step 3: Save domain and email to config
	    save_domain_to_config

	    # Step 4: Check DNS resolution
	    check_dns_resolution

	    # Step 5: Check if application is running
	    check_application

	    # Step 6: Install Nginx
	    install_nginx

	    # Step 7: Start Nginx
	    start_nginx

	    # Step 8: Setup SSL
	    local USE_HTTPS
	    USE_HTTPS=\$(setup_ssl_certificate)

	    # Step 9: Configure Nginx with HTTP and HTTPS (if not localhost)
	    configure_nginx "\$USE_HTTPS"

	    # Step 10: Verify setup
	    verify_setup "\$USE_HTTPS"

	    # Step 11: Print summary
	    print_summary "\$USE_HTTPS"
	}

	# Run main function
	main
	EOF

    chmod +x "$NGINX_SCRIPT"
    echo "✅ Nginx setup script created at $NGINX_SCRIPT"

    # Execute Nginx setup script
    echo "▶️ Running Nginx setup..."
    bash "$NGINX_SCRIPT" || {
        echo "❌ Nginx setup failed. Check logs and try setting up the domain again by using the --domain command."
        exit 1
    }
    echo "✅ Nginx setup completed."
}

# ------------------------------------------------
# Restart PM2 Service
# ------------------------------------------------
restart_pm2_service() {
    local VERSION_NAME=$(jq -r '.installedVersion // empty' "$CONFIG_PATH")
    if [ -z "$VERSION_NAME" ]; then
        echo "❌ No installed version found in config. Cannot restart PM2 service."
        return 1
    fi

    echo "🔄 Restarting PM2 service for hiretrack-$VERSION_NAME..."
    pm2 restart "hiretrack-$VERSION_NAME" || {
        echo "❌ Failed to restart PM2 service hiretrack-$VERSION_NAME."
        return 1
    }
    pm2 save --force
    echo "✅ PM2 service hiretrack-$VERSION_NAME restarted successfully."
}

# ------------------------------------------------
# Cron Setup
# ------------------------------------------------
setup_cron() {
    local OS_TYPE=$(uname | tr '[:upper:]' '[:lower:]')
    local CRON_NAME="hiretrack-autoupdate"
    local CRON_ENTRY="*/2 * * * * PATH=/usr/local/bin:/usr/bin:/bin bash $SCRIPT_PATH --update >> $CRON_LOG_FILE 2>&1"

    if [[ "$OS_TYPE" == "linux" || "$OS_TYPE" == "darwin" ]]; then
        local CURRENT_CRON=$(crontab -l 2>/dev/null || echo "")

        # Check if the exact cron command already exists
        if ! echo "$CURRENT_CRON" | grep -Fq "$CRON_ENTRY"; then
            # Append comment and cron command
            (echo "$CURRENT_CRON"; echo "# CRON_NAME:$CRON_NAME"; echo "$CRON_ENTRY") | crontab -
            echo "✅ Cron job '$CRON_NAME' added. Logs: $CRON_LOG_FILE"
        else
            echo "✅ Cron job '$CRON_NAME' already exists. Logs: $CRON_LOG_FILE"
        fi
    else
        echo "❌ Unsupported OS: $OS_TYPE. Cannot setup cron."
    fi
}

# ------------------------------------------------
# Full Installation
# ------------------------------------------------
install_all() {
    local EMAIL="$1"
    [ -z "$EMAIL" ] && EMAIL=$(prompt_for_email)
    echo "==== Starting installation for $EMAIL ===="

    create_default_config "$EMAIL"
    [ ! -f "$LICENSE_PATH" ] && register_license "$EMAIL"
    check_update_and_install
    setup_cron
    setup_nginx
    restart_pm2_service

    echo "==== Installation complete! ===="
}


# ------------------------------------------------
# Main Entry Point
# ------------------------------------------------
check_dep curl
check_dep jq
check_dep tar
check_dep shasum
check_pm2
# --install-version)
    #     install_specific_version "${2:-}"
    #     ;;
case "${1:-}" in
    --install)
        install_all "${2:-}"
        ;;
    --register)
        register_license "${2:-}"
        ;;
    --update)
        check_update_and_install
        ;;
    --setup-cron)
        setup_cron
        ;;
    --domain)
        setup_nginx
        ;;
    --help)
        echo "Usage: $0 [--domain] [--install [email]] [--register [email]] [--update] [--setup-cron]"
        exit 0
        ;;
    *)
        install_all "${2:-}"
        ;;
esac
