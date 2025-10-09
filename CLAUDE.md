# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development Commands
- `npm run dev` - Start development server with Turbopack on port 3000
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

#### State Management
- Redux Toolkit store in `src/lib/redux/store.ts` and `src/lib/store.ts`
- RTK Query API slices in `src/lib/features/` for server state
- Local component state for UI interactions

#### Authentication Flow
- JWT-based authentication with tokens stored in HTTP-only cookies
- Role-based access control (Admin, HR, Interviewer, Candidate)
- 2FA support with OTP verification
- Custom auth middleware in `middleware.ts`

### Key Features Architecture

#### Custom Fields System
- Modular system in `src/Custom_Fields/`
- Context-based state management
- Dynamic form generation and validation
- Type-safe field definitions

#### AI Resume Processing
- Google Gemini AI integration in `src/lib/parse-resume-from-pdf/`
- Multi-step resume parsing pipeline
- Structured data extraction for skills, experience, education
- Candidate scoring and evaluation system

#### File Management
- Multi-provider file storage abstraction
- Support for Local, Cloudinary, and AWS S3
- Secure file upload with type validation
- PDF processing and preview capabilities

#### Email System
- Multi-provider email support (SMTP, Resend, Brevo)
- Template-based email system
- Automated notifications for candidate status changes
- Interview scheduling with calendar integration

### API Architecture
- Next.js API routes in `src/app/api/`
- RESTful endpoints with consistent error handling
- MongoDB connection with connection pooling
- Middleware for authentication and organization context

### Component Architecture
- shadcn/ui component library for consistent design
- Compound component patterns for complex UI
- Custom hooks for business logic separation
- TypeScript interfaces for prop typing

## Development Guidelines

### Database Operations
- Always use the models exported from `src/lib/mongodb.ts`
- Ensure MongoDB connection is established before database operations
- Use TypeScript interfaces for type safety

### API Development
- Follow RESTful conventions for new endpoints
- Include proper error handling and status codes
- Validate input data and sanitize output
- Use organization context for multi-tenant data isolation

### State Management
- Use RTK Query for server state and caching
- Keep local component state minimal
- Use Redux for global application state that needs persistence

### File Operations
- Use the abstracted file storage system in `src/lib/`
- Handle different storage providers gracefully
- Always validate file types and sizes
- Implement proper error handling for file operations

### Custom Fields
- Use the Custom Fields system for dynamic form requirements
- Follow the established patterns in `src/Custom_Fields/`
- Ensure type safety with the provided TypeScript interfaces

### Security Considerations
- Never expose sensitive environment variables to client-side code
- Validate and sanitize all user inputs
- Use proper authentication middleware for protected routes
- Implement proper CORS and security headers

## Important Project Rules

### Code Reusability
Check for any existing reusable component or logic in the project. If it exists and is exported or can be easily exported, use that instead of writing new code for the same logic. This rule applies to all TypeScript/JavaScript files.