import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { WebhookSubscription, Candidate } from "@/lib/mongodb";
import crypto from "crypto";

// Webhook token for validation (should be in env vars)
const WEBHOOK_TOKEN = process.env.GOOGLE_CALENDAR_WEBHOOK_TOKEN || "hiretrack-webhook-secret";

export async function POST(req: NextRequest) {
  try {
    console.log("🔔 Google Calendar webhook received");
    
    // Get headers
    const headers = Object.fromEntries(req.headers.entries());
    console.log("📋 Webhook headers:", {
      'x-goog-channel-id': headers['x-goog-channel-id'],
      'x-goog-resource-state': headers['x-goog-resource-state'],
      'x-goog-resource-id': headers['x-goog-resource-id'],
      'x-goog-message-number': headers['x-goog-message-number'],
    });
    
    // Validate webhook token if provided
    const channelToken = headers['x-goog-channel-token'];
    if (channelToken && channelToken !== WEBHOOK_TOKEN) {
      console.error("❌ Invalid webhook token");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get webhook data
    const channelId = headers['x-goog-channel-id'];
    const resourceState = headers['x-goog-resource-state'];
    const resourceId = headers['x-goog-resource-id'];
    
    // Handle sync message (initial webhook confirmation)
    if (resourceState === 'sync') {
      console.log("✅ Webhook sync acknowledged");
      return NextResponse.json({ success: true, message: "Sync acknowledged" });
    }
    
    // Only process 'exists' state (which indicates changes)
    if (resourceState !== 'exists') {
      console.log(`ℹ️ Ignoring resource state: ${resourceState}`);
      return NextResponse.json({ success: true, message: "State ignored" });
    }
    
    await connectToDatabase();
    
    // Find the webhook subscription
    const subscription = await WebhookSubscription.findOne({
      channelId: channelId,
      active: true,
    });
    
    if (!subscription) {
      console.log("⚠️ No active subscription found for channel:", channelId);
      return NextResponse.json({ success: true, message: "No subscription found" });
    }
    
    // Check if subscription is expired
    if (new Date() > new Date(subscription.expirationTime)) {
      console.log("⚠️ Subscription expired for channel:", channelId);
      await WebhookSubscription.findByIdAndUpdate(subscription._id, { active: false });
      return NextResponse.json({ success: true, message: "Subscription expired" });
    }
    
    console.log("📌 Found subscription for candidate:", subscription.candidateId);
    
    // Queue sync job for the event
    // In a production environment, you might want to use a job queue here
    // For now, we'll trigger the sync directly (with rate limiting consideration)
    
    // Check last sync time to avoid too frequent syncs
    const candidate = await Candidate.findById(subscription.candidateId);
    if (candidate?.assignment?.googleMeet?.lastSyncedAt) {
      const lastSync = new Date(candidate.assignment.googleMeet.lastSyncedAt);
      const timeSinceLastSync = Date.now() - lastSync.getTime();
      const MIN_SYNC_INTERVAL = 10000; // 10 seconds minimum between syncs
      
      if (timeSinceLastSync < MIN_SYNC_INTERVAL) {
        console.log("⏳ Skipping sync - too soon since last sync");
        return NextResponse.json({ 
          success: true, 
          message: "Sync throttled",
          nextSyncIn: MIN_SYNC_INTERVAL - timeSinceLastSync 
        });
      }
    }
    
    // Trigger sync via internal API call
    // Note: In production, consider using a job queue instead
    const baseUrl = process.env.BASE_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;
    const syncUrl = `${baseUrl}/api/google-calendar/sync-event`;
    
    // Create a system token for internal API call
    // In production, you might want a more secure internal communication method
    const internalToken = crypto.randomBytes(32).toString('hex');
    
    // Store the sync request (you might want to use Redis or a job queue in production)
    console.log("🔄 Queueing sync for candidate:", subscription.candidateId);
    
    // For now, we'll just log that a sync is needed
    // The sync can be triggered by a cron job or manual action
    await Candidate.findByIdAndUpdate(subscription.candidateId, {
      'assignment.googleMeet.syncPending': true,
      'assignment.googleMeet.lastWebhookReceived': new Date(),
    });
    
    return NextResponse.json({
      success: true,
      message: "Webhook processed",
      data: {
        channelId,
        resourceState,
        candidateId: subscription.candidateId,
        syncQueued: true,
      },
    });
    
  } catch (error) {
    console.error("❌ Webhook processing error:", error);
    
    // Return success to avoid webhook retries for processing errors
    return NextResponse.json({
      success: true,
      message: "Webhook received with error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// Handle GET requests for webhook verification
export async function GET(req: NextRequest) {
  console.log("🔍 Webhook verification request received");
  
  // Google might send a verification request
  return NextResponse.json({
    success: true,
    message: "Webhook endpoint active",
    timestamp: new Date().toISOString(),
  });
}