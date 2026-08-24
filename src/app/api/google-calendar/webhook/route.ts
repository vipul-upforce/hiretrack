import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, {
  WebhookSubscription,
  Candidate,
} from '@/lib/mongodb';

// Webhook token for validation (should be in env vars)
const WEBHOOK_TOKEN =
  process.env.GOOGLE_CALENDAR_WEBHOOK_TOKEN || 'hiretrack-webhook-secret';

export async function POST(req: NextRequest) {
  try {
    // Get headers
    const headers = Object.fromEntries(req.headers.entries());

    // Validate webhook token if provided
    const channelToken = headers['x-goog-channel-token'];
    if (channelToken && channelToken !== WEBHOOK_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get webhook data
    const channelId = headers['x-goog-channel-id'];
    const resourceState = headers['x-goog-resource-state'];

    // Handle sync message (initial webhook confirmation)
    if (resourceState === 'sync') {
      return NextResponse.json({ success: true, message: 'Sync acknowledged' });
    }

    // Only process 'exists' state (which indicates changes)
    if (resourceState !== 'exists') {
      return NextResponse.json({ success: true, message: 'State ignored' });
    }

    await connectToDatabase();

    // Find the webhook subscription
    const subscription = await WebhookSubscription?.findOne({
      channelId,
      active: true,
    });

    if (!subscription) {
      return NextResponse.json({
        success: true,
        message: 'No subscription found',
      });
    }

    // Check if subscription is expired
    if (new Date() > new Date(subscription.expirationTime)) {
      await WebhookSubscription?.findByIdAndUpdate(subscription._id, {
        active: false,
      });
      return NextResponse.json({
        success: true,
        message: 'Subscription expired',
      });
    }

    // Queue sync job for the event
    // In a production environment, you might want to use a job queue here
    // For now, we'll trigger the sync directly (with rate limiting consideration)

    // Check last sync time to avoid too frequent syncs
    const candidate = await Candidate?.findById(subscription.candidateId);
    if (candidate?.assignment?.googleMeet?.lastSyncedAt) {
      const lastSync = new Date(candidate.assignment.googleMeet.lastSyncedAt);
      const timeSinceLastSync = Date.now() - lastSync.getTime();
      const MIN_SYNC_INTERVAL = 10000; // 10 seconds minimum between syncs

      if (timeSinceLastSync < MIN_SYNC_INTERVAL) {
        return NextResponse.json({
          success: true,
          message: 'Sync throttled',
          nextSyncIn: MIN_SYNC_INTERVAL - timeSinceLastSync,
        });
      }
    }
    // For now, we'll just log that a sync is needed
    // The sync can be triggered by a cron job or manual action
    await Candidate?.findByIdAndUpdate(subscription.candidateId, {
      'assignment.googleMeet.syncPending': true,
      'assignment.googleMeet.lastWebhookReceived': new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Webhook processed',
      data: {
        channelId,
        resourceState,
        candidateId: subscription.candidateId,
        syncQueued: true,
      },
    });
  } catch (error) {
    // Return success to avoid webhook retries for processing errors
    return NextResponse.json({
      success: true,
      message: 'Webhook received with error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Handle GET requests for webhook verification
export async function GET() {
  // Google might send a verification request
  return NextResponse.json({
    success: true,
    message: 'Webhook endpoint active',
    timestamp: new Date().toISOString(),
  });
}
