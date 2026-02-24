# HireTrack API Documentation

## 📖 Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Base URL & Endpoints](#base-url--endpoints)
4. [Error Handling](#error-handling)
5. [Rate Limiting](#rate-limiting)
6. [API Endpoints](#api-endpoints)
7. [Data Models](#data-models)
8. [Webhooks](#webhooks)
9. [SDK Examples](#sdk-examples)

## �� Overview

The HireTrack API provides programmatic access to all platform features. Built with RESTful principles, the API supports JSON request/response formats and uses JWT tokens for authentication.

### API Versioning

- **Current Version**: v1
- **Base URL**: `https://your-domain.com/api`
- **Content-Type**: `application/json`

### Supported HTTP Methods

- `GET`: Retrieve data
- `POST`: Create new resources
- `PUT`: Update existing resources
- `DELETE`: Remove resources
- `PATCH`: Partial updates

## 🔐 Authentication

### JWT Token Authentication

All API requests require a valid JWT token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

### Obtaining Access Tokens

#### Login Endpoint

```http
POST /api/auth/login
```

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "your-password"
}
```

**Response:**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-id",
    "name": "John Doe",
    "email": "user@example.com",
    "role": "admin",
    "organizationId": "org-id"
  }
}
```

#### Token Refresh

```http
POST /api/auth/refresh
```

**Headers:**

```http
Authorization: Bearer <current-token>
```

### Two-Factor Authentication

#### Send OTP

```http
POST /api/auth/2fa/send-otp
```

**Request Body:**

```json
{
  "email": "user@example.com"
}
```

#### Verify OTP

```http
POST /api/auth/2fa/verify-otp
```

**Request Body:**

```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

## 🌐 Base URL & Endpoints

### Production Environment

```
https://your-domain.com/api
```

### Development Environment

```
http://localhost:3000/api
```

### API Structure

```
/api
├── auth/           # Authentication endpoints
├── jobs/           # Job management
├── candidates/     # Candidate management
├── users/          # User management
├── settings/       # System settings
├── files/          # File upload/download
└── backups/        # Database backups
```

## ❌ Error Handling

### Standard Error Response Format

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional error details"
  }
}
```

### HTTP Status Codes

| Code | Description           |
| ---- | --------------------- |
| 200  | Success               |
| 201  | Created               |
| 400  | Bad Request           |
| 401  | Unauthorized          |
| 403  | Forbidden             |
| 404  | Not Found             |
| 422  | Validation Error      |
| 429  | Rate Limited          |
| 500  | Internal Server Error |

### Common Error Codes

| Code                       | Description                      |
| -------------------------- | -------------------------------- |
| `INVALID_CREDENTIALS`      | Wrong email/password             |
| `TOKEN_EXPIRED`            | JWT token expired                |
| `INSUFFICIENT_PERMISSIONS` | User lacks required permissions  |
| `VALIDATION_ERROR`         | Request data validation failed   |
| `RESOURCE_NOT_FOUND`       | Requested resource doesn't exist |
| `DUPLICATE_ENTRY`          | Resource already exists          |

## ⏱️ Rate Limiting

### Rate Limits

- **Standard Users**: 100 requests per minute
- **Admin Users**: 500 requests per minute
- **API Keys**: 1000 requests per minute

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

### Rate Limit Exceeded Response

```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 60
}
```

## API Endpoints

### Authentication Endpoints

#### Login

```http
POST /api/auth/login
```

**Request:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-id",
    "name": "John Doe",
    "email": "user@example.com",
    "role": "admin",
    "organizationId": "org-id"
  }
}
```

#### Signup

```http
POST /api/auth/signup
```

**Request:**

```json
{
  "name": "John Doe",
  "email": "user@example.com",
  "password": "password123",
  "organizationName": "Acme Corp",
  "organizationEmail": "hr@acmecorp.com"
}
```

#### Forgot Password

```http
POST /api/auth/forgot-password
```

**Request:**

```json
{
  "email": "user@example.com"
}
```

#### Reset Password

```http
POST /api/auth/reset-password
```

**Request:**

```json
{
  "token": "reset-token",
  "password": "new-password"
}
```

### Job Management Endpoints

#### Get All Jobs

```http
GET /api/jobs
```

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `status`: Job status filter
- `search`: Search term

**Response:**

```json
{
  "success": true,
  "data": {
    "jobs": [
      {
        "id": "job-id",
        "title": "Software Engineer",
        "description": "Job description",
        "skills": ["JavaScript", "React", "Node.js"],
        "experience": 3,
        "location": "Remote",
        "salary": {
          "min": 80000,
          "max": 120000
        },
        "status": "open",
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "pages": 5
    }
  }
}
```

#### Create Job

```http
POST /api/jobs
```

**Request:**

```json
{
  "title": "Software Engineer",
  "description": "We are looking for a skilled software engineer...",
  "skills": ["JavaScript", "React", "Node.js"],
  "experience": 3,
  "location": "Remote",
  "salary": {
    "min": 80000,
    "max": 120000
  },
  "customFields": {
    "department": "Engineering",
    "team": "Frontend"
  }
}
```

#### Update Job

```http
PUT /api/jobs/{jobId}
```

**Request:**

```json
{
  "title": "Senior Software Engineer",
  "status": "closed"
}
```

#### Delete Job

```http
DELETE /api/jobs/{jobId}
```

### Candidate Management Endpoints

#### Get All Candidates

```http
GET /api/candidates
```

**Query Parameters:**

- `page`: Page number
- `limit`: Items per page
- `jobId`: Filter by job
- `status`: Filter by status
- `search`: Search term

**Response:**

```json
{
  "success": true,
  "data": {
    "candidates": [
      {
        "id": "candidate-id",
        "name": "Jane Smith",
        "email": "jane@example.com",
        "phone": "+1234567890",
        "experience": 5,
        "skills": ["JavaScript", "React", "Node.js"],
        "currentCTC": 90000,
        "expectedCTC": 110000,
        "status": "shortlisted",
        "jobId": "job-id",
        "resume": {
          "id": "file-id",
          "name": "resume.pdf",
          "url": "https://storage.com/resume.pdf"
        },
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "pages": 10
    }
  }
}
```

#### Create Candidate

```http
POST /api/candidates
```

**Request:**

```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "+1234567890",
  "experience": 5,
  "skills": ["JavaScript", "React", "Node.js"],
  "currentCTC": 90000,
  "expectedCTC": 110000,
  "jobId": "job-id",
  "resume": "file-id",
  "customFields": {
    "source": "LinkedIn",
    "referral": "John Doe"
  }
}
```

#### Update Candidate

```http
PUT /api/candidates/{candidateId}
```

**Request:**

```json
{
  "status": "shortlisted",
  "remarks": "Strong technical skills"
}
```

#### Filter Candidates

```http
GET /api/candidates/filter
```

**Query Parameters:**

- `skills`: Comma-separated skills
- `experience`: Years of experience
- `salaryMin`: Minimum salary
- `salaryMax`: Maximum salary
- `location`: Location filter
- `dateFrom`: Application date from
- `dateTo`: Application date to

### Interview Management Endpoints

#### Get Interview Assignments

```http
GET /api/candidates/assignments
```

**Query Parameters:**

- `interviewerId`: Filter by interviewer
- `date`: Filter by date
- `status`: Filter by status

**Response:**

```json
{
  "success": true,
  "data": {
    "assignments": [
      {
        "id": "assignment-id",
        "candidateId": "candidate-id",
        "interviewerId": "interviewer-id",
        "jobId": "job-id",
        "interviewDate": "2024-01-15T10:00:00Z",
        "duration": 60,
        "type": "video",
        "status": "scheduled",
        "candidate": {
          "name": "Jane Smith",
          "email": "jane@example.com"
        },
        "interviewer": {
          "name": "John Doe",
          "email": "john@example.com"
        },
        "job": {
          "title": "Software Engineer"
        }
      }
    ]
  }
}
```

#### Schedule Interview

```http
POST /api/candidates/assignments
```

**Request:**

```json
{
  "candidateId": "candidate-id",
  "interviewerId": "interviewer-id",
  "jobId": "job-id",
  "interviewDate": "2024-01-15T10:00:00Z",
  "duration": 60,
  "type": "video",
  "notes": "Technical interview focusing on React"
}
```

#### Send Interview Email

```http
POST /api/event-mail
```

**Request:**

```json
{
  "assignmentId": "assignment-id",
  "template": "interview-invitation",
  "customMessage": "Please join us for a technical interview"
}
```

### File Management Endpoints

#### Upload File

```http
POST /api/files
```

**Request:**

```http
Content-Type: multipart/form-data

file: <file-binary>
type: resume
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "file-id",
    "name": "resume.pdf",
    "url": "https://storage.com/resume.pdf",
    "size": 1024000,
    "type": "application/pdf"
  }
}
```

#### Download File

```http
GET /api/files/{fileId}
```

#### Delete File

```http
DELETE /api/files/{fileId}
```

### Settings Endpoints

#### Get Organization Settings

```http
GET /api/settings
```

**Response:**

```json
{
  "success": true,
  "data": {
    "organization": {
      "name": "Acme Corp",
      "email": "hr@acmecorp.com",
      "logo": "https://storage.com/logo.png",
      "timezone": "America/New_York"
    },
    "email": {
      "provider": "smtp",
      "smtp": {
        "host": "smtp.gmail.com",
        "port": 587,
        "secure": true
      }
    },
    "storage": {
      "provider": "cloudinary",
      "cloudinary": {
        "cloudName": "acmecorp",
        "apiKey": "api-key"
      }
    }
  }
}
```

#### Update File Storage Settings

```http
PUT /api/settings/fs
```

**Request:**

```json
{
  "provider": "cloudinary",
  "cloudinary": {
    "cloudName": "acmecorp",
    "apiKey": "api-key",
    "apiSecret": "api-secret"
  }
}
```

#### Update Email Templates

```http
PUT /api/settings/templates
```

**Request:**

```json
{
  "templates": {
    "interview-invitation": {
      "subject": "Interview Invitation",
      "body": "Dear {{candidateName}}, you are invited for an interview..."
    },
    "application-confirmation": {
      "subject": "Application Received",
      "body": "Thank you for your application..."
    }
  }
}
```

### User Management Endpoints

#### Get All Users

```http
GET /api/users
```

**Query Parameters:**

- `role`: Filter by role
- `search`: Search by name or email

#### Create User

```http
POST /api/users
```

**Request:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "role": "interviewer",
  "password": "password123"
}
```

#### Update User

```http
PUT /api/users/{userId}
```

**Request:**

```json
{
  "name": "John Doe",
  "role": "hr",
  "isActive": true
}
```

### Backup Endpoints

#### Get Backups

```http
GET /api/backups
```

**Response:**

```json
{
  "success": true,
  "data": {
    "backups": [
      {
        "id": "backup-id",
        "filename": "backup-2024-01-01.sql",
        "size": 1024000,
        "createdAt": "2024-01-01T00:00:00Z",
        "status": "completed"
      }
    ]
  }
}
```

#### Create Backup

```http
POST /api/backups
```

#### Download Backup

```http
GET /api/backups/{backupId}/download
```

## 📊 Data Models

### User Model

```json
{
  "id": "string",
  "name": "string",
  "email": "string",
  "role": "admin|hr|interviewer|candidate",
  "organizationId": "string",
  "isActive": "boolean",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

### Job Model

```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "skills": ["string"],
  "experience": "number",
  "location": "string",
  "salary": {
    "min": "number",
    "max": "number",
    "currency": "string"
  },
  "status": "open|draft|closed",
  "organizationId": "string",
  "customFields": "object",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

### Candidate Model

```json
{
  "id": "string",
  "name": "string",
  "email": "string",
  "phone": "string",
  "experience": "number",
  "skills": ["string"],
  "currentCTC": "number",
  "expectedCTC": "number",
  "noticePeriod": "number",
  "location": "string",
  "status": "applied|screening|shortlisted|interview|processing|accepted|rejected",
  "jobId": "string",
  "organizationId": "string",
  "resume": {
    "id": "string",
    "name": "string",
    "url": "string",
    "size": "number"
  },
  "customFields": "object",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

### Assignment Model

```json
{
  "id": "string",
  "candidateId": "string",
  "interviewerId": "string",
  "jobId": "string",
  "interviewDate": "datetime",
  "duration": "number",
  "type": "phone|video|onsite",
  "status": "scheduled|completed|cancelled",
  "notes": "string",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

## 🔗 Webhooks

### Webhook Configuration

```http
POST /api/settings/webhooks
```

**Request:**

```json
{
  "url": "https://your-app.com/webhooks/hiretrack",
  "events": ["candidate.created", "interview.scheduled"],
  "secret": "webhook-secret"
}
```

### Supported Events

- `candidate.created`: New candidate application
- `candidate.updated`: Candidate status change
- `interview.scheduled`: Interview scheduled
- `interview.completed`: Interview completed
- `job.created`: New job posted
- `job.updated`: Job updated
- `job.closed`: Job closed

### Webhook Payload

```json
{
  "event": "candidate.created",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    "candidateId": "candidate-id",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "jobId": "job-id",
    "jobTitle": "Software Engineer"
  }
}
```

### Webhook Verification

```javascript
const crypto = require("crypto");

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

## 💻 SDK Examples

### JavaScript/Node.js

```javascript
const HireTrackAPI = require("hiretrack-sdk");

const api = new HireTrackAPI({
  baseURL: "https://your-domain.com/api",
  token: "your-jwt-token",
});

// Get all jobs
const jobs = await api.jobs.getAll({
  page: 1,
  limit: 10,
  status: "open",
});

// Create a candidate
const candidate = await api.candidates.create({
  name: "Jane Smith",
  email: "jane@example.com",
  jobId: "job-id",
  resume: "file-id",
});

// Schedule an interview
const interview = await api.interviews.schedule({
  candidateId: "candidate-id",
  interviewerId: "interviewer-id",
  interviewDate: "2024-01-15T10:00:00Z",
  duration: 60,
});
```

### Python

```python
import hiretrack

api = hiretrack.Client(
    base_url='https://your-domain.com/api',
    token='your-jwt-token'
)

# Get candidates
candidates = api.candidates.list(
    page=1,
    limit=10,
    status='shortlisted'
)

# Create job
job = api.jobs.create({
    'title': 'Software Engineer',
    'description': 'We are looking for...',
    'skills': ['JavaScript', 'React'],
    'experience': 3
})
```

### cURL Examples

```bash
# Login
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Get jobs
curl -X GET https://your-domain.com/api/jobs \
  -H "Authorization: Bearer your-token"

# Create candidate
curl -X POST https://your-domain.com/api/candidates \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Smith","email":"jane@example.com","jobId":"job-id"}'
```

---

_For additional support, contact our API team at api@hiretrack.com_
