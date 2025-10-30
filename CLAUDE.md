# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development Commands

- `npm run dev` - Start development server with Turbopack on port 3000
- `npm run dev:fast` - Same as dev (alias)
- `npm run dev:fast` - Same as dev (alias)
- `npm run dev:debug` - Start dev server with Node.js inspector for debugging
- `npm run build` - Build production application
- `npm run build:analyze` - Build with bundle analysis (ANALYZE=true)
- `npm run start` - Start production server
- `npm run lint` - Run ESLint for code linting
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run type-check` - Run TypeScript type checking without emitting files
- `npm run watch` - Run TypeScript in watch mode for continuous type checking

### Testing

No test framework is currently configured. Check with the team before adding tests.

## Architecture Overview

### Tech Stack

- **Framework**: Next.js 15.4.1 with App Router and Turbopack
- **Language**: TypeScript with strict type checking
- **Styling**: Tailwind CSS with shadcn/ui components
- **Database**: MongoDB with Mongoose ODM
- **State Management**: Redux Toolkit with RTK Query for API calls
- **Authentication**: JWT-based with custom implementation
- **AI Integration**: Google Gemini AI for resume processing
- **File Storage**: Multi-provider support (Local, Cloudinary, AWS S3)

### Key Architecture Patterns

#### App Router Structure

The application uses Next.js App Router with the following key directories:

- `src/app/` - App Router pages and API routes
- `src/components/` - Reusable UI components
- `src/lib/` - Utilities, models, and business logic
- `src/Custom_Fields/` - Custom fields system (separate module)

#### Database Models (MongoDB/Mongoose)

Core models are defined in `src/lib/models/`:

- `User` - User accounts and authentication
- `Organization` - Multi-tenant organization data
- `Job` - Job postings and requirements
- `Candidate` - Candidate profiles and applications
- `Lane` - Kanban workflow stages
- `History` - Audit trail for candidate interactions
- `Settings` - Organization-specific configuration
- `CandidateAccount` - Candidate user accounts
- `CVBatch` - Batch CV processing tracking
- `JobLaneConfig` - Per-job lane configurations
- `ChecklistTemplate` - Checklist templates for workflows
- `FileShare` - File sharing and access management
- `EmailHistory` - Email tracking and history
- `Notification` - User notifications
- `WebhookSubscription` - Webhook integrations
- `FileUrlMapping` - File URL mappings for storage providers

**IMPORTANT**: All models are registered and exported from `src/lib/mongodb.ts`. Always import models from this file, never instantiate models directly from schema files.

#### State Management

- Redux Toolkit store in `src/lib/store.ts` (main) and `src/lib/redux/store.ts` (legacy)
- RTK Query API slices in `src/lib/features/` for server state:
  - `authApi` - Authentication endpoints
  - `jobApi` - Job management
  - `candidateApi` - Candidate operations
  - `userApi` - User management
  - `laneApi` - Workflow lane operations
  - `orgApi` - Organization management
  - `settingsApi` - Settings operations
  - `checklistApi` - Checklist operations
  - `notificationsApi` - Notifications
- Redux persist for auth and organization state
- Local component state for UI interactions

#### Authentication Flow

- JWT-based authentication with tokens stored in HTTP-only cookies
- Role-based access control (Admin, HR, Interviewer, Candidate)
- 2FA support with OTP verification
- Custom auth middleware in `middleware.ts`
- Token encryption using CryptoJS with AES
- JWT verification using jose library

### Key Features Architecture

#### Custom Fields System

- Modular system in `src/Custom_Fields/`
- Context-based state management (`CustomFieldsContext`)
- Dynamic form generation and validation
- Type-safe field definitions
- Support for both global and entity-specific (job/candidate) custom fields
- Separate forms identified by unique form IDs
- Integration with organization settings

#### AI Resume Processing

- Google Gemini AI integration in `src/lib/parse-resume-from-pdf/`
- Multi-step resume parsing pipeline:
  1. PDF text extraction (`read-pdf.ts`)
  2. Text grouping into lines (`group-text-items-into-lines.ts`)
  3. Section detection (`group-lines-into-sections.ts`)
  4. Data extraction (profile, skills, experience, education, projects)
- Structured data extraction for skills, experience, education
- Candidate scoring and evaluation system via `/api/candidates/evaluate`
- Feature scoring system for candidate assessment

#### File Management

- Multi-provider file storage abstraction in `src/lib/fileUtils.ts`
- Support for Local, Cloudinary, and AWS S3
- Provider selection based on organization settings
- Secure file upload with type validation
- PDF processing and preview capabilities
- File sharing with share IDs and access tracking
- File URL mapping for consistent access across providers

#### Email System

- Multi-provider email support (SMTP, Resend, Brevo)
- Unified email service in `src/lib/unifiedEmailService.ts`
- Template-based email system
- Email history tracking in `EmailHistory` model
- Automated notifications for candidate status changes
- Interview scheduling with calendar integration
- Email utilities in `src/lib/emailUtils.ts`

#### Kanban Workflow System

- Customizable lanes per organization
- Default lanes: Applied, Screening, Shortlisted, Processing, Accepted, Rejected
- Per-job lane configuration support
- Drag-and-drop candidate management
- Lane order management
- Checklist integration per lane

### API Architecture

- Next.js API routes in `src/app/api/`
- RESTful endpoints with consistent error handling
- MongoDB connection with connection pooling via `src/lib/mongodb.ts`
- Middleware for authentication and organization context (`middleware.ts`)
- Role-based access control at API level
- Exempt paths for public endpoints (defined in `middleware.ts`)

### Component Architecture

- shadcn/ui component library in `src/components/ui/`
- Compound component patterns for complex UI
- Custom hooks for business logic separation
- TypeScript interfaces for prop typing
- Reusable form components in `src/components/forms/`
- Onboarding wizard system in `src/components/onboarding/`
- Auth guard wrapper in `src/components/withAuthGuard.tsx`

## Development Guidelines

### Database Operations

- Always use the models exported from `src/lib/mongodb.ts`
- Ensure MongoDB connection is established before database operations by calling `connectToDatabase()` or `dbConnect()`
- Use TypeScript interfaces for type safety (imported from model files)
- Organization-scoped queries must include `organizationId` filter

### API Development

- Follow RESTful conventions for new endpoints
- Include proper error handling and status codes
- Validate input data and sanitize output
- Use organization context for multi-tenant data isolation
- Exempt public endpoints must be added to `apiExemptPaths` in `middleware.ts`
- Redirect paths must be added to `redirectPaths` in `middleware.ts`

### State Management

- Use RTK Query for server state and caching
- Keep local component state minimal
- Use Redux for global application state that needs persistence
- Auth and organization state are persisted via redux-persist

### File Operations

- Use the abstracted file storage system in `src/lib/fileUtils.ts`
- Handle different storage providers gracefully (Local, Cloudinary, S3)
- Always validate file types and sizes
- Implement proper error handling for file operations
- File storage provider is configured per organization in Settings

### Custom Fields

- Use the Custom Fields system for dynamic form requirements
- Follow the established patterns in `src/Custom_Fields/`
- Ensure type safety with the provided TypeScript interfaces
- Custom fields can be global (form-level) or specific (job/candidate-level)
- Custom fields are stored in organization settings and accessed via CustomFieldsContext

### Security Considerations

- Never expose sensitive environment variables to client-side code
- Validate and sanitize all user inputs
- Use proper authentication middleware for protected routes
- Implement proper CORS and security headers
