export interface TestResult {
  success: boolean;
  message: string;
  details?: string;
  data?: {
    connectedEmail?: string;
    lastTestedAt?: string;
    rawResponse?: string;
    debugInfo?: unknown;
    [key: string]: unknown;
  };
}

export interface CredentialsFormData {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  connectedEmail?: string;
  isFollowUpReminderEnabled?: boolean;
  followUpReminderOffsetMinutes?: number;
  botUsername?: string;
  botPassword?: string;
  messageTemplates?: {
    [key: string]: {
      templateId: string;
      templateName: string;
      eventType: 'followup.reminder' | 'assignment.reminder';
      content: string;
      variables: string[];
      isActive?: boolean;
    };
  };
}

export interface MicrosoftTeamsConfig {
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
  isConnected: boolean;
  connectedEmail?: string;
  isFollowUpReminderEnabled?: boolean;
  followUpReminderOffsetMinutes?: number;
  botUsername?: string;
  botPassword?: string;
  messageTemplates?: {
    [key: string]: {
      templateId: string;
      templateName: string;
      eventType: 'followup.reminder' | 'assignment.reminder';
      content: string;
      variables: string[];
      isActive?: boolean;
    };
  };
}
