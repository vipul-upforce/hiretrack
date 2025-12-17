
import type { StatusUpdateQueueData, EmailQueueItem } from './types';
import { sendQueuedEmail } from './statusEmailSender';
import { updateEmailHistoryStatus } from './statusEmailHistory';

/**
 * Email queue to track pending emails
 */
const emailQueue = new Map<string, EmailQueueItem>();

/**
 * Get the email queue instance
 */
export function getEmailQueue(): Map<string, EmailQueueItem> {
  return emailQueue;
}

/**
 * Schedule an email to be sent after a delay
 * @param key - Unique identifier for the email queue item
 * @param data - Email queue data
 * @param delayMs - Delay in milliseconds (default: 2 minutes)
 * @returns Success status
 */
export function scheduleEmail(
  key: string,
  data: StatusUpdateQueueData,
  delayMs: number = 2 * 60 * 1000,
): { success: boolean; message: string } {
  if (emailQueue.has(key)) {
    const existingItem = emailQueue.get(key)!;
    emailQueue.set(key, {
      ...existingItem,
      data,
    });
    return { success: true, message: 'Email data updated' };
  }

  const timer = setTimeout(async () => {
    const queueItem = emailQueue.get(key);
    if (queueItem) {
      try {
        await sendQueuedEmail(queueItem.data, queueItem.historyIds);
      } catch (error) {
        if (queueItem.historyIds.length > 0) {
          await updateEmailHistoryStatus({
            historyIds: queueItem.historyIds,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      } finally {
        emailQueue.delete(key);
      }
    }
  }, delayMs);

  emailQueue.set(key, {
    data,
    timer,
    timestamp: Date.now() + delayMs,
    historyIds: [], // Will be populated after creating pending history
  });

  return { success: true, message: 'Email scheduled' };
}

/**
 * Update history IDs for a queued email
 */
export function updateQueueItemHistoryIds(
  key: string,
  historyIds: string[],
): void {
  const queueItem = emailQueue.get(key);
  if (queueItem) {
    queueItem.historyIds = historyIds;
    emailQueue.set(key, queueItem);
  }
}
