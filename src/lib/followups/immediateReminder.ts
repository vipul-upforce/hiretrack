import connectToDatabase, { Settings, User } from '@/lib/mongodb';
import { logger } from '@/lib/logger/logger.server';
import { sendFollowUpReminderToTeams } from '@/lib/microsoft-teams/botMessaging';
import type { IMicrosoftTeamsConfig } from '@/lib/models/settings';

interface ImmediateFollowUpReminderParams {
  organizationId: string;
  candidateName: string;
  followUpDate?: Date | string | null;
  followUpNote?: string | null;
  followUpUserId?: string | null;
  source: string;
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

  try {
    await connectToDatabase();
    console.log('[followup-reminder] database ready');

    if (!Settings || !User) {
      console.log('[followup-reminder] skipped: missing database models');
      return { skipped: true as const, reason: 'missing_models' };
    }

    console.log('[followup-reminder] finding user by id', {
      organizationId: params.organizationId,
      followUpUserId: params.followUpUserId,
    });
    
    const userDoc = await User.findById(params.followUpUserId)
      .select('email')
      .lean();
    const recipientEmail = userDoc?.email || '';
    console.log('[followup-reminder] resolved recipient email', {
      followUpUserId: params.followUpUserId,
      recipientEmail,
    });

    if (!recipientEmail) {
      console.log('[followup-reminder] skipped: no recipient email');
      return { skipped: true as const, reason: 'missing_recipient_email' };
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
      hasBotUsername: !!microsoftTeams?.botUsername,
      hasBotPassword: !!microsoftTeams?.botPassword,
      hasBotUserId: !!microsoftTeams?.botUserId,
    });

    const sendResult = await sendFollowUpReminderToTeams({
      organizationId: params.organizationId,
      microsoftTeams,
      recipientEmail,
      candidateName: params.candidateName,
      followUpDate: params.followUpDate ? new Date(params.followUpDate) : new Date(),
      note: params.followUpNote,
    });

    console.log('[followup-reminder] sent successfully', {
      recipientEmail,
      chatId: sendResult.chatId,
      source: params.source,
    });

    return { skipped: false as const, chatId: sendResult.chatId };
  } catch (error) {
    console.log('[followup-reminder] failed', {
      source: params.source,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    logger.error(
      { error, params },
      'Failed to send immediate follow-up reminder',
    );
    return { skipped: true as const, reason: 'send_failed' };
  }
}
