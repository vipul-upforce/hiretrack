#!/bin/bash

# HireTrack Pipeline - Local Execution Script
# This script replicates your GitLab CI/CD pipeline locally

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ==================== OS DETECTION ====================
detect_os() {
  case "$(uname -s)" in
    Darwin*)
      echo "macOS"
      ;;
    Linux*)
      echo "Linux"
      ;;
    CYGWIN*|MINGW*|MSYS*)
      echo "Windows"
      ;;
    *)
      echo "Unknown"
      ;;
  esac
}

OS_TYPE=$(detect_os)
echo -e "${BLUE}Detected Operating System: ${YELLOW}$OS_TYPE${NC}"

# Set tar options based on OS
if [ "$OS_TYPE" = "macOS" ]; then
  echo -e "${YELLOW}macOS detected: Setting COPYFILE_DISABLE to prevent ._ files${NC}"
  export COPYFILE_DISABLE=1
  TAR_EXCLUDE_OPTS="--exclude='._*' --exclude='.DS_Store'"
else
  TAR_EXCLUDE_OPTS=""
fi

# ==================== CONFIGURATION ====================
# Set these environment variables before running
# Export them or create a .env.local file

if [ -f ".env.local" ]; then
  echo "Loading environment from .env.local"
  export $(cat .env.local | grep -v '#' | xargs)
fi

# Verify required variables
REQUIRED_VARS=("GITHUB_TOKEN_DEV" "MONGODB_URI" "NEXT_PUBLIC_RECAPTCHA_SITE_KEY" "RECAPTCHA_SECRET_KEY" "ENVIRONMENT" "BASE_URL" "LICENSE_VALIDATION_URL" "ALLOWED_ORIGINS" "SENTRY_AUTH_TOKEN" "CRON_SECRET")

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo -e "${RED}ERROR: Missing required variable: $var${NC}"
    exit 1
  fi
done

# ==================== SETUP ====================
GITHUB_REPO="rahulp162/hiretrack-release"
VERSION_PREFIX="v"
CURRENT_DIR=$(pwd)

echo -e "${BLUE}Starting HireTrack Pipeline Execution${NC}"
echo "Repository: $GITHUB_REPO"
echo "Current directory: $CURRENT_DIR"

# ==================== BUILD STAGE ====================
echo -e "\n${BLUE}=== BUILD STAGE ===${NC}"

NODE_VERSION=$(node -v)
echo "Node version: $NODE_VERSION"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Install curl and jq if not available (Linux only)
if [ "$OS_TYPE" = "Linux" ]; then
  if ! command -v curl &> /dev/null; then
    echo "Installing curl..."
    apt-get update && apt-get install -y curl
  fi

  if ! command -v jq &> /dev/null; then
    echo "Installing jq..."
    apt-get install -y jq
  fi
elif [ "$OS_TYPE" = "macOS" ]; then
  if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}jq not found. Install with: brew install jq${NC}"
    exit 1
  fi
fi

# Get latest GitHub release tag
echo "Fetching latest release tag from GitHub..."
LAST_TAG=$(curl -s -H "Authorization: token $GITHUB_TOKEN_DEV" https://api.github.com/repos/$GITHUB_REPO/releases/latest | jq -r .tag_name)
echo "Last release tag: $LAST_TAG"

# Version calculation
if [ "$LAST_TAG" = "null" ] || [ -z "$LAST_TAG" ]; then
  MAJOR=1
  MINOR=0
  PATCH=0
  echo "No previous tags found. Starting at v1.0.0"
else
  if ! echo "$LAST_TAG" | grep -E "^${VERSION_PREFIX}[0-9]+\.[0-9]+\.[0-9]+$"; then
    echo -e "${RED}ERROR: Invalid tag format: $LAST_TAG${NC}"
    exit 1
  fi
  VERSION_NUM=$(echo "$LAST_TAG" | sed "s/^$VERSION_PREFIX//")
  MAJOR=$(echo "$VERSION_NUM" | cut -d. -f1)
  MINOR=$(echo "$VERSION_NUM" | cut -d. -f2)
  PATCH=$(echo "$VERSION_NUM" | cut -d. -f3)
fi

echo "Current version: ${VERSION_PREFIX}${MAJOR}.${MINOR}.${PATCH}"

# Determine version bump from commit message
COMMIT_MSG=$(git log -1 --pretty=%B)
echo "Last commit message: $COMMIT_MSG"

if echo "$COMMIT_MSG" | grep -q "^Major:"; then
  echo "🚀 Major release"
  MAJOR=$((MAJOR+1))
  MINOR=0
  PATCH=0
elif echo "$COMMIT_MSG" | grep -q "^Feat:"; then
  echo "✨ Minor release"
  MINOR=$((MINOR+1))
  PATCH=0
else
  echo "🐛 Patch release"
  PATCH=$((PATCH+1))
fi

CURRENT_VERSION="${VERSION_PREFIX}${MAJOR}.${MINOR}.${PATCH}"
VERSION_WITHOUT_PREFIX="${MAJOR}.${MINOR}.${PATCH}"

echo -e "${GREEN}New version: $CURRENT_VERSION${NC}"

# Create version file
cat > version.env << EOF
CURRENT_VERSION=$CURRENT_VERSION
VERSION_WITHOUT_PREFIX=$VERSION_WITHOUT_PREFIX
EOF

# Create .env file
echo "Creating .env file..."
cat > .env << EOF
MONGODB_URI=$MONGODB_URI
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=$NEXT_PUBLIC_RECAPTCHA_SITE_KEY
RECAPTCHA_SECRET_KEY=$RECAPTCHA_SECRET_KEY
ENVIRONMENT=$ENVIRONMENT
BASE_URL=$BASE_URL
NEXT_PUBLIC_BASE_URL=$BASE_URL
LICENSE_VALIDATION_URL=$LICENSE_VALIDATION_URL
ALLOWED_ORIGINS=$ALLOWED_ORIGINS
NODE_VERSION=$NODE_VERSION
SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN
CRON_SECRET=$CRON_SECRET
EOF

# Update package.json version
echo "Updating package.json version to: $VERSION_WITHOUT_PREFIX"
jq --arg version "$VERSION_WITHOUT_PREFIX" '.version = $version' package.json > package.json.tmp && mv package.json.tmp package.json

# Build Next.js
echo "Building Next.js application..."
NODE_OPTIONS="--max-old-space-size=3072" npx next build

# Obfuscate server files (including server-ws.cjs)
# echo "Obfuscating server files..."
# npx tsx scripts/obfuscate-server.ts

# Create tarball with OS-specific handling
TARBALL_NAME="hiretrack-${CURRENT_VERSION}.tar.gz"
echo "Creating tarball: $TARBALL_NAME"

mkdir -p temp

if [ "$OS_TYPE" = "macOS" ]; then
  echo -e "${YELLOW}Using macOS-specific tar options to exclude ._ files${NC}"
  # macOS tar with exclusions
  COPYFILE_DISABLE=1 tar -czvf temp/$TARBALL_NAME \
    --exclude='._*' \
    --exclude='.DS_Store' \
    --exclude='.AppleDouble' \
    --exclude='.LSOverride' \
    package.json package-lock.json ecosystem.config.cjs .next .env public server-ws.cjs
else
  # Standard tar for Linux/other systems
  tar -czvf temp/$TARBALL_NAME \
    package.json package-lock.json ecosystem.config.cjs .next .env public server-ws.cjs
fi

mv temp/$TARBALL_NAME .
rm -rf temp

echo "TARBALL_NAME=$TARBALL_NAME" >> version.env
echo -e "${GREEN}Build completed successfully!${NC}"

# Verify tarball contents (optional - helps debugging)
echo -e "${BLUE}Verifying tarball contents...${NC}"
if tar -tzf $TARBALL_NAME | grep -q "^\._"; then
  echo -e "${RED}WARNING: Tarball contains ._ files!${NC}"
else
  echo -e "${GREEN}✓ Tarball is clean (no ._ files)${NC}"
fi

# ==================== RELEASE STAGE ====================
echo -e "\n${BLUE}=== RELEASE STAGE ===${NC}"

source version.env

# Test GitHub token
echo "Testing GitHub token..."
TOKEN_TEST=$(curl -s -H "Authorization: Bearer $GITHUB_TOKEN_DEV" https://api.github.com/user | jq -r .message)
if [ "$TOKEN_TEST" = "Bad credentials" ]; then
  echo -e "${RED}ERROR: GitHub token is invalid or expired!${NC}"
  exit 1
fi
echo "GitHub token is valid"

# Check if tag already exists
NEW_TAG="$CURRENT_VERSION"
TAG_RESPONSE=$(curl -s -H "Authorization: Bearer $GITHUB_TOKEN_DEV" https://api.github.com/repos/$GITHUB_REPO/git/refs/tags/$NEW_TAG)
TAG_CHECK=$(echo "$TAG_RESPONSE" | jq -r .message)

if [ "$TAG_CHECK" != "Not Found" ]; then
  echo "Tag $NEW_TAG already exists, checking for release..."
  RELEASE_RESPONSE=$(curl -s -H "Authorization: Bearer $GITHUB_TOKEN_DEV" https://api.github.com/repos/$GITHUB_REPO/releases/tags/$NEW_TAG)
  RELEASE_CHECK=$(echo "$RELEASE_RESPONSE" | jq -r .id)

  if [ "$RELEASE_CHECK" != "null" ] && [ -n "$RELEASE_CHECK" ]; then
    echo -e "${RED}WARNING: Release for tag $NEW_TAG already exists (ID: $RELEASE_CHECK), skipping${NC}"
    exit 0
  else
    echo "Tag exists but no release. Deleting orphaned tag..."
    DELETE_RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE -H "Authorization: Bearer $GITHUB_TOKEN_DEV" https://api.github.com/repos/$GITHUB_REPO/git/refs/tags/$NEW_TAG)
    DELETE_CODE=$(echo "$DELETE_RESPONSE" | tail -n1)
    if [ "$DELETE_CODE" = "204" ]; then
      echo "Tag deleted successfully"
    fi
  fi
fi

# Create GitHub release
echo "Creating GitHub release for $CURRENT_VERSION..."
RELEASE_BODY="$COMMIT_MSG"

PAYLOAD=$(jq -n \
  --arg tag "$CURRENT_VERSION" \
  --arg name "$CURRENT_VERSION" \
  --arg body "$RELEASE_BODY" \
  '{
    tag_name: $tag,
    name: $name,
    body: $body,
    draft: false,
    prerelease: false
  }')

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Authorization: Bearer $GITHUB_TOKEN_DEV" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  https://api.github.com/repos/$GITHUB_REPO/releases)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "201" ]; then
  echo -e "${RED}ERROR: Failed to create release (HTTP $HTTP_CODE)${NC}"
  echo "Response: $BODY"
  exit 1
fi

RELEASE_ID=$(echo "$BODY" | jq -r .id)
echo -e "${GREEN}GitHub release created successfully! ID: $RELEASE_ID${NC}"

# Upload tarball
echo "Uploading tarball $TARBALL_NAME..."
UPLOAD_URL=$(curl -s -H "Authorization: Bearer $GITHUB_TOKEN_DEV" https://api.github.com/repos/$GITHUB_REPO/releases/$RELEASE_ID | jq -r .upload_url | sed "s/{?name,label}//")

UPLOAD_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Authorization: Bearer $GITHUB_TOKEN_DEV" \
  -H "Content-Type: application/gzip" \
  --data-binary @$TARBALL_NAME \
  "$UPLOAD_URL?name=$TARBALL_NAME")

UPLOAD_HTTP_CODE=$(echo "$UPLOAD_RESPONSE" | tail -n1)
UPLOAD_BODY=$(echo "$UPLOAD_RESPONSE" | sed '$d')

if [ "$UPLOAD_HTTP_CODE" != "201" ]; then
  echo -e "${RED}ERROR: Failed to upload tarball (HTTP $UPLOAD_HTTP_CODE)${NC}"
  echo "Response: $UPLOAD_BODY"
  exit 1
fi

# Check for migration.cjs and upload as asset
MIGRATION_SCRIPT="migration-scripts/migration.cjs"
MIGRATION_ASSET_NAME="migrationScriptUrl.cjs"
if [ -f "$MIGRATION_SCRIPT" ]; then
  echo "Uploading migration script $MIGRATION_SCRIPT as $MIGRATION_ASSET_NAME..."
  MIGRATION_UPLOAD_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Authorization: Bearer $GITHUB_TOKEN_DEV" \
    -H "Content-Type: application/javascript" \
    --data-binary @"$MIGRATION_SCRIPT" \
    "$UPLOAD_URL?name=$MIGRATION_ASSET_NAME")

  MIGRATION_UPLOAD_HTTP_CODE=$(echo "$MIGRATION_UPLOAD_RESPONSE" | tail -n1)
  MIGRATION_UPLOAD_BODY=$(echo "$MIGRATION_UPLOAD_RESPONSE" | sed '$d')

  if [ "$MIGRATION_UPLOAD_HTTP_CODE" != "201" ]; then
    echo -e "${RED}ERROR: Failed to upload migration script (HTTP $MIGRATION_UPLOAD_HTTP_CODE)${NC}"
    echo "Response: $MIGRATION_UPLOAD_BODY"
    exit 1
  fi
  echo -e "${GREEN}Migration script uploaded successfully as $MIGRATION_ASSET_NAME!${NC}"
else
  echo -e "${RED}ERROR: Migration script $MIGRATION_SCRIPT not found!${NC}"
fi

echo -e "${GREEN}✅ Release $CURRENT_VERSION created successfully!${NC}"
echo "Tarball uploaded: $TARBALL_NAME"
echo "Migration script uploaded: $MIGRATION_ASSET_NAME"

echo -e "\n${BLUE}=== Pipeline Completed ===${NC}"
echo -e "OS: ${YELLOW}$OS_TYPE${NC}"
echo -e "Version: ${GREEN}$CURRENT_VERSION${NC}"