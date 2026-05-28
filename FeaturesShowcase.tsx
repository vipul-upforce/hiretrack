'use client';

import {
  Brain,
  Briefcase,
  Users,
  Calendar,
  Search,
  Mail,
  FileText,
  Palette,
  BarChart3,
  CheckSquare,
  Building2,
  Shield,
  Zap,
  Settings,
  Link2,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ArrowUpRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const featureCategories = [
  {
    id: 'ai-powered',
    icon: Brain,
    title: 'AI-Powered Features',
    description:
      'Advanced AI for candidate evaluation, bulk CV parsing, and organization-level provider control',
    features: [
      {
        title: 'Organization-Level AI Provider Selection',
        highlights: [
          'Multiple AI Provider Support: Google Gemini, OpenAI, Anthropic (Claude), or Perplexity for premium evaluation',
          'Per-Organization Configuration: Each organization configures preferred providers independently',
          'Model Selection: Choose specific models per provider with live Gemini model discovery',
          'Custom Model Support: Configure custom model IDs for advanced or preview endpoints',
          'API Key Management: Secure, encrypted storage of provider API keys per organization',
          'Provider Switching: Switch providers without losing candidate or evaluation data',
          'Provider Validation: Test connections before activation',
        ],
        subFeatures: [
          {
            name: 'Google Gemini',
            items: [
              'Models: Gemini 1.5 Flash (default), Gemini 1.5 Pro, Gemini 2.5 Flash Lite, Gemini 1.5 Flash 8B',
              'PDF and vision-capable models for resume understanding',
            ],
          },
          {
            name: 'OpenAI (ChatGPT)',
            items: [
              'Models: GPT-4o Mini (default), GPT-4o, GPT-4 Turbo, GPT-3.5 Turbo and custom models',
            ],
          },
          {
            name: 'Anthropic (Claude)',
            items: [
              'Models: Claude 3.5 Sonnet (default), Claude 3.5 Haiku, Claude 3 Opus and custom models',
            ],
          },
          {
            name: 'Perplexity',
            items: ['Models: Sonar Pro (default) and custom models'],
          },
        ],
      },
      {
        title: 'Bulk CV Upload & Parsing',
        highlights: [
          'Dedicated CV Upload Workspace: Upload, queue, and process resumes in batches from `/dashboard/cv-upload`',
          'Dual Parsing Modes: Cost-optimized bulk pool or premium parsing via your main AI provider',
          'PDF-to-Markdown Pipeline: Convert PDF resumes to structured markdown before AI extraction',
          'Deferred Processing: Store-only upload mode — process batches later from history',
          'Batch Operations on Upload: Optionally assign job, set pipeline status, and add remarks (with privacy and rating)',
          'Resilient Processing: Chunked uploads, ZIP support, retry failed files, and process-pending batches',
          'Provider Failover: Multiple bulk-provider API keys with per-slot model verification',
          'Real-Time Batch Status: Track per-file success, failure, and batch completion in the UI',
        ],
        subFeatures: [
          {
            name: 'Bulk parsing pool providers',
            items: [
              'Groq: Llama 3.1 8B Instant (default), Llama 3.3 70B Versatile',
              'Gemini: Shared slot for bulk extraction models',
              'DeepSeek: DeepSeek Chat (V3) with custom model support',
              'OpenRouter: Free-tier and GPT-4o Mini fallback routes',
              'Cerebras: Llama 3.1 8B (OpenAI-compatible API)',
              'Mistral: Mistral Small (latest) for high-volume parsing',
            ],
          },
          {
            name: 'Premium parsing',
            items: [
              'Uses the organization’s main AI provider (Gemini, OpenAI, Claude, or Perplexity)',
              'Best for highest-quality extraction when bulk cost optimization is not required',
            ],
          },
        ],
      },
      {
        title: 'Resume Analysis & Processing',
        highlights: [
          'AI-Powered Resume Parsing: Structured extraction via selected premium or bulk pipeline',
          'Intelligent Scoring System: Skills match, experience relevance, affordability, and composite scores',
          'PDF Page Limits: Configurable maximum PDF pages per evaluation (`maxPdfPages`)',
          'Auto-Evaluate New Candidates: Optional organization-wide automatic evaluation on intake',
          'Duplicate Detection: Identify duplicate applications by email within the organization',
          'Data Extraction: Name, contact, experience, skills, education, and custom field values',
          'Format Standardization: Consistent candidate records regardless of resume layout',
        ],
        subFeatures: [
          {
            name: 'Scoring dimensions',
            items: [
              'Skills Match Score',
              'Experience Relevance Score',
              'Affordability Score (expected CTC vs budget)',
              'Overall Composite Score',
            ],
          },
        ],
      },
      {
        title: 'Enhanced Candidate Evaluation',
        highlights: [
          'Confidence Scores & Evidence Links: AI cites resume sections supporting each score',
          'Red Flags Detection: Surface gaps, job hopping, salary mismatch, and similar concerns',
          'Skills Verification Matrix: Required vs present skills with evidence breakdown',
          'Custom Prompts & Temperature: Organization-level evaluation tuning',
          'Custom Field Context: Include selected job and candidate custom fields in AI prompts',
          'Comparative Ranking (optional): Rank candidates within a job pool (admin-configurable)',
          'Batch CV Processing: Upload and evaluate many resumes with progress tracking',
          'Evaluation Configuration Testing: Validate provider and prompt setup before go-live',
        ],
      },
    ],
  },
  {
    id: 'job-management',
    icon: Briefcase,
    title: 'Job Management',
    description: 'Complete job posting, jobs board, and performance tracking',
    features: [
      {
        title: 'Job Posting Features',
        highlights: [
          'Dynamic Job Postings: Rich descriptions with organization and job-specific custom fields',
          'Job Status Management: Open, Draft, Closed, and Archived statuses',
          'Custom Job Forms: Flexible application forms with validation rules',
          'Job Analytics: Application count, views, conversion, and time-to-fill metrics',
          'Application Deadline: Closing dates for public postings',
          'Public Job URLs: Shareable links for the branded career portal',
          'Branded Career Portal: Customizable candidate application experience',
          'Guest Applications: Candidates can apply without a full account where configured',
        ],
      },
      {
        title: 'Jobs Board & Operations',
        highlights: [
          'Jobs Board View: Manage all postings from a centralized board',
          'Custom Fields on Job Cards: Surface `showOnCard` fields for quick scanning',
          'Job-Specific Custom Fields: Fields unique to individual postings',
          'Job-Specific Lanes: Custom pipeline stages per job with checklist hooks',
          'Bulk Job Operations: Bulk status updates and management actions',
          'Job Performance Tracking: Volume, time-to-fill, and success rate monitoring',
        ],
      },
    ],
  },
  {
    id: 'candidate-management',
    icon: Users,
    title: 'Candidate Management',
    description:
      'Profiles, pipeline, tags, duplicates, bulk actions, and role-aware visibility',
    features: [
      {
        title: 'Candidate Profiles',
        highlights: [
          'Comprehensive Candidate Profiles: Contact, experience, skills, and evaluation scores',
          'Document Management: Resume, portfolio, certificates, and attachments',
          'Custom Fields Support: Global, job-specific, and candidate-specific fields',
          'Private Field Visibility: Hide sensitive fields from candidates (`private`) or interviewers (`privateInt`)',
          'Show on Card: Pin key custom fields to kanban and list cards',
          'Candidate History: Full audit trail including assignments, remarks, and checklists',
          'Follow-Up Tasks: Schedule follow-up notes and dates with reminder notifications',
        ],
      },
      {
        title: 'Pipeline Management',
        highlights: [
          'Drag-and-Drop Kanban Board: Visual pipeline with instant status updates',
          'Lane Checklists: Incoming and outgoing checklists per stage with optional move validation',
          'Bulk Checklist Apply: Complete the same checklist answers for multiple candidates at once',
          'Lane Checklist Configuration: Per-job lane checklist templates and field visibility',
          'Role-Based Checklist Fields: Control which roles see fields on forms vs history',
          'Pending Moves Queue: Validate checklist completion before allowing stage changes',
          'Lane Reordering: Drag to reorder pipeline stages',
          'Custom Status Workflows: Applied, Screening, Shortlisted, Interview, Processing, Accepted, Rejected',
          'Multi-Tab Synchronization: Pipeline changes sync across open browser tabs via live updates',
        ],
      },
      {
        title: 'Tags, Duplicates & Data Quality',
        highlights: [
          'Organization Tags: Color-coded tags with a shared tag library',
          'Duplicate Detection: Flag duplicate applications and review related profiles',
          'Duplicate Count on Cards: See how many matching applications exist at a glance',
          'Relevant Experience Tracking: Track experience relevance alongside total years',
        ],
      },
      {
        title: 'Remarks, Ratings & Collaboration',
        highlights: [
          'Remarks with Star Ratings: Score candidates from 0–5 on remarks and history entries',
          'Private Remarks: Restrict sensitive notes to authorized roles',
          '@Mentions: Mention teammates in remarks with dedicated mention notifications',
          'Remark Attachments: Attach files to remarks and history entries',
          'Checklist + Remark Flow: Combined checklist submission and remark dialogs',
        ],
      },
      {
        title: 'Archive, Sharing & Bulk Operations',
        highlights: [
          'Archive & Restore: Soft-archive candidates with bulk archive from search results',
          'Unified Bulk Update API: Bulk assign, unassign, move job, change status, remark, and follow-up',
          'Candidate PDF Export: Generate shareable candidate profile PDFs',
          'Manual Entry & CSV Import: Add candidates individually or in bulk',
          'Bulk Interviewer Assignment: Assign or unassign interviewers for many candidates',
          'Email Candidate: Send templated email with attachments from the candidate dialog',
        ],
      },
    ],
  },
  {
    id: 'interview-scheduling',
    icon: Calendar,
    title: 'Interview Scheduling & Calendar',
    description:
      'Google Calendar, Zoom, and Microsoft Teams in one assignment workflow',
    features: [
      {
        title: 'Interview Management',
        highlights: [
          'Interview Scheduling: Date, time, duration, and interviewer assignment',
          'Multiple Interview Types: Phone, video, onsite, and technical assessment',
          'Configurable Duration: 30, 60, 90 minutes and custom durations',
          'Interview Notes & Feedback: Capture notes during and after interviews',
          'Interview Status Tracking: Scheduled, completed, and cancelled states',
          'Follow-Up Scheduling: Plan next-round interviews and follow-up reminders',
          'Unified Assign Dialog: Assign interviewer and optional video meeting in one flow',
        ],
      },
      {
        title: 'Google Calendar Integration',
        highlights: [
          'Google Calendar Sync: Two-way sync with organization Google Calendar',
          'Automatic Event Creation: Calendar events created when scheduling interviews',
          'Google Meet Integration: Automatic Meet links on supported assignments',
          'Meeting Updates & Cancellation: Calendar stays in sync when details change',
          'Attendee Management: Add guests and interviewers to calendar events',
          'Meeting Attachments: Attach documents to calendar event descriptions',
          'Calendar Webhooks: Real-time sync via Google Calendar webhooks',
          'Timezone Support: Organization timezone applied to scheduling',
          'Invite Response Tracking: Accept, decline, and tentative responses',
        ],
      },
      {
        title: 'Zoom Meetings',
        highlights: [
          'Zoom OAuth Integration: Connect Zoom per organization in settings',
          'Schedule Zoom on Assignment: Create Zoom meetings when assigning candidates',
          'Meeting Lifecycle: Update topic, time, and cancel meetings from HireTrack',
          'Join & Host Links: Store join URL and host start URL on the assignment',
          'Guest List & Attachments: Include guests and file references in meeting details',
          'Bulk Assignment Note: Bulk assign flows indicate when live Zoom scheduling applies',
        ],
      },
      {
        title: 'Microsoft Teams',
        highlights: [
          'Teams Application Permissions: Connect via Azure AD app credentials',
          'Teams Meeting Scheduling: Create Teams online meetings on assignment',
          'Microsoft Teams Bot Integration: Automated reminders and workflow notifications via Teams bot',
          'Single Active Provider: Google Meet, Zoom, or Teams — one video provider per assignment',
          'Teams Message Templates: Customize reminder templates for Teams notifications',
          'Follow-Up Reminder Offset: Configure minutes-before reminder for Teams follow-ups',
          'Meeting Summary Cards: View existing Teams meeting details on the candidate record',
        ],
      },
      {
        title: 'Calendar Features',
        highlights: [
          'Full Calendar View: Visual calendar for interview planning',
          'Interview Calendar: Dedicated view of all scheduled interviews',
          'Role-Based Access: Interviewers see assignments relevant to their role',
        ],
      },
    ],
  },
  {
    id: 'search-filtering',
    icon: Search,
    title: 'Advanced Search & Filtering',
    description: 'Powerful search with bulk actions across the candidate database',
    features: [
      {
        title: 'Search Capabilities',
        highlights: [
          'Multi-Criteria Search: Name, email, phone, skills, location, and experience',
          'Quick Search: Fast text search across candidate fields',
          'Advanced Logic: AND/OR operators for complex queries',
          'Custom Field Filters: Filter by organization-specific custom field values',
        ],
      },
      {
        title: 'Filtering Options',
        highlights: [
          'Status Filters: Filter by pipeline stage',
          'Date Range Filtering: Application and created date ranges',
          'Salary Range Filtering: Current and expected CTC ranges',
          'Experience Filtering: Minimum and maximum years of experience',
          'Location Filtering: City, state, or country',
          'Skills Filtering: Match by technical skills',
          'Interviewer Assignment Filter: Find candidates by assigned interviewer',
          'Job-Specific Filtering: Limit results to a job posting',
          'Archive State: Include or work with archived candidates in bulk flows',
        ],
      },
      {
        title: 'Search Results',
        highlights: [
          'Sortable Columns: Sort by date, name, score, and more',
          'Bulk Selection: Select many candidates for unified bulk operations',
          'Bulk Archive & Assign: Archive, assign job, or assign interviewer from search',
          'Pagination: Handle large result sets with page size control',
          'Inline Actions: Open candidate details, duplicates, and assignment dialogs',
        ],
      },
    ],
  },
  {
    id: 'communication',
    icon: Mail,
    title: 'Communication & Notifications',
    description:
      'Email providers, templates, granular notification preferences, and in-app alerts',
    features: [
      {
        title: 'Email System',
        highlights: [
          'Multi-Provider Email Support: SMTP, Resend, and Brevo per organization',
          'Per-Organization Email Settings: Independent provider configuration',
          'Email Provider Switching: Change providers without losing template history',
          'Configuration Testing: Send test messages before going live',
          'Email Template System: Branded, variable-driven templates',
          'Email History: Track sent messages per organization and candidate',
          'Email Queue: Reliable queued delivery for high volume',
          'Email to Candidate: Compose from templates with attachments from the UI',
        ],
        subFeatures: [
          {
            name: 'SMTP',
            items: [
              'Custom SMTP server configuration',
              'SSL/TLS support',
              "Custom 'from' address",
            ],
          },
          {
            name: 'Resend API',
            items: [
              'Modern email API integration',
              'API key configuration',
              "Custom 'from' and 'reply-to' addresses",
            ],
          },
          {
            name: 'Brevo (Sendinblue)',
            items: [
              'Professional email service integration',
              'Brevo API key configuration',
              "Custom 'from' and 'reply-to' addresses",
            ],
          },
        ],
      },
      {
        title: 'Real-Time Notifications',
        highlights: [
          'In-App Notification Center: Paginated feed with unread counts',
          'New Applications & Status Updates: Stay informed on pipeline changes',
          'Interview & Meeting Events: Assignments, schedule changes, cancellations, and invite responses',
          'Remarks & Mentions: New remarks and @mention alerts',
          'Follow-Up Notifications: Added, updated, and removed follow-up tasks',
          'Job & User Events: Job created/updated and new team members',
          'Bulk Import & CV Batch: Notifications when bulk operations complete',
          'Candidate Moved & Rejected: Track important pipeline outcomes',
          'Step Completed & Checklist Events: Workflow milestone notifications',
          'Role-Based Action URLs: Links route interviewers vs admin/HR to the right screen',
        ],
      },
      {
        title: 'Notification Preferences',
        highlights: [
          'Global Email Notification Settings: Organization defaults for event types',
          'Per-User Preferences: Users control which emails they receive',
          'Job-Level Notification Settings: Fine-tune alerts per job posting',
          'Mark as Read: Individual or mark-all-read actions',
          'Priority Levels: High, medium, and low notification priority',
        ],
      },
      {
        title: 'Status & Remark-Triggered Email',
        highlights: [
          'Status Change Emails: Notify candidates when pipeline status changes',
          'Remark-Triggered Sends: Optional emails when remarks are added with status context',
          'Queued Delivery: Short-delay queue for reliable status mail processing',
          'Template Variables: Dynamic insertion of candidate, job, and org data',
          'Interview Assignment Emails: Notify interviewers with role-appropriate links',
        ],
      },
    ],
  },
  {
    id: 'file-management',
    icon: FileText,
    title: 'File Management',
    description: 'Multi-provider storage, secure sharing, and in-app document preview',
    features: [
      {
        title: 'Storage Options (Organization-Level Configuration)',
        highlights: [
          'Per-Organization Configuration: Each org selects Local, Cloudinary, or AWS S3',
          'Storage Provider Switching: Migrate providers without breaking existing mappings',
          'Connection Testing: Validate credentials before activation',
          'Secure Credential Storage: Encrypted API keys and secrets',
          'URL Proxying: Proxied URLs for Cloudinary and S3 to protect credentials',
          'File URL Mapping: Database-backed mappings for consistent secure access',
          'Automatic File Handling: Upload pipeline abstracts the active provider',
        ],
        subFeatures: [
          {
            name: 'Local Storage (Server-Based)',
            items: [
              'Default option with no external dependency',
              'Organization-isolated directories on the application server',
              'Cost-effective for self-hosted deployments',
            ],
          },
          {
            name: 'Cloudinary',
            items: [
              'Cloud media management with transformations',
              'Image optimization and CDN delivery',
              'Video support and format conversion',
            ],
          },
          {
            name: 'AWS S3',
            items: [
              'Scalable enterprise object storage',
              'Global edge locations',
              'Pay-as-you-go pricing',
            ],
          },
        ],
      },
      {
        title: 'File Upload & Processing',
        highlights: [
          'Resume & Document Upload: PDFs, images, office documents, and videos',
          'Base64 Upload Path: Secure upload via encoded payloads where needed',
          'In-App PDF Preview: View resumes and attachments without leaving HireTrack',
          'Batch File Processing: Bulk CV upload with sanitization and size limits',
          'Custom Field File Upload: File-type custom fields on jobs and candidates',
          'Meeting & Email Attachments: Attach files to calendar events and emails',
        ],
      },
      {
        title: 'File Security & Sharing',
        highlights: [
          'Role-Based File Access: Restrict downloads by user role',
          'Time-Limited File Shares: Share IDs with expiry and download tracking',
          'Organization Isolation: Files scoped strictly per organization',
          'Secure URLs: Proxied and mapped URLs prevent credential exposure',
          'File Download Audit: Record downloads on shared links where applicable',
        ],
      },
    ],
  },
  {
    id: 'customization',
    icon: Palette,
    title: 'Customization & Branding',
    description: 'Custom fields, portal branding, and multi-organization workspaces',
    features: [
      {
        title: 'Custom Fields System',
        highlights: [
          'Dynamic Form Fields: Text, number, date, select, multi-select, radio, checkbox, and file types',
          'Field Configuration: Required/optional, defaults, validation, display order',
          'Private & Interviewer-Private Fields: Control visibility per audience',
          'Show on Card: Highlight fields on kanban and job board cards',
          'Global, Job-Specific & Candidate-Specific Scopes',
          'Duplicate Prevention: Validation when creating fields with conflicting labels',
        ],
      },
      {
        title: 'Organization Branding',
        highlights: [
          'Custom Logos: Upload organization logo for portal and app chrome',
          'Color Scheme: Brand colors across the candidate portal',
          'Portal Configuration: Header, footer, and layout customization',
          'Branded Email Templates: Match email appearance to your brand',
        ],
      },
      {
        title: 'Multi-Organization Support',
        highlights: [
          'Separate Workspaces: Isolated data per organization',
          'Organization-Specific Settings: AI, email, storage, and branding per org',
          'Organization Switching: Users in multiple orgs can switch context',
        ],
      },
    ],
  },
  {
    id: 'analytics',
    icon: BarChart3,
    title: 'Analytics & Reporting',
    description: 'Admin analytics dashboard with overview, funnel, jobs, interviews, and trends',
    features: [
      {
        title: 'Analytics Overview (Admin)',
        highlights: [
          'Overview Tab: At-a-glance metrics with drill-down to detailed tabs',
          'Admin-Only Access: Analytics restricted to administrators in the dashboard',
          'Date Range Filtering: Filter all reports by custom date ranges',
          'Job-Specific Filtering: Narrow analytics to a single posting',
          'Interactive Charts: Funnel, bar, line, and pie visualizations',
          'CSV Export: Export report data for external analysis',
        ],
      },
      {
        title: 'Candidate Funnel Analytics',
        highlights: [
          'Funnel Visualization: Candidates by pipeline stage',
          'Conversion Rates: Stage-to-stage conversion metrics',
          'Time-in-Stage Analysis: Average dwell time per stage',
          'Application Trends: Daily, weekly, and monthly volume',
          'Peak Time Analysis: Identify high-traffic application periods',
        ],
      },
      {
        title: 'Job Performance Analytics',
        highlights: [
          'Application Count & Time-to-Fill: Per-job hiring velocity',
          'Top Performing Jobs: Identify best-performing postings',
          'Volume Trends: Track applications over time per job',
        ],
      },
      {
        title: 'Interview & Trends Analytics',
        highlights: [
          'Interview Assignment Analytics: Interviewer workload distribution',
          'Workload Balancing: See assignment concentration across the team',
          'Application Trends Tab: Long-term volume and seasonality patterns',
          'Real-Time Data Refresh: Live queries for up-to-date dashboards',
        ],
      },
    ],
  },
  {
    id: 'checklist',
    icon: CheckSquare,
    title: 'Checklist & Workflow Management',
    description: 'Per-lane checklists with validation, templates, and role-based visibility',
    features: [
      {
        title: 'Lane Checklist Configuration',
        highlights: [
          'Per-Lane Templates: Define incoming and outgoing checklists for each pipeline stage',
          'Job-Level Lane Config: Different checklist sets per job posting',
          'Checklist Templates Library: Reuse templates across lanes and jobs',
          'Field Types in Checklists: Same rich field types as custom fields',
          'Lane Checklist Config Dialog: Admins configure checklists from the job board',
        ],
      },
      {
        title: 'Submission & Validation',
        highlights: [
          'Checklist Submission: Complete required fields before or after stage moves',
          'Move Validation: Block kanban drag until required checklists are satisfied',
          'Pending Moves Queue: Review and confirm moves that need checklist completion',
          'History Integration: Checklist responses stored in candidate history',
          'Bulk Checklist Mode: Apply one submission to many selected candidates',
        ],
      },
      {
        title: 'Role-Based Checklist Visibility',
        highlights: [
          'Visible on Form vs History: Control field visibility per role and context',
          'Admin, HR & Interviewer Rules: Show only fields each role should see',
          'Checklist Remarks Dialog: Combined remark and checklist experience',
          'Step Completed Notifications: Alert stakeholders when checklist steps finish',
        ],
      },
    ],
  },
  {
    id: 'multi-tenant',
    icon: Building2,
    title: 'Multi-Tenant Organization System',
    description: 'Complete data isolation with organization-level configuration',
    features: [
      {
        title: 'Organization Isolation',
        highlights: [
          'Complete Data Isolation: Organizations cannot access each other’s data',
          'Organization-Specific Settings: AI, email, storage, meetings, and branding',
          'Separate User Bases: Users belong to organizations with strict scoping',
          'Multiple Organizations Support: Enable or disable multi-tenant mode system-wide',
          'First Organization Privileges: Initial org controls multi-tenant settings',
          'Organization Creation: Provision new isolated workspaces from admin',
          'Organization-Specific File Storage: Isolated directories or cloud prefixes',
        ],
      },
      {
        title: 'Multi-Organization Features',
        highlights: [
          'Enable/Disable Multi-Tenancy: Platform-level toggle for single vs multi org',
          'Organization Switching: Users with multiple memberships switch active context',
          'Cross-Organization Data Protection: Middleware and API enforce org boundaries',
          'Organization-Specific Templates: Email, Teams messages, lanes, and custom fields',
          'Organization-Specific AI: Independent main and bulk CV AI configuration',
        ],
      },
    ],
  },
  {
    id: 'security',
    icon: Shield,
    title: 'Security & Access Control',
    description: 'Authentication, RBAC, encrypted secrets, and self-hosted license checks',
    features: [
      {
        title: 'Authentication',
        highlights: [
          'Password Security: Bcrypt-hashed passwords',
          'Two-Factor Authentication (2FA): Organization-level 2FA enablement',
          'Password Reset: Secure token-based reset flow',
          'Session Management: Secure sessions with automatic logout',
          'Multi-Organization Login: Users with multiple org memberships supported',
          'Refresh Tokens: Rotating refresh tokens with token version invalidation',
        ],
        subFeatures: [
          {
            name: '2FA Features',
            items: [
              'Admins enable or disable 2FA for the organization',
              'OTP verification via email',
              'Optional enforcement for all users',
              'Cryptographically secure OTP generation with expiration',
            ],
          },
        ],
      },
      {
        title: 'Role-Based Access Control (RBAC)',
        highlights: [
          'Roles: Administrator, HR, Interviewer, and Candidate',
          'Route-Level Restrictions: Middleware enforces role access per path',
          'Interviewer Scope: Limited routes — search, assignments, calendar, CV upload where allowed',
          'Admin & HR Capabilities: Full job, settings, analytics, and user management (per role)',
          'Candidate Portal: Apply-jobs and own profile only',
          'Private Data Filtering: API strips private custom fields by role',
          'Evaluation Visibility: Salary and affordability scores hidden from interviewers',
        ],
      },
      {
        title: 'Platform Security',
        highlights: [
          'Captcha for Portal: Configurable CAPTCHA on public application forms',
          'License Validation: Optional license check on login for self-hosted deployments',
          'Encrypted AI & Integration Secrets: Organization-scoped encryption at rest',
          'JWT Authentication: Token-based API authentication with secure cookies',
        ],
      },
    ],
  },
  {
    id: 'realtime',
    icon: Zap,
    title: 'Real-Time Features',
    description: 'SSE-driven live updates across dashboard, pipeline, and notifications',
    features: [
      {
        title: 'Live Updates (SSE)',
        highlights: [
          'Server-Sent Events: Push candidate and assignment updates to open sessions',
          'Dashboard Sync: HR assignment list updates without manual refresh',
          'Job Board Sync: Kanban cards refresh when other users change data',
          'Debounced Refetch: Efficient handling of burst SSE events',
          'Multi-Tab Awareness: Consistent state when multiple tabs are open',
        ],
      },
      {
        title: 'Collaboration',
        highlights: [
          'Live Remarks & Mentions: Team discussion on candidate records',
          'Real-Time Notification Bell: Unread count and paginated notification dropdown',
          'Activity in History: Status, assignment, and checklist changes recorded live',
          'Selected Candidates State: Bulk selection synced for batch operations',
        ],
      },
    ],
  },
  {
    id: 'system-admin',
    icon: Settings,
    title: 'System Administration',
    description: 'Grouped settings, onboarding wizard, backups, logs, and updates',
    features: [
      {
        title: 'User Management',
        highlights: [
          'User Creation & Invitation: Add admin, HR, and interviewer accounts',
          'User Roles: Assign and change roles with immediate access impact',
          'User Activation: Activate or deactivate users',
          'Profile Management: Edit names, emails, and notification preferences',
          'Password Management: Admin password reset support',
        ],
      },
      {
        title: 'Grouped System Configuration',
        highlights: [
          'Organization Settings: Name, branding, timezone, storage, multi-org',
          'Security Settings: Users, 2FA, and captcha in one group',
          'AI & Evaluation Settings: Main providers plus bulk CV AI configuration',
          'Communication Settings: Email providers and templates',
          'Meeting Integrations: Google Calendar, Zoom, and Microsoft Teams',
          'Data & System: Backups, logs, media assets, and version/update info',
        ],
      },
      {
        title: 'Guided Onboarding Wizard',
        highlights: [
          'First-Run Setup Modal: Step-by-step configuration for new organizations',
          'Portal Branding & Captcha: Brand the public portal and enable bot protection',
          'AI, Email & Storage: Connect core integrations during onboarding',
          'Meeting Integrations: Google Meet, Zoom, or Teams setup prompts',
          'Timezone & Team: Set timezone and invite initial users',
          'Custom Fields Introduction: Create first custom fields from the wizard',
        ],
      },
      {
        title: 'Backup & Recovery',
        highlights: [
          'Database Backups: Create on-demand backups',
          'Backup Scheduling: Automated backup schedules with timezone-aware cron',
          'Backup Download: Download backup archives',
          'Backup Restoration: Restore from saved backups',
          'Snapshot Management: Manage database snapshots',
        ],
      },
      {
        title: 'Monitoring, Logs & Assets',
        highlights: [
          'System Logs: View application activity logs',
          'Nginx & PM2 Logs: Access web server and process manager logs where deployed',
          'Error Tracking: Monitor application errors in production',
          'Disk Space Monitoring: Track server disk usage',
          'Media Assets Archive: Download bundled media assets for migration or backup',
          'About & Auto-Update: Version info and controlled update settings for self-hosted installs',
        ],
      },
    ],
  },
  {
    id: 'integrations',
    icon: Link2,
    title: 'Integrations',
    description: 'Calendar, video meetings, email, storage, and AI providers',
    features: [
      {
        title: 'Calendar & Video Meetings',
        highlights: [
          'Google Calendar: Full calendar sync and event management',
          'Google Meet: Automatic Meet links on Google assignments',
          'Zoom: OAuth-connected Zoom meeting scheduling',
          'Microsoft Teams: Teams online meetings and reminder templates',
          'Webhook Sync: Google Calendar webhook subscriptions for live sync',
        ],
      },
      {
        title: 'Email Integrations',
        highlights: [
          'SMTP: Custom SMTP servers',
          'Resend: Modern transactional API',
          'Brevo: Sendinblue-compatible API integration',
        ],
      },
      {
        title: 'Storage Integrations',
        highlights: [
          'Cloudinary: Media CDN and transformations',
          'AWS S3: Scalable object storage',
          'Local Storage: Self-hosted file storage',
        ],
      },
      {
        title: 'AI Integrations',
        highlights: [
          'Premium AI: Google Gemini, OpenAI, Anthropic Claude, Perplexity',
          'Bulk CV AI: Groq, Gemini, DeepSeek, OpenRouter, Cerebras, Mistral',
          'PDF-to-Markdown Parsing: Structured markdown conversion in bulk CV pipelines',
        ],
      },
    ],
  },
];

const whyHireTrackDifferentiators = [
  'Multi-AI Provider Support (Gemini, ChatGPT, Claude, Perplexity)',
  'Dual CV Parsing: Cost-Optimized Bulk Pool + Premium Main AI',
  'Zoom, Google Meet & Microsoft Teams in One Workflow',
  'True Multi-Tenancy with Complete Data Isolation',
  'Drag-and-Drop Pipeline with Lane Checklists & RBAC',
  'Enhanced AI Evaluation (Red Flags, Skills Matrix, Evidence)',
  'Server-Sent Events for Live Dashboard & Kanban Sync',
  'Highly Flexible Custom Fields with Role-Based Visibility',
  'Role-Based Access Control (Admin, HR, Interviewer, Candidate)',
  'Multiple Storage Options (S3, Cloudinary, Local)',
  'Tabbed Analytics (Funnel, Jobs, Interviews, Trends)',
  'Guided Onboarding Wizard for New Organizations',
] as const;

function countFeaturePoints() {
  let count = 0;
  for (const category of featureCategories) {
    for (const feature of category.features) {
      count += feature.highlights.length;
      for (const sub of feature.subFeatures ?? []) {
        count += sub.items.length;
      }
    }
  }
  return count;
}

const FEATURE_POINT_COUNT = countFeaturePoints();

export function FeaturesShowcase() {
  const featureBadgeLabel = `${FEATURE_POINT_COUNT}+ Features`;

  return (
    <div className="min-h-screen bg-background">
      <section className="relative overflow-hidden pt-20 pb-12 lg:pt-32 lg:pb-24">
        <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]">
          <div className="absolute top-0 right-0 -z-10 h-[500px] w-[500px] rounded-full bg-accent/10 opacity-60 blur-[120px]" />
        </div>

        <div className="container mx-auto px-4 md:px-6">
          <div className="mx-auto max-w-4xl space-y-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-secondary bg-secondary px-3 py-1.5 text-primary shadow-sm">
              <Sparkles className="h-3.5 w-3.5 fill-current" />
              <span className="text-sm font-semibold tracking-wide uppercase">
                {featureBadgeLabel}
              </span>
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-balance text-foreground md:text-5xl lg:text-7xl">
              Complete Feature{' '}
              <span className="text-primary underline decoration-accent underline-offset-4">
                Showcase
              </span>
            </h1>

            <p className="mx-auto max-w-2xl text-lg text-balance text-muted-foreground md:text-xl">
              Explore the powerful features that make HireTrack the most
              comprehensive hiring management platform.
            </p>
          </div>
        </div>
      </section>

      <section className="pb-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="space-y-32">
            {featureCategories.map((category) => (
              <div key={category.id} id={category.id} className="scroll-mt-24">
                <div className="mb-12 flex flex-col gap-6 border-b border-dashed border-border/50 pb-8 md:flex-row md:items-center">
                  <div className="flex-shrink-0 rounded-xl bg-accent p-4 text-primary-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-none">
                    <category.icon className="h-8 w-8" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h2 className="mb-2 text-3xl font-bold tracking-tight text-foreground">
                      {category.title}
                    </h2>
                    <p className="max-w-2xl text-lg text-muted-foreground">
                      {category.description}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {category.features.map((feature, featureIndex) => (
                    <Card
                      key={featureIndex}
                      className="group flex h-full flex-col border-border/50 bg-card transition-all duration-300 hover:border-primary/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
                    >
                      <CardHeader className="space-y-0 pb-4">
                        <CardTitle className="text-xl leading-snug font-bold">
                          {feature.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-1 flex-col pt-0">
                        <ul className="mb-6 space-y-3">
                          {feature.highlights.slice(0, 3).map((highlight, idx) => (
                            <li
                              key={idx}
                              className="group/item flex items-start gap-3 text-sm"
                            >
                              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent transition-transform group-hover/item:scale-125" />
                              <span className="leading-relaxed text-muted-foreground">
                                {highlight}
                              </span>
                            </li>
                          ))}
                        </ul>

                        {(feature.highlights.length > 3 ||
                          (feature.subFeatures &&
                            feature.subFeatures.length > 0)) && (
                          <div className="mt-auto pt-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  className="group/button w-full justify-between hover:bg-accent/10 hover:text-primary"
                                >
                                  <span>View Detailed Specs</span>
                                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover/button:translate-x-0.5 group-hover/button:-translate-y-0.5" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-primary">
                                    <category.icon className="h-6 w-6" />
                                    {feature.title}
                                  </DialogTitle>
                                  <DialogDescription>
                                    Full feature specifications and details.
                                  </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-6 py-4">
                                  <div>
                                    <h4 className="mb-3 text-sm font-semibold tracking-wider text-foreground uppercase">
                                      Key Features
                                    </h4>
                                    <div className="grid gap-3">
                                      {feature.highlights.map((highlight, idx) => (
                                        <div
                                          key={idx}
                                          className="flex items-start gap-3 rounded-lg border border-border/50 bg-secondary/30 p-3"
                                        >
                                          <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                                          <span className="text-sm text-foreground/90">
                                            {highlight}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {feature.subFeatures &&
                                    feature.subFeatures.length > 0 && (
                                      <div>
                                        <h4 className="mb-3 text-sm font-semibold tracking-wider text-foreground uppercase">
                                          Configuration & Options
                                        </h4>
                                        <div className="grid gap-4 md:grid-cols-2">
                                          {feature.subFeatures.map(
                                            (subFeature, subIdx) => (
                                              <div
                                                key={subIdx}
                                                className="rounded-lg border border-border bg-card p-4 shadow-sm"
                                              >
                                                <Badge
                                                  variant="secondary"
                                                  className="mb-3 bg-secondary text-secondary-foreground"
                                                >
                                                  {subFeature.name}
                                                </Badge>
                                                <ul className="space-y-2">
                                                  {subFeature.items.map(
                                                    (item, itemIdx) => (
                                                      <li
                                                        key={itemIdx}
                                                        className="flex items-start gap-2 text-sm text-muted-foreground"
                                                      >
                                                        <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent/40" />
                                                        <span>{item}</span>
                                                      </li>
                                                    ),
                                                  )}
                                                </ul>
                                              </div>
                                            ),
                                          )}
                                        </div>
                                      </div>
                                    )}
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-secondary py-24 text-secondary-foreground">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-12 flex flex-col items-start justify-between gap-12 md:flex-row">
            <div>
              <h2 className="mb-4 text-3xl font-bold tracking-tight text-primary">
                Why HireTrack?
              </h2>
              <p className="max-w-xl text-lg text-muted-foreground">
                Built for flexibility, security, and scale. We don&apos;t just add
                features; we solve hiring problems end to end.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2 lg:grid-cols-3">
            {whyHireTrackDifferentiators.map((diff, idx) => (
              <div key={idx} className="flex items-start gap-4">
                <div className="mt-1">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm leading-relaxed font-medium text-secondary-foreground/90">
                  {diff}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden py-24">
        <div className="container relative z-10 px-4 text-center">
          <div className="relative mx-auto max-w-3xl space-y-8 overflow-hidden rounded-3xl border border-border bg-background p-12 shadow-2xl">
            <div className="absolute top-0 left-0 h-1 w-full bg-accent" />

            <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Ready to modernize your hiring?
            </h2>
            <div className="flex flex-col items-center justify-center gap-4 pt-4 sm:flex-row">
              <a href="/installation-guide">
                <Button
                  size="lg"
                  className="h-14 rounded-full bg-accent px-8 text-base font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-accent/90"
                >
                  View Installation Guide
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </a>

              <a href="/#documentation">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 rounded-full border-2 px-8 text-base hover:bg-secondary hover:text-secondary-foreground"
                >
                  View Documentation
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
