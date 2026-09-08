# HireTrack - AI-Powered Hiring Management Platform

## 🚀 Overview

HireTrack is a comprehensive, AI-powered hiring management platform designed to streamline and optimize the entire recruitment process. Built with modern technologies including Next.js, TypeScript, and MongoDB, HireTrack provides a complete solution for organizations to manage job postings, candidate applications, interview scheduling, and hiring workflows with intelligent automation.

## 🎯 Key Features

### 🤖 AI-Powered Resume Analysis

- **Google Gemini AI Integration**: Advanced resume parsing and candidate evaluation
- **Intelligent Scoring System**: Multi-dimensional candidate assessment (Skills, Experience, Affordability, Overall)
- **Automated Resume Processing**: Batch CV processing with AI-powered data extraction
- **Smart Recommendations**: AI-generated candidate insights and hiring recommendations

### 📋 Job Management

- **Dynamic Job Postings**: Create and manage job positions with rich descriptions
- **Custom Job Forms**: Flexible application forms with custom fields
- **Job Status Tracking**: Open, closed, and draft status management
- **Branded Career Portal**: Customizable job application portal for candidates

### 👥 Candidate Management

- **Comprehensive Candidate Profiles**: Detailed candidate information and tracking
- **Drag-and-Drop Kanban Board**: Visual candidate pipeline management
- **Custom Status Workflows**: Configurable hiring stages (Applied, Screening, Shortlisted, Processing, Accepted, Rejected)
- **Candidate History Tracking**: Complete audit trail of candidate interactions

### 📅 Interview Scheduling

- **Calendar Integration**: Full calendar view for interview scheduling
- **Interviewer Assignment**: Assign candidates to specific interviewers
- **Email Notifications**: Automated interview scheduling emails with calendar links
- **Real-time Updates**: Live updates for interview assignments and status changes

### 🔍 Advanced Search & Filtering

- **Multi-criteria Search**: Search candidates by name, skills, location, experience
- **Salary Range Filtering**: Filter by current and expected CTC ranges
- **Date-based Filtering**: Search by application date ranges
- **Custom Field Filtering**: Filter by organization-specific custom fields
- **Advanced Logic Operators**: AND/OR logic for complex search queries

### 📧 Communication & Notifications

- **Email Template System**: Customizable email templates for various scenarios
- **Multi-provider Email Support**: SMTP, Resend, and Brevo integration
- **Automated Notifications**: Application confirmations, interview schedules, status updates
- **Two-Factor Authentication**: Secure login with OTP verification

### 📄 File Management

- **Multi-cloud Storage**: Support for Local, Cloudinary, and AWS S3 storage
- **Document Management**: Resume and attachment handling with preview
- **Batch File Processing**: Bulk CV upload and processing capabilities
- **Secure File Storage**: Encrypted file storage with access controls

### 🎨 Customization & Branding

- **Custom Fields System**: Dynamic form fields for jobs and candidates
- **Organization Branding**: Custom logos, colors, and branding
- **Email Template Customization**: Fully customizable email templates
- **Multi-organization Support**: Separate workspaces for different organizations

### 📊 Analytics & Reporting

- **Dashboard Analytics**: Real-time hiring metrics and insights
- **Candidate Tracking**: Detailed candidate journey tracking
- **Interview Analytics**: Interview scheduling and completion statistics
- **Performance Metrics**: Hiring funnel analysis and optimization

### 🔐 Security & Access Control

- **Role-based Access Control**: Admin, HR, Interviewer, and Candidate roles
- **Secure Authentication**: JWT-based authentication with encryption
- **Data Privacy**: GDPR-compliant data handling
- **Backup & Recovery**: Automated database backups and recovery

## 👥 User Roles & Permissions

### 🤴 Administrator

- **Full System Access**: Complete control over all platform features
- **User Management**: Create, edit, and manage user accounts
- **System Configuration**: Configure email, storage, and organization settings
- **Backup Management**: Create and manage database backups
- **Custom Fields**: Create and manage dynamic form fields
- **Email Templates**: Customize email templates and notifications

### 🤝 HR Manager

- **Job Management**: Create, edit, and manage job postings
- **Candidate Management**: Full access to candidate data and workflows
- **Interview Coordination**: Schedule and manage interviews
- **Reporting**: Access to hiring analytics and reports
- **Email Communications**: Send notifications and updates

### 👨‍💼 Interviewer

- **Assigned Candidates**: View and manage assigned candidates
- **Interview Scheduling**: Schedule and conduct interviews
- **Candidate Evaluation**: Add remarks and ratings
- **Calendar Access**: View interview calendar and assignments
- **Limited Data Access**: Restricted access to sensitive candidate information

### 👤 Candidate

- **Job Applications**: Apply to open positions
- **Application Tracking**: Track application status
- **Profile Management**: Update personal information
- **Document Upload**: Upload resumes and supporting documents
- **Communication**: Receive notifications and updates

## 🛠️ Technical Architecture

### Frontend Technologies

- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Accessible component library
- **Redux Toolkit**: State management
- **React Hook Form**: Form handling and validation

### Backend Technologies

- **Node.js**: Server-side runtime
- **MongoDB**: NoSQL database
- **Mongoose**: MongoDB object modeling
- **Next.js API Routes**: Serverless API endpoints
- **JWT Authentication**: Secure token-based authentication

### AI & External Integrations

- **Google Gemini AI**: Advanced AI capabilities for resume analysis
- **Cloudinary**: Cloud image and video management
- **AWS S3**: Scalable cloud storage
- **Email Providers**: SMTP, Resend, Brevo integration
- **Calendar Integration**: Google Calendar and Outlook support

### Development Tools

- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting
- **TypeScript**: Static type checking
- **Git**: Version control
- **PM2**: Process management for production

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
curl -fsSL https://raw.githubusercontent.com/rahulp162/hiretrack/main/installer.sh -o installer.sh
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

The installer points at `rahulp162/hiretrack` and downloads `hiretrack-vX.Y.Z.tar.gz` from that repo’s **Releases** tab. Source on `main` is **not** an installable build.

Until a Release exists, the installer fails with GitHub API `Not Found`. Maintainers: GitHub → **Actions → Release → Run workflow**, or tag `vX.Y.Z` and push that tag. Forks only: `export GITHUB_RELEASE_REPO=yourname/hiretrack`. Optional: `GITHUB_TOKEN` for private repos or higher API limits. See [chunked downloads](docs/chunked-downloads.md).

### Path B — Local development

**Prerequisites**

- **Node.js 20** (18+ may work; releases and CI use 20)
- **MongoDB 5.0+** already running (local or Atlas)
- npm

**Setup**

1. Clone and install

   ```bash
   git clone https://github.com/rahulp162/hiretrack.git
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

## 📊 Database Schema

### Core Collections

- **Organizations**: Organization settings and configuration
- **Users**: User accounts and authentication
- **Jobs**: Job postings and requirements
- **Candidates**: Candidate profiles and applications
- **History**: Candidate interaction history
- **Settings**: Organization-specific settings
- **Lanes**: Custom workflow stages

### Key Relationships

- Organizations have multiple Users
- Jobs belong to Organizations
- Candidates are associated with Jobs
- History tracks all candidate interactions
- Settings are organization-specific

## 🔒 Security Features

### Authentication & Authorization

- JWT-based authentication with encryption
- Role-based access control (RBAC)
- Session management with secure cookies
- Two-factor authentication (2FA)
- Password reset with secure tokens

### Data Protection

- Encrypted data transmission (HTTPS)
- Secure file upload and storage
- Input validation and sanitization
- SQL injection prevention
- XSS protection

### Privacy Compliance

- GDPR-compliant data handling
- User consent management
- Data retention policies
- Right to be forgotten implementation
- Privacy policy integration

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
## 📈 Performance Optimization

### Frontend Optimization

- Code splitting and lazy loading
- Image optimization and compression
- Caching strategies
- Bundle size optimization
- Progressive Web App (PWA) features

### Backend Optimization

- Database indexing and query optimization
- API response caching
- File compression and CDN integration
- Connection pooling
- Rate limiting and throttling

### Monitoring & Analytics

- Application performance monitoring
- Error tracking and logging
- User analytics and behavior tracking
- Database performance monitoring
- Server resource monitoring

## 🤝 Contributing

### Development Guidelines

1. Fork the repository
2. Create a feature branch
3. Follow coding standards and conventions
4. Write comprehensive tests
5. Submit a pull request with detailed description

### Code Standards

- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting
- Conventional commits for version control
- Comprehensive documentation

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

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

_Built with ❤️ in India, using Next.js, TypeScript, and MongoDB_
