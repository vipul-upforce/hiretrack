import connectToDatabase, { Settings, User } from '@/lib/mongodb';
import { logger } from '@/lib/logger/logger.server';
import { sendFollowUpReminderToTeams } from '@/lib/microsoft-teams/botMessaging';
import type { IMicrosoftTeamsConfig } from '@/lib/models/settings';
import { queueReminder } from '@/lib/followups/reminderQueue';

interface ImmediateFollowUpReminderParams {
  organizationId: string;
  candidateName: string;
  candidateId?: string | null;
  jobId?: string | null;
  followUpDate?: Date | string | null;
  followUpNote?: string | null;
  followUpUserId?: string | null;
  source: string;
  deliveryMetadata?: {
    isLate?: boolean;
    lateByMs?: number;
  };
}

export async function sendImmediateFollowUpReminder(
  params: ImmediateFollowUpReminderParams,
) {
  console.log('[followup-reminder] start', {
    source: params.source,
    organizationId: params.organizationId,
    candidateName: params.candidateName,
    followUpUserId: params.followUpUserId,
  });

  if (!params.followUpUserId) {
    console.log('[followup-reminder] skipped: missing followUpUserId');
    return { skipped: true as const, reason: 'missing_followup_user' };
  }
  if (!params.candidateId) {
    console.log('[followup-reminder] skipped: missing candidateId');
    return { skipped: true as const, reason: 'missing_candidate_id' };
  }

  try {
    await connectToDatabase();
    if (!Settings) {
      throw new Error('Settings model is not available');
    }
    const settingsDoc = await Settings.findOne({
      organizationId: params.organizationId,
    })
      .select('microsoftTeams.isFollowUpReminderEnabled')
      .lean();
    const isFollowUpReminderEnabled = Boolean(
      settingsDoc?.microsoftTeams?.isFollowUpReminderEnabled,
    );
    if (!isFollowUpReminderEnabled) {
      console.log(
        '[followup-reminder] skipped: teams follow-up reminder disabled at queue stage',
      );
      return { skipped: true as const, reason: 'teams_reminder_disabled' };
    }

    const queueResult = await queueReminder({
      ...params,
      candidateId: params.candidateId,
    });
    console.log('[followup-reminder] queued successfully', {
      reminderId: queueResult.reminderId,
      scheduledAt: queueResult.scheduledAt.toISOString(),
      offsetMinutesUsed: queueResult.offsetMinutesUsed,
      source: params.source,
    });

    return {
      skipped: false as const,
      queued: true as const,
      reminderId: queueResult.reminderId,
      scheduledAt: queueResult.scheduledAt,
      offsetMinutesUsed: queueResult.offsetMinutesUsed,
    };
  } catch (error) {
    console.log('[followup-reminder] failed', {
      source: params.source,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    logger.error('Failed to send immediate follow-up reminder', {
      error,
      params,
    });
    return { skipped: true as const, reason: 'send_failed' };
  }
}

export async function deliverFollowUpReminderNow(
  params: ImmediateFollowUpReminderParams,
) {
  await connectToDatabase();
  console.log('[followup-reminder] database ready');

  if (!Settings || !User) {
    throw new Error('Database models are not available');
  }

  console.log('[followup-reminder] finding user by id', {
    organizationId: params.organizationId,
    followUpUserId: params.followUpUserId,
  });

  const userDoc = await User.findById(params.followUpUserId).select('email').lean();
  const recipientEmail = userDoc?.email || '';
  console.log('[followup-reminder] resolved recipient email', {
    followUpUserId: params.followUpUserId,
    recipientEmail,
  });

  if (!recipientEmail) {
    throw new Error('Follow-up owner email is missing');
  }

    const settingsDoc = await Settings.findOne({
      organizationId: params.organizationId,
    })
      .select('microsoftTeams')
      .lean();
    const microsoftTeams = settingsDoc?.microsoftTeams as
      | IMicrosoftTeamsConfig
      | undefined;
    console.log('[followup-reminder] loaded teams settings', {
      hasSettings: !!microsoftTeams,
      hasTenantId: !!microsoftTeams?.tenantId,
      hasClientId: !!microsoftTeams?.clientId,
      hasClientSecret: !!microsoftTeams?.clientSecret,
      isFollowUpReminderEnabled: !!microsoftTeams?.isFollowUpReminderEnabled,
      hasBotUsername: !!microsoftTeams?.botUsername,
      hasBotPassword: !!microsoftTeams?.botPassword,
      hasBotUserId: !!microsoftTeams?.botUserId,
    });

    if (!microsoftTeams?.isFollowUpReminderEnabled) {
      console.log('[followup-reminder] skipped: teams follow-up reminder disabled');
      return { skipped: true as const, reason: 'teams_reminder_disabled' };
    }

  const sendResult = await sendFollowUpReminderToTeams({
    organizationId: params.organizationId,
    microsoftTeams,
    recipientEmail,
    candidateName: params.candidateName,
      candidateId: params.candidateId || undefined,
      jobId: params.jobId || undefined,
    followUpDate: params.followUpDate ? new Date(params.followUpDate) : new Date(),
    note: params.followUpNote,
    deliveryMetadata: params.deliveryMetadata,
  });

  console.log('[followup-reminder] sent successfully', {
    recipientEmail,
    chatId: sendResult.chatId,
    source: params.source,
  });

  return { chatId: sendResult.chatId };
}
