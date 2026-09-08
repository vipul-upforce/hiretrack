# HireTrack

Open-source hiring platform (jobs, candidates, interviews, AI resume analysis). Stack: Next.js, TypeScript, MongoDB.

## 🚀 Getting Started

HireTrack is open source. There is no license server and no license file.

Choose one path:

| Path | Use when |
|------|----------|
| **Installer (GitHub Releases)** | Production / self-hosting on a server |
| **Local from source** | Development on your machine |

### System requirements (self-host / production)

| | Minimum | Recommended |
|---|---------|-------------|
| **RAM** | 1 GB | 4 GB+ |
| **CPU** | 1 vCPU | 2+ vCPUs |
| **Storage** | 4 GB | 10 GB+ |
| **OS** | Linux (Ubuntu 22.04+) or macOS | Ubuntu 22.04/24.04 |

### Path A — Installer (recommended for production)

The installer downloads a **pre-built** release tarball, installs Node/MongoDB/PM2 as needed, and starts the app under PM2.

**Prerequisites**

- Linux or macOS with `sudo` / root for package installs
- Outbound HTTPS (GitHub Releases + package mirrors)
- `curl` available

**Install**

```bash
curl -fsSL https://raw.githubusercontent.com/vipul-upforce/hiretrack/main/installer.sh -o installer.sh
chmod +x installer.sh
./installer.sh --install
```

The installer is interactive. It will ask how to connect MongoDB (Atlas vs local) and can configure domain / Nginx / SSL.

**What it does**

- Installs into `~/.hiretrack/APP`
- Writes `.env` in that directory (not `.env.local`)
- Starts the app with PM2 on port **3000** (or behind Nginx if you set a domain)
- Optionally sets up auto-update cron and a local PDF→Markdown helper for bulk CV parsing

**After install**

1. Open the app: `http://YOUR_SERVER_IP:3000` (or the domain you configured).
2. Create your organization: `/register/org`
3. Sign in at `/auth/login`
4. In **Settings**, configure email, file storage, and AI keys.

**Useful installer commands**

```bash
./installer.sh --help              # full command list
./installer.sh --update            # install newer release
./installer.sh --domain            # domain + Nginx + SSL
./installer.sh --rollback          # roll back to previous version
./installer.sh --setup-cron        # auto-update cron
./installer.sh --backup            # backup ~/.hiretrack (excludes node_modules)
```

Logs: `pm2 logs` (or files under `~/.hiretrack/logs`).

**Releases vs `main`**

The installer points at `vipul-upforce/hiretrack` and downloads `hiretrack-vX.Y.Z.tar.gz` from that repo’s **Releases** tab. Source on `main` is **not** an installable build.

Until a Release exists, the installer fails with GitHub API `Not Found`. See [Publishing a release](#-publishing-a-release-maintainers) below. Forks only: `export GITHUB_RELEASE_REPO=yourname/hiretrack`. Optional: `GITHUB_TOKEN` for private repos or higher API limits. See [chunked downloads](docs/chunked-downloads.md).

### Path B — Local development

**Prerequisites**

- **Node.js 20** (18+ may work; releases and CI use 20)
- **MongoDB 5.0+** already running (local or Atlas)
- npm

**Setup**

1. Clone and install

   ```bash
   git clone https://github.com/vipul-upforce/hiretrack.git
   cd hiretrack
   npm install
   ```

2. Environment file (local uses `.env.local`)

   ```bash
   cp .env.example .env.local
   ```

   Set at least:

   | Variable | Required | Notes |
   |----------|----------|--------|
   | `MONGODB_URI` | Yes | e.g. `mongodb://localhost:27017/hiretrack` |
   | `JWT_SECRET` | Yes | long random string |
   | `CRON_SECRET` | Yes | long random string (reminder / cron routes) |
   | `BASE_URL` / `NEXT_PUBLIC_BASE_URL` | Recommended | default `http://localhost:3000` |
   | `GOOGLE_CALENDAR_WEBHOOK_TOKEN` | Production calendar | do not rely on the built-in default |

   Optional keys (AI, Sentry, reCAPTCHA, storage) are listed in `.env.example` and can also be set in the app UI.

3. Start the dev server

   ```bash
   npm run dev
   ```

4. Open `http://localhost:3000` → register at `/register/org` → sign in at `/auth/login`.

`npm run dev` uses Next.js only. Production `npm start` runs the custom WebSocket server (`server-ws.cjs`).

### Production build from source (without installer)

Prefer the installer for servers. If you build from a clone:

```bash
cp .env.example .env   # production uses .env
# fill MONGODB_URI, JWT_SECRET, CRON_SECRET, BASE_URL, NEXT_PUBLIC_BASE_URL, ALLOWED_ORIGINS
npm ci --legacy-peer-deps --include=dev
unset NODE_ENV
npm run build
npm start              # runs server-ws.cjs on port 3000
```

With PM2 (repo includes `ecosystem.config.cjs`):

```bash
pm2 start ecosystem.config.cjs
# or: pm2 start "npm run start" --name hiretrack
```

## 📋 Configuration Guide

Do this after the app is reachable (installer or local).

### Organization setup

1. Open `/register/org` and create the organization + admin account
2. Sign in at `/auth/login`
3. Configure branding, timezone, and team users in Settings
4. Set email templates and notifications
5. Configure file storage (Local / Cloudinary / AWS S3)
6. Add custom fields for jobs and candidates if needed

### AI configuration

1. Obtain a Google Gemini API key (or configure another supported provider in Settings)
2. Set AI options in the organization dashboard / Settings
3. Tune resume processing and evaluation criteria as needed

### Email setup

1. Choose provider (SMTP / Resend / Brevo)
2. Add SMTP settings or API keys in Settings
3. Customize templates
4. Send a test email

### File storage

1. **Local** — default on the server disk
2. **Cloudinary** — cloud name, API key, secret
3. **AWS S3** — region, access keys, bucket

## 📊 API Endpoints

### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `POST /api/auth/forgot-password` - Password reset
- `POST /api/auth/reset-password` - Password reset confirmation

### Jobs

- `GET /api/jobs` - List all jobs
- `POST /api/jobs` - Create new job
- `PUT /api/jobs/[id]` - Update job
- `DELETE /api/jobs/[id]` - Delete job
- `GET /api/jobs/open` - Get open jobs for candidates

### Candidates

- `GET /api/candidates` - List candidates
- `POST /api/candidates` - Create candidate
- `PUT /api/candidates/[id]` - Update candidate
- `GET /api/candidates/filter` - Advanced candidate search
- `PUT /api/candidates/evaluate` - AI-powered candidate evaluation

### Interviews & Scheduling

- `GET /api/candidates/assignments` - Get interview assignments
- `POST /api/event-mail` - Send interview notifications
- `GET /api/calendar` - Get calendar events

### Settings & Configuration

- `GET /api/settings` - Get organization settings
- `PUT /api/settings/fs` - Update file storage settings
- `PUT /api/settings/templates` - Update email templates
- `GET /api/backups` - List database backups

## 🚀 Deployment

**Preferred:** use Path A (installer). It handles Node, MongoDB options, PM2, cron, and optional Nginx/SSL via `./installer.sh --domain`.

### Manual production (from source)

1. Build and run with `.env` filled (see Path B / production build above).
2. Keep the process up with PM2:

   ```bash
   pm2 start ecosystem.config.cjs
   # or: pm2 start "npm run start" --name hiretrack
   ```

3. Put Nginx (or another reverse proxy) in front of port 3000. Minimal example:

   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

   For automated domain + SSL, prefer `./installer.sh --domain`.

### Docker

A multi-stage production image definition lives in [`dockerfile`](dockerfile) (Node 20, custom WebSocket server). Build and run with your own runtime env (`MONGODB_URI`, `JWT_SECRET`, `CRON_SECRET`, `BASE_URL`, etc.) — do not bake secrets into the image.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏷️ Publishing a release (maintainers)

Installers and in-app updates read assets from **GitHub Releases** on [`vipul-upforce/hiretrack`](https://github.com/vipul-upforce/hiretrack) — not from the `main` branch.

The [Release](.github/workflows/release.yml) workflow:

1. Builds the Next.js app (Node 20)
2. Packs `hiretrack-vX.Y.Z.tar.gz`
3. Splits chunked `.part-*` assets + manifest (for restricted networks)
4. Creates/uploads a GitHub Release with those files

`GITHUB_RELEASE_REPO` baked into the release `.env` defaults to `vipul-upforce/hiretrack`.

### Option 1 — Run the workflow manually (recommended)

1. Bump `"version"` in `package.json` if needed (e.g. `2.0.11`). Manual runs tag as `v` + that version.
2. Push your changes to `main` on `vipul-upforce/hiretrack`.
3. On GitHub: **Actions → Release → Run workflow** → choose `main` → **Run workflow**.
4. When it finishes, open **Releases** and confirm assets exist:
   - `hiretrack-vX.Y.Z.tar.gz`
   - `hiretrack-vX.Y.Z.tar.gz.manifest.json`
   - `hiretrack-vX.Y.Z.tar.gz.part-*`

### Option 2 — Push a version tag

```bash
# after version is correct in package.json and main is pushed
git tag v2.0.11
git push origin v2.0.11
```

Tag must match `v*.*.*`. That triggers the same Release workflow.

### Optional secrets

| Secret | Purpose |
|--------|---------|
| `JWT_SECRET` | Baked into release `.env` (auto-generated if unset) |
| `CRON_SECRET` | Baked into release `.env` (auto-generated if unset) |

### Forks

If you publish from another repo, set `GITHUB_RELEASE_REPO=owner/repo` in the workflow env, installer default, and app env so installers and update checks hit your Releases.

More detail: [chunked downloads](docs/chunked-downloads.md).

## Troubleshooting

- **Installer cannot find a release:** `main` alone is not enough. Create a GitHub Release (tag `vX.Y.Z`) that includes `hiretrack-vX.Y.Z.tar.gz` (and optional chunked parts). See [chunked downloads](docs/chunked-downloads.md).
- **Local `npm run dev` fails to start:** MongoDB must be running. Copy `.env.example` to `.env.local` and set `MONGODB_URI`, `JWT_SECRET`, and `CRON_SECRET`.
- **Installer finished but I can’t open the app:** check `pm2 status` / `pm2 logs`, confirm port 3000 (or your Nginx domain), and open `/register/org` for first-time setup.
- **Production calendar webhooks fail:** set `GOOGLE_CALENDAR_WEBHOOK_TOKEN` in the server environment. Do not rely on a default token.
- **Bulk CV / PDF parsing issues after install:** the installer may skip the markdown parser if Python venv support is missing. On Ubuntu: `sudo apt install -y python3.12-venv python3-pip`, then re-run install/update, or set `DOCLING_PARSE_URL` in `.env`.

## Support

- [User Guide](docs/user-guide.md)
- [OpenAPI spec](docs/api-documentation.yaml) (also served at `/swagger.html` when the app is running)
- [Chunked release downloads](docs/chunked-downloads.md)
- Installer help: `./installer.sh --help`
