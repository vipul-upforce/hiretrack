export interface TestResult {
  success: boolean;
  message: string;
  details?: string;
  data?: {
    connectedEmail?: string;
    primaryCalendarName?: string;
    primaryCalendarTimeZone?: string;
    calendarCount?: number;
    lastTestedAt?: string;
    connectionStatusUpdated?: boolean;
    rawResponse?: string;
    debugInfo?: any;
    [key: string]: any;
  };
}

export interface CredentialsFormData {
  clientId: string;
  clientSecret: string;
}

export interface GoogleCalendarConfig {
  clientId?: string;
  clientSecret?: string;
  isConnected: boolean;
  connectedEmail?: string;
}
