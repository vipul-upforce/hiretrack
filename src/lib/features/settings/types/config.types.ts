export interface TestConnectionRequest {
  storageType: 'cloudinary' | 's3' | 'smtp' | 'resend' | 'brevo';
  credentials: {
    cloud_name?: string;
    api_key?: string;
    api_secret?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    region?: string;
    user?: string;
    pass?: string;
    host?: string;
    port?: string;
    from?: string;
    // Resend credentials
    resend_api_key?: string;
    resend_from?: string;
    reply_to?: string;
    // Brevo credentials
    brevo_api_key?: string;
    brevo_from?: string;
  };
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
  data?: unknown;
  details?: string;
  error?: string;
  connectionStatusUpdated?: boolean;
}

export interface GoogleCalendarConfig {
  clientId?: string;
  clientSecret?: string;
  connected?: boolean;
  redirectUri?: string;
  connectedEmail?: string;
  isConnected?: boolean;
}

export interface GoogleCalendarConfigResponse {
  googleCalendar: GoogleCalendarConfig;
}

export interface ZoomConfig {
  accountId?: string;
  clientId?: string;
  clientSecret?: string;
  connectedEmail?: string;
  isConnected?: boolean;
}

export interface ZoomConfigResponse {
  zoom: ZoomConfig;
}

export interface MicrosoftTeamsConfig {
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
  connectedEmail?: string;
  isConnected?: boolean;
  botUsername?: string;
  botPassword?: string;
  botUserId?: string;
}

export interface MicrosoftTeamsConfigResponse {
  microsoftTeams: MicrosoftTeamsConfig;
}
