# Notifications Module Structure

This directory contains all notification and email notification related functionality, organized in a clean, modular structure.

## Directory Structure

```
notifications/
├── core/                      # Core notification logic
│   ├── notificationCore.ts   # Core CRUD operations for notifications
│   ├── notificationHelpers.ts # Helper functions for notification creation
│   └── userHelpers.ts        # User-related helper functions
│
├── handlers/                  # Event-specific notification handlers
│   ├── candidateHandlers.ts  # Candidate-related notifications
│   ├── jobHandlers.ts        # Job-related notifications
│   ├── meetingHandlers.ts     # Meeting-related notifications
│   ├── meetingInviteHandlers.ts # Meeting invite notifications
│   ├── assignmentHandlers.ts # Assignment notifications
│   ├── followupHandlers.ts   # Follow-up notifications
│   └── otherHandlers.ts      # Other notification types
│
├── decision/                  # Notification decision engine
│   ├── index.ts              # Main decision engine exports
│   ├── types.ts              # Type definitions
│   ├── resolvers.ts          # Settings resolution logic
│   ├── validators.ts         # Validation logic
│   └── helpers.ts            # Helper functions
│
├── email/                     # Email sending and management
│   ├── unifiedEmailService.ts # Unified email service (email + in-app)
│   ├── emailService.ts       # Core email sending service
│   ├── providers/            # Email provider implementations
│   │   ├── index.ts
│   │   ├── smtp.ts
│   │   ├── resend.ts
│   │   └── brevo.ts
│   ├── history.ts            # Email history tracking
│   ├── validators.ts         # Email validation
│   └── types.ts              # Email-related types
│
├── settings/                  # Notification settings management
│   ├── emailNotificationService.ts # Settings CRUD operations
│   ├── helpers.ts            # Settings helper functions
│   ├── validators.ts         # Settings validation
│   └── constants.ts          # Settings constants and utilities
│
├── models/                    # Notification models
│   └── notification.ts       # Notification schema and types
│
├── types.ts                   # Shared type definitions
├── notificationService.ts     # Main notification service API
└── index.ts                   # Main module exports
```

## Key Exports

### Main Entry Point

```typescript
import {
  NotificationService,
  NotificationType,
  sendUnifiedMail,
  sendSmartNotification,
  // ... other exports
} from '@/lib/notifications';
```

### Decision Engine

```typescript
import {
  shouldSendNotification,
  batchCheckNotifications,
  getUserEffectiveNotificationSettings,
} from '@/lib/notifications/decision';
```

### Email Services

```typescript
import {
  sendUnifiedMail,
  sendEventEmailWithHistory,
  sendSmartNotification,
} from '@/lib/notifications/email';
```

### Settings

```typescript
import {
  getOrganizationEmailNotifications,
  getAdminUsers,
  updateOrganizationEmailNotifications,
} from '@/lib/notifications/settings';
```

## Backward Compatibility

Backward compatibility re-exports are maintained in:

- `@/lib/services/emailDecisionEngine` → `@/lib/notifications/decision`
- `@/lib/unifiedEmailService` → `@/lib/notifications/email/unifiedEmailService`
- `@/lib/emailUtils` → `@/lib/notifications/email/emailService`
- `@/lib/services/emailNotificationService` → `@/lib/notifications/settings/emailNotificationService`

These re-exports are marked as `@deprecated` and should be migrated to the new paths.

## Migration Guide

### Old Imports → New Imports

1. **Decision Engine:**

   ```typescript
   // Old
   import { NotificationType } from '@/lib/services/emailDecisionEngine';

   // New
   import { NotificationType } from '@/lib/notifications';
   ```

2. **Email Services:**

   ```typescript
   // Old
   import { sendMail } from '@/lib/emailUtils';
   import { sendUnifiedMail } from '@/lib/unifiedEmailService';

   // New
   import { sendMail, sendUnifiedMail } from '@/lib/notifications/email';
   ```

3. **Settings:**

   ```typescript
   // Old
   import { getOrganizationEmailNotifications } from '@/lib/services/emailNotificationService';

   // New
   import { getOrganizationEmailNotifications } from '@/lib/notifications/settings';
   ```

4. **Models:**

   ```typescript
   // Old
   import { NotificationType } from '@/lib/models/notification';

   // New
   import { NotificationType } from '@/lib/notifications/models/notification';
   ```

## Architecture Principles

1. **Separation of Concerns:** Each subdirectory has a clear, single responsibility
2. **Modularity:** Components can be imported independently
3. **Backward Compatibility:** Old import paths continue to work during migration
4. **Type Safety:** All exports are properly typed
5. **Clean Exports:** Index files provide clean, organized public APIs
