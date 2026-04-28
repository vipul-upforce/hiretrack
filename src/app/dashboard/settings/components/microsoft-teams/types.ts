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
  botUsername?: string;
  botPassword?: string;
}

export interface MicrosoftTeamsConfig {
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
  isConnected: boolean;
  connectedEmail?: string;
  isFollowUpReminderEnabled?: boolean;
  botUsername?: string;
  botPassword?: string;
}
