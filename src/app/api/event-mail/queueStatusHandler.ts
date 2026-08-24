import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { getAllQueueItems } from './emailQueue';
import { QueueStatusItem, QueueStatusResponse } from './types';

/**
 * Handle queue status request
 */
export async function handleQueueStatus(req: NextRequest) {
  const userData = await getAuthenticatedUser(req, 'admin');
  if (!userData) {
    return NextResponse.json(
      { message: 'Unauthorised Access' },
      { status: 401 },
    );
  }
  const queueEntries = getAllQueueItems();
  const queueStatus: QueueStatusItem[] = queueEntries.map(([key, value]) => ({
    key,
    candidateName: value.data.candidateName ?? 'N/A',
    jobName: value.data.jobName,
    scheduledAt: new Date(value.timestamp).toISOString(),
    timeRemaining: `${Math.round((value.timestamp - Date.now()) / 1000)} seconds`,
    pendingHistoryRecords: value.historyIds.length,
  }));

  const response: QueueStatusResponse = {
    queueSize: queueEntries.length,
    queue: queueStatus,
  };

  return NextResponse.json(response);
}
