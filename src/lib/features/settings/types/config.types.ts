export interface TestConnectionRequest {
  storageType: 'cloudinary' | 's3' | 'smtp' | 'resend';
  credentials: {
    cloud_name?: string;
    api_key?: string;
    api_secret?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    region?: string;
    user?: string;
    pass?: string;
  };
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
  data?: any;
  details?: any;
  error?: any;
  connectionStatusUpdated?: boolean;
}

export interface GoogleCalendarConfig {
  clientId?: string;
  clientSecret?: string;
  connected?: boolean;
  redirectUri?: string;
}

export interface GoogleCalendarConfigResponse {
  googleCalendar: GoogleCalendarConfig;
}
