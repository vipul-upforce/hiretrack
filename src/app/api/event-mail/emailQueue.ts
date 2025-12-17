import { NextRequest } from 'next/server';
import {
  EmailQueueItem,
  EventMailQueueData,
  ScheduleEmailResult,
} from './types';
import { sendQueuedEmail } from './emailSender';
import { updateEmailHistoryStatus } from './emailHistory';

// Email queue to track pending emails
const emailQueue = new Map<string, EmailQueueItem>();

/**
 * Schedule an email to be sent after a delay
 */
export function scheduleEmail(
  key: string,
  data: EventMailQueueData,
  req: NextRequest,
  senderEmail?: string,
  delayMs: number = 2 * 60 * 1000,
): ScheduleEmailResult {
  if (emailQueue.has(key)) {
    const existingItem = emailQueue.get(key);
    if (existingItem) {
      emailQueue.set(key, {
        ...existingItem,
        data,
      });
      return { success: true, message: 'Email data updated' };
    }
  }

  const timer = setTimeout(async () => {
    const queueItem = emailQueue.get(key);
    if (queueItem) {
      try {
        await sendQueuedEmail({
          data: queueItem.data,
          req,
          historyIds: queueItem.historyIds,
        });
      } catch (error) {
        // Update history to failed status
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
    senderEmail, // Store sender's email to exclude from recipients
  });

  return { success: true, message: 'Email scheduled' };
}

/**
 * Get email queue item
 */
export function getEmailQueueItem(key: string): EmailQueueItem | undefined {
  return emailQueue.get(key);
}

/**
 * Update email queue item
 */
export function updateEmailQueueItem(
  key: string,
  item: EmailQueueItem,
): void {
  emailQueue.set(key, item);
}

/**
 * Get all queue items for status endpoint
 */
export function getAllQueueItems(): Array<[string, EmailQueueItem]> {
  return Array.from(emailQueue.entries());
}
