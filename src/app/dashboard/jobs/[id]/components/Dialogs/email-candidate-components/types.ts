export interface FileAttachment {
  file: File;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  variables: string[];
  isDefault?: boolean;
  isCustom?: boolean;
}

