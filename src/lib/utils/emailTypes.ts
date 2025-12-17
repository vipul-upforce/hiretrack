export interface EmailContent {
  subject: string;
  body: string;
}

/**
 * Update email history parameters
 */
export interface UpdateHistoryParams {
  historyIds: string[];
  status: 'sent' | 'failed';
  error?: string;
  updatedContent?: EmailContent;
}
