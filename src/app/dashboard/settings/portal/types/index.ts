export interface FileUpload {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface PortalSettings {
  portalName: string;
  portalLogo: FileUpload | null;
  portalLogoDark: FileUpload | null;
  portalFavicon: FileUpload | null;
  portalHeader: FileUpload | null;
  portalFooter: FileUpload | null;
  primaryColor: string;
  secondaryColor: string;
}
