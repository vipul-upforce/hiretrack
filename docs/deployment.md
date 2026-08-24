# HireTrack Deployment Guide

## 📖 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Environment Setup](#environment-setup)
4. [Database Setup](#database-setup)
5. [Application Deployment](#application-deployment)
6. [Production Configuration](#production-configuration)
7. [SSL/HTTPS Setup](#sslhttps-setup)
8. [Monitoring & Logging](#monitoring--logging)
9. [Backup & Recovery](#backup--recovery)
10. [Scaling](#scaling)
11. [Troubleshooting](#troubleshooting)

## 🚀 Overview

This guide covers deploying HireTrack to production environments. The application is built with Next.js and can be deployed using various methods including traditional servers, cloud platforms, and containerized environments.

### Deployment Options

- **Traditional Server**: VPS or dedicated server
- **Cloud Platforms**: AWS, Google Cloud, Azure
- **Container Platforms**: Docker, Kubernetes
- **Serverless**: Vercel, Netlify (limited features)

## �� Prerequisites

### System Requirements

#### Minimum Requirements

- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 20GB SSD
- **OS**: Ubuntu 20.04+ or CentOS 8+

#### Recommended Requirements

- **CPU**: 4+ cores
- **RAM**: 8GB+
- **Storage**: 50GB+ SSD
- **OS**: Ubuntu 22.04 LTS

### Software Dependencies

#### Node.js

```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

#### MongoDB

```bash
# Install MongoDB 5.0+
wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### Nginx

```bash
# Install Nginx
sudo apt-get update
sudo apt-get install -y nginx

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### PM2 (Process Manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Verify installation
pm2 --version
```

## ⚙️ Environment Setup

### Environment Variables

Create a `.env.local` file in the project root:

```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/hiretrack
MONGODB_URI_PROD=mongodb://username:password@host:port/database

# Authentication
JWT_SECRET=your-super-secret-jwt-key-here
NEXTAUTH_SECRET=your-nextauth-secret-key
NEXTAUTH_URL=https://your-domain.com

# Email Configuration
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_SECURE=true

# File Storage
STORAGE_PROVIDER=local
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# AWS S3 (Alternative)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

# AI Configuration
GEMINI_API_KEY=your-gemini-api-key

# Application Settings
NODE_ENV=production
PORT=3000
BASE_URL=https://your-domain.com

# Security
CORS_ORIGIN=https://your-domain.com
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/hiretrack/app.log
```

### Environment-Specific Configurations

#### Development

```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/hiretrack_dev
```

#### Staging

```env
NODE_ENV=staging
PORT=3000
MONGODB_URI=mongodb://staging-db:27017/hiretrack_staging
```

#### Production

```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://prod-db:27017/hiretrack_prod
```

## 🗄️ Database Setup

### MongoDB Installation

#### Ubuntu/Debian

```bash
# Import MongoDB public GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | sudo apt-key add -

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list

# Update package database
sudo apt-get update

# Install MongoDB
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify installation
mongo --version
```

#### CentOS/RHEL

```bash
# Create MongoDB repository file
sudo tee /etc/yum.repos.d/mongodb-org-5.0.repo << EOF
[mongodb-org-5.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/\$releasever/mongodb-org/5.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-5.0.asc
EOF

# Install MongoDB
sudo yum install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

### Database Configuration

#### Security Setup

```bash
# Access MongoDB shell
mongo

# Create admin user
use admin
db.createUser({
  user: "admin",
  pwd: "secure-password",
  roles: ["userAdminAnyDatabase", "dbAdminAnyDatabase", "readWriteAnyDatabase"]
})

# Create application database and user
use hiretrack
db.createUser({
  user: "hiretrack_user",
  pwd: "application-password",
  roles: ["readWrite"]
})

# Exit MongoDB shell
exit
```

#### Enable Authentication

```bash
# Edit MongoDB configuration
sudo nano /etc/mongod.conf

# Add security section
security:
  authorization: enabled

# Restart MongoDB
sudo systemctl restart mongod
```

#### Database Indexes

```javascript
// Connect to MongoDB and creat
```
