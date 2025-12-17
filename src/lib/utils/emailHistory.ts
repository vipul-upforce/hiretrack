import mongoose from 'mongoose';
import { EmailHistory } from '@/lib/mongodb';
import { logger } from '@/lib/logger/logger.server';
import type { UpdateHistoryParams } from './emailTypes';

/**
 * Update email history entries from pending to sent/failed
 */
export async function updateEmailHistoryStatus(
  params: UpdateHistoryParams,
): Promise<void> {
  const { historyIds, status, error, updatedContent } = params;

  try {
    const updateData: {
      status: 'sent' | 'failed';
      sentAt?: Date;
      error?: string;
      subject?: string;
      body?: string;
    } = {
      status,
      sentAt: status === 'sent' ? new Date() : undefined,
      error: status === 'failed' ? error : undefined,
    };

    // Update content if provided (for final email with correct data)
    if (updatedContent) {
      updateData.subject = updatedContent.subject;
      updateData.body = updatedContent.body;
    }

    await EmailHistory?.updateMany(
      { _id: { $in: historyIds.map((id) => new mongoose.Types.ObjectId(id)) } },
      { $set: updateData },
    );
  } catch (err) {
    logger.error({ error: err }, 'Failed to update email history status');
  }
}
