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

### Prerequisites

- Node.js 18+
- MongoDB 5.0+
- npm or yarn package manager

### Installation

1. **Clone the Repository**

   ```bash
   git clone https://github.com/your-org/hiretrack.git
   cd hiretrack
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Environment Configuration**

   ```bash
   cp .env.example .env.local
   ```

   Configure the following environment variables:

   ```env
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   NEXTAUTH_SECRET=your_nextauth_secret
   ```

4. **Database Setup**

   ```bash
   npm run db:setup
   ```

5. **Start Development Server**

   ```bash
   npm run dev
   ```

6. **Build for Production**
   ```bash
   npm run build
   npm start
   ```

## 📋 Configuration Guide

### Organization Setup

1. Create a new organization through the registration portal
2. Configure organization settings and branding
3. Set up email templates and notifications
4. Configure file storage (Local/Cloudinary/AWS S3)
5. Set up custom fields for jobs and candidates

### AI Configuration

1. Obtain Google Gemini API key
2. Configure AI settings in organization dashboard
3. Set up resume processing parameters
4. Configure evaluation criteria and scoring

### Email Setup

1. Choose email provider (SMTP/Resend/Brevo)
2. Configure SMTP settings or API keys
3. Customize email templates
4. Test email delivery

### File Storage Configuration

1. **Local Storage**: Default file storage on server
2. **Cloudinary**: Configure cloud name, API key, and secret
3. **AWS S3**: Configure region, access keys, and bucket name

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

### Production Deployment

1. **Environment Setup**

   ```bash
   npm run build
   npm start
   ```

2. **PM2 Process Management**

   ```bash
   pm2 start "npm run start" --name "hiretrack"
   ```

3. **Nginx Configuration**

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

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

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

## 🆘 Support

### Documentation

- [User Guide](docs/user-guide.md)
- [API Documentation](docs/api.md)
- [Deployment Guide](docs/deployment.md)
- [Troubleshooting](docs/troubleshooting.md)

_Built with ❤️ in India, using Next.js, TypeScript, and MongoDB_
