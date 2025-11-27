export type EmailHistoryRecord = {
  _id: string;
  recipientName?: string;
  recipientEmail?: string;
  cc?: string[];
  bcc?: string[];
  subject?: string;
  sentByName?: string;
  sentByEmail?: string;
  sentBy?: string;
  provider?: string;
  updatedAt?: string;
  createdAt: string;
  status: "sent" | "failed" | "pending" | string;
  attachments?: {
    fileName: string;
    fileSize: number;
    shareUrl: string;
  }[];
  body?: string;
};

export interface EmailHistoryData {
  emails: EmailHistoryRecord[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}
