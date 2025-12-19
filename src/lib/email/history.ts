import connectToDatabase, { EmailHistory } from '@/lib/mongodb';
import logger from '../logger';
import type { EmailResult } from './types';

/**
 * Updates email history record with send result
 */
export async function updateEmailHistory(
  emailHistoryId: string,
  result: EmailResult,
): Promise<void> {
  try {
    await connectToDatabase();
    const history = await EmailHistory?.findById(emailHistoryId);

    if (history) {
      history.status = result.success ? 'sent' : 'failed';
      history.providerMessageId = result.messageId;
      history.error = result.error;
      history.sentAt = new Date();
      await history.save();
    } else {
      logger.warn(`Email history not found for ID: ${emailHistoryId}`);
    }
  } catch (historyError) {
    logger.error('Failed to update email history:', historyError);
    // Do not fail the email send if history update fails
  }
}
