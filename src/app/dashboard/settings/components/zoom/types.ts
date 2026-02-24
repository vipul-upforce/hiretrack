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
  accountId: string;
  clientId: string;
  clientSecret: string;
}

export interface ZoomConfig {
  accountId?: string;
  clientId?: string;
  clientSecret?: string;
  isConnected: boolean;
  connectedEmail?: string;
}
