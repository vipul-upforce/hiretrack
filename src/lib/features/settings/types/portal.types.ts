export interface PortalFile {
  id: string;
  name: string;
  url: string;
  type?: string;
  size?: number;
}

export interface PortalConfigData {
  portalName: string;
  portalLogo: PortalFile | null;
  portalLogoDark: PortalFile | null;
  portalFavicon: PortalFile | null;
  portalHeader: PortalFile | null;
  portalFooter: PortalFile | null;
  primaryColor: string;
  secondaryColor: string;
  fileStorage?: { storageType: string };
}

export interface PortalConfigUpdateResponse {
  message: string;
  portalConfigs: PortalConfigData;
}

export interface EmailHistoryRecord {
  _id: string;
  recipientEmail: string;
  sentByEmail: string;
  createdAt: string;
  status: 'sent' | 'failed' | 'pending';
  subject?: string;
  body?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: { fileName: string; fileSize: number; shareUrl: string }[];
}

export interface DownloadAssetsResponse {
  blob: Blob;
  filename: string;
}
