import { formatDateForOrganization } from '@/components/timezoneFormat/getFormattedTZ';
import { decryptText } from '@/lib/encryption';
import { logger } from '@/lib/logger/logger.server';
import {
  renderTeamsReminderTemplate,
  type TeamsReminderTemplateEventType,
} from '@/lib/microsoft-teams/reminderTemplates';
import type { IMicrosoftTeamsConfig } from '@/lib/models/settings';

interface GraphTokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface GraphUserResponse {
  id?: string;
  displayName?: string;
  userPrincipalName?: string;
}

interface GraphChatResponse {
  id?: string;
}

function formatGraphErrorPayload(payload: unknown): string {
  if (!payload) {
    return '';
  }

  if (typeof payload === 'string') {
    return payload;
  }

  if (typeof payload === 'object') {
    const parsed = payload as {
      error?: unknown;
      error_description?: unknown;
      message?: unknown;
    };

    const candidates = [
      parsed.error_description,
      parsed.message,
      typeof parsed.error === 'object' && parsed.error !== null
        ? (parsed.error as { message?: unknown }).message
        : parsed.error,
    ];

    const match = candidates.find(
      (value) => typeof value === 'string' && value.trim().length > 0,
    );

    if (typeof match === 'string') {
      return match;
    }
  }

  return '';
}

function getAzureAppConfig(
  organizationId: string,
  microsoftTeams?: IMicrosoftTeamsConfig,
) {
  console.log('[teams-bot] getAzureAppConfig: validating credentials');
  if (
    !microsoftTeams?.tenantId ||
    !microsoftTeams.clientId ||
    !microsoftTeams.clientSecret
  ) {
    throw new Error('Microsoft Teams Azure credentials are not configured');
  }

  return {
    tenantId: microsoftTeams.tenantId,
    clientId: microsoftTeams.clientId,
    clientSecret: decryptText(microsoftTeams.clientSecret, organizationId),
  };
}

function getBotCredentialsConfig(
  organizationId: string,
  microsoftTeams?: IMicrosoftTeamsConfig,
) {
  console.log('[teams-bot] getBotCredentialsConfig: validating credentials');
  const azureAppConfig = getAzureAppConfig(organizationId, microsoftTeams);

  if (!microsoftTeams?.botUsername || !microsoftTeams.botPassword) {
    throw new Error('Microsoft Teams bot credentials are not configured');
  }

  return {
    ...azureAppConfig,
    botUsername: microsoftTeams.botUsername,
    botPassword: decryptText(microsoftTeams.botPassword, organizationId),
  };
}

async function requestGraphToken(params: URLSearchParams) {
  const tenantId = params.get('tenant_id');
  console.log('[teams-bot] requestGraphToken: start', {
    grantType: params.get('grant_type'),
    hasTenantId: !!tenantId,
  });
  if (!tenantId) {
    throw new Error('Tenant ID is required for Microsoft Graph token request');
  }

  params.delete('tenant_id');

  const response = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    },
  );

  const rawBody = await response.text();
  let data: GraphTokenResponse = {};
  try {
    data = rawBody ? (JSON.parse(rawBody) as GraphTokenResponse) : {};
  } catch {
    data = {};
  }
  console.log('[teams-bot] requestGraphToken: response', {
    status: response.status,
    ok: response.ok,
    hasAccessToken: !!data.access_token,
    error: data.error || null,
  });

  if (!response.ok || !data.access_token) {
    const errorDetails =
      formatGraphErrorPayload(data) || rawBody || 'Microsoft Graph auth failed';
    throw new Error(
      `Microsoft Graph auth failed (status=${response.status}, grantType=${params.get('grant_type') || 'unknown'}, details=${errorDetails})`,
    );
  }

  return data.access_token;
}

async function getApplicationToken(
  organizationId: string,
  microsoftTeams?: IMicrosoftTeamsConfig,
) {
  console.log('[teams-bot] getApplicationToken: start');
  const config = getAzureAppConfig(organizationId, microsoftTeams);

  return requestGraphToken(
    new URLSearchParams({
      tenant_id: config.tenantId,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }),
  );
}

async function getBotUserToken(
  organizationId: string,
  microsoftTeams?: IMicrosoftTeamsConfig,
) {
  console.log('[teams-bot] getBotUserToken: start');
  const config = getBotCredentialsConfig(organizationId, microsoftTeams);

  return requestGraphToken(
    new URLSearchParams({
      tenant_id: config.tenantId,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      username: config.botUsername,
      password: config.botPassword,
      scope: 'https://graph.microsoft.com/.default offline_access',
      grant_type: 'password',
    }),
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// Renders a free-text note for the Teams bot message body. URLs are turned
// into clickable anchor tags; all other text is HTML-escaped. The template
// treats `noteHtml` as raw HTML, so the output is consumed verbatim.
//
// Legacy compatibility: a small number of older reminders persisted the
// entire Outlook calendar HTML body as the note. We deliberately do NOT
// try to parse that markup into prose. Instead, if the note contains HTML
// tags, we drop the markup entirely and surface only the first http(s) URL
// (typically the Teams join link) as a clickable anchor. Everything else
// in the HTML blob is ignored.
const URL_PATTERN = /\bhttps?:\/\/[^\s<>"']+/g;
const HTML_TAG_PROBE = /<[a-z!\/][\s\S]*?>/i;

function escapeHtmlAndLinkify(value: string) {
  const raw = (value ?? '').trim();
  if (!raw) {
    return '';
  }

  if (HTML_TAG_PROBE.test(raw)) {
    const match = raw.match(URL_PATTERN);
    if (!match) {
      return '';
    }
    const safeHref = escapeHtml(match[0]);
    return `<a href="${safeHref}">${safeHref}</a>`;
  }

  let cursor = 0;
  let output = '';
  for (const match of raw.matchAll(URL_PATTERN)) {
    const start = match.index ?? 0;
    output += escapeHtml(raw.slice(cursor, start));
    const safeHref = escapeHtml(match[0]);
    output += `<a href="${safeHref}">${safeHref}</a>`;
    cursor = start + match[0].length;
  }
  output += escapeHtml(raw.slice(cursor));
  return output;
}

function formatFollowUpReminderMessage(params: {
  candidateName: string;
  followUpTimeLabel: string;
  note?: string | null;
  deliveryMetadata?: {
    isLate?: boolean;
    lateByMs?: number;
  };
  candidateId?: string;
  jobId?: string;
}) {
  const noteBody = escapeHtmlAndLinkify(params.note ?? '');
  const noteMarkup = noteBody ? `<br /><b>Note:</b> ${noteBody}` : '';

  const baseUrl =
    process.env.BASE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    '';
  const candidateDetailsPath =
    params.candidateId && params.jobId
      ? `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`
      : params.candidateId
        ? `/candidate/${params.candidateId}`
        : '/dashboard';
  const openAppUrl = baseUrl ? `${baseUrl}${candidateDetailsPath}` : '';
  const openAppMarkup = openAppUrl
    ? `<br /><br /><a href="${escapeHtml(openAppUrl)}">Open Candidate Details</a>`
    : '';
  const isLateDelivery = !!params.deliveryMetadata?.isLate;
  const lateByMinutes = params.deliveryMetadata?.lateByMs
    ? Math.max(1, Math.round(params.deliveryMetadata.lateByMs / 60000))
    : 0;
  const lateNoticeMarkup = isLateDelivery
    ? `<br /><b>Delayed delivery:</b> This reminder was due earlier and is being delivered now (${escapeHtml(String(lateByMinutes))} minute(s) late).`
    : '';

  return [
    '<b>HireTrack Reminder</b>',
    `<br /><b>Candidate:</b> ${escapeHtml(params.candidateName)}`,
    `<br /><b>Scheduled for:</b> ${escapeHtml(params.followUpTimeLabel)}`,
    lateNoticeMarkup,
    noteMarkup,
    openAppMarkup,
  ].join('');
}

function buildReminderMessage(params: {
  eventType: TeamsReminderTemplateEventType;
  rawTemplates?: unknown;
  candidateName: string;
  followUpTimeLabel: string;
  note?: string | null;
  deliveryMetadata?: {
    isLate?: boolean;
    lateByMs?: number;
  };
  candidateId?: string;
  jobId?: string;
}) {
  const noteBody = escapeHtmlAndLinkify(params.note ?? '');
  const noteMarkup = noteBody ? `<br /><b>Note:</b> ${noteBody}` : '';

  const baseUrl =
    process.env.BASE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    '';
  const candidateDetailsPath =
    params.candidateId && params.jobId
      ? `/dashboard/jobs/${params.jobId}?candidateId=${params.candidateId}`
      : params.candidateId
        ? `/candidate/${params.candidateId}`
        : '/dashboard';
  const openAppUrl = baseUrl ? `${baseUrl}${candidateDetailsPath}` : '';
  const openAppMarkup = openAppUrl
    ? `<br /><br /><a href="${escapeHtml(openAppUrl)}">Open Candidate Details</a>`
    : '';
  const isLateDelivery = !!params.deliveryMetadata?.isLate;
  const lateByMinutes = params.deliveryMetadata?.lateByMs
    ? Math.max(1, Math.round(params.deliveryMetadata.lateByMs / 60000))
    : 0;
  const lateNoticeMarkup = isLateDelivery
    ? `<br /><b>Delayed delivery:</b> This reminder was due earlier and is being delivered now (${escapeHtml(String(lateByMinutes))} minute(s) late).`
    : '';

  try {
    return renderTeamsReminderTemplate({
      rawTemplates: params.rawTemplates,
      eventType: params.eventType,
      variables: {
        candidateName: params.candidateName,
        followUpTimeLabel: params.followUpTimeLabel,
        noteHtml: noteMarkup,
        lateNoticeHtml: lateNoticeMarkup,
        openAppHtml: openAppMarkup,
        openAppUrl,
      },
    });
  } catch (error) {
    logger.warn('Failed to render Teams reminder template; using fallback', {
      error: error instanceof Error ? error.message : String(error),
      eventType: params.eventType,
    });
    return formatFollowUpReminderMessage({
      candidateName: params.candidateName,
      followUpTimeLabel: params.followUpTimeLabel,
      note: params.note,
      deliveryMetadata: params.deliveryMetadata,
      candidateId: params.candidateId,
      jobId: params.jobId,
    });
  }
}

async function resolveGraphUserByEmail(params: {
  organizationId: string;
  microsoftTeams?: IMicrosoftTeamsConfig;
  email: string;
}) {
  console.log('[teams-bot] resolveGraphUserByEmail: start', {
    email: params.email,
  });
  const accessToken = await getApplicationToken(
    params.organizationId,
    params.microsoftTeams,
  );
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(params.email)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    },
  );

  const data = (await response.json()) as GraphUserResponse & {
    error?: { message?: string };
  };

  if (!response.ok || !data.id) {
    const errorDetails = data.error?.message || 'Unknown Graph users lookup error';
    throw new Error(
      `Failed to resolve Microsoft Teams user for ${params.email} (status=${response.status}, details=${errorDetails})`,
    );
  }

  console.log('[teams-bot] resolveGraphUserByEmail: success', {
    id: data.id,
    userPrincipalName: data.userPrincipalName,
  });

  return data;
}

async function createOneOnOneChat(params: {
  organizationId: string;
  microsoftTeams?: IMicrosoftTeamsConfig;
  botUserId: string;
  targetUserId: string;
}) {
  console.log('[teams-bot] createOneOnOneChat: start', {
    targetUserId: params.targetUserId,
  });
  getAzureAppConfig(params.organizationId, params.microsoftTeams);
  const accessToken = await getBotUserToken(
    params.organizationId,
    params.microsoftTeams,
  );

  const response = await fetch('https://graph.microsoft.com/v1.0/chats', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chatType: 'oneOnOne',
      members: [
        {
          '@odata.type': '#microsoft.graph.aadUserConversationMember',
          roles: ['owner'],
          'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${params.botUserId}')`,
        },
        {
          '@odata.type': '#microsoft.graph.aadUserConversationMember',
          roles: ['owner'],
          'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${params.targetUserId}')`,
        },
      ],
    }),
  });

  const data = (await response.json()) as GraphChatResponse & {
    error?: { message?: string };
  };

  if (!response.ok || !data.id) {
    const errorDetails = data.error?.message || 'Unknown Graph chats error';
    throw new Error(
      `Failed to create Teams chat (status=${response.status}, details=${errorDetails})`,
    );
  }

  console.log('[teams-bot] createOneOnOneChat: success', {
    chatId: data.id,
  });

  return {
    chatId: data.id,
    accessToken,
  };
}

async function sendChatMessage(params: {
  accessToken: string;
  chatId: string;
  message: string;
}) {
  console.log('[teams-bot] sendChatMessage: start', {
    chatId: params.chatId,
  });
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/chats/${encodeURIComponent(params.chatId)}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        body: {
          contentType: 'html',
          content: params.message,
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to send Teams chat message (status=${response.status}, details=${errorText || 'Unknown Graph message send error'})`,
    );
  }
  console.log('[teams-bot] sendChatMessage: success', {
    chatId: params.chatId,
    status: response.status,
  });
}

export async function sendFollowUpReminderToTeams(params: {
  organizationId: string;
  microsoftTeams?: IMicrosoftTeamsConfig;
  recipientEmail: string;
  candidateName: string;
  candidateId?: string;
  jobId?: string;
  followUpDate: Date;
  note?: string | null;
  templateEventType?: TeamsReminderTemplateEventType;
  deliveryMetadata?: {
    isLate?: boolean;
    lateByMs?: number;
  };
}) {
  try {
    console.log('[teams-bot] sendFollowUpReminderToTeams: start', {
      organizationId: params.organizationId,
      recipientEmail: params.recipientEmail,
      candidateName: params.candidateName,
    });
    if (!params.microsoftTeams?.isFollowUpReminderEnabled) {
      throw new Error('Microsoft Teams follow-up reminders are disabled');
    }

    const botUsername = params.microsoftTeams?.botUsername || '';
    if (!botUsername) {
      throw new Error('Microsoft Teams bot email is not configured');
    }

    const graphUser = await resolveGraphUserByEmail({
      organizationId: params.organizationId,
      microsoftTeams: params.microsoftTeams,
      email: params.recipientEmail,
    });
    const botUser = await resolveGraphUserByEmail({
      organizationId: params.organizationId,
      microsoftTeams: params.microsoftTeams,
      email: botUsername,
    });

    const { chatId, accessToken } = await createOneOnOneChat({
      organizationId: params.organizationId,
      microsoftTeams: params.microsoftTeams,
      botUserId: botUser.id || '',
      targetUserId: graphUser.id || '',
    });
    const followUpTimeRaw = await formatDateForOrganization(
      params.followUpDate,
      params.organizationId,
    );
    const followUpTimeLabel =
      typeof followUpTimeRaw === 'string'
        ? followUpTimeRaw
        : params.followUpDate.toISOString();

    await sendChatMessage({
      accessToken,
      chatId,
      message: buildReminderMessage({
        eventType: params.templateEventType || 'followup.reminder',
        rawTemplates: params.microsoftTeams?.messageTemplates,
        candidateName: params.candidateName,
        candidateId: params.candidateId,
        jobId: params.jobId,
        followUpTimeLabel,
        note: params.note,
        deliveryMetadata: params.deliveryMetadata,
      }),
    });

    console.log('[teams-bot] sendFollowUpReminderToTeams: completed', {
      chatId,
    });

    return { chatId };
  } catch (error) {
    logger.error('Failed to send follow-up reminder to Microsoft Teams', {
      error,
      organizationId: params.organizationId,
      recipientEmail: params.recipientEmail,
      candidateName: params.candidateName,
    });
    throw error;
  }
}

export interface TeamsReminderDeliveryTestResult {
  success: boolean;
  steps: {
    resolveRecipient: { ok: boolean; userId?: string; error?: string };
    resolveBot: { ok: boolean; userId?: string; error?: string };
    getBotUserToken: { ok: boolean; error?: string };
    createChat: { ok: boolean; chatId?: string; error?: string };
    sendMessage: { ok: boolean; error?: string };
  };
}

export async function testFollowUpReminderDelivery(params: {
  organizationId: string;
  microsoftTeams?: IMicrosoftTeamsConfig;
  recipientEmail: string;
  candidateName: string;
  followUpDate?: Date;
  note?: string;
  shouldSendMessage?: boolean;
}): Promise<TeamsReminderDeliveryTestResult> {
  const result: TeamsReminderDeliveryTestResult = {
    success: false,
    steps: {
      resolveRecipient: { ok: false },
      resolveBot: { ok: false },
      getBotUserToken: { ok: false },
      createChat: { ok: false },
      sendMessage: { ok: false },
    },
  };

  const botUsername = params.microsoftTeams?.botUsername || '';
  if (!botUsername) {
    result.steps.resolveBot = {
      ok: false,
      error: 'Microsoft Teams bot email is not configured',
    };
    return result;
  }

  let recipientUserId = '';
  try {
    const recipient = await resolveGraphUserByEmail({
      organizationId: params.organizationId,
      microsoftTeams: params.microsoftTeams,
      email: params.recipientEmail,
    });
    recipientUserId = recipient.id || '';
    result.steps.resolveRecipient = {
      ok: !!recipientUserId,
      userId: recipientUserId || undefined,
      ...(recipientUserId ? {} : { error: 'Recipient user id missing' }),
    };
  } catch (error) {
    result.steps.resolveRecipient = {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown recipient lookup error',
    };
    return result;
  }

  let botUserId = '';
  try {
    const botUser = await resolveGraphUserByEmail({
      organizationId: params.organizationId,
      microsoftTeams: params.microsoftTeams,
      email: botUsername,
    });
    botUserId = botUser.id || '';
    result.steps.resolveBot = {
      ok: !!botUserId,
      userId: botUserId || undefined,
      ...(botUserId ? {} : { error: 'Bot user id missing' }),
    };
  } catch (error) {
    result.steps.resolveBot = {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown bot lookup error',
    };
    return result;
  }

  let botAccessToken = '';
  try {
    botAccessToken = await getBotUserToken(
      params.organizationId,
      params.microsoftTeams,
    );
    result.steps.getBotUserToken = { ok: true };
  } catch (error) {
    result.steps.getBotUserToken = {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown bot token error',
    };
    return result;
  }

  let chatId = '';
  try {
    const chat = await createOneOnOneChat({
      organizationId: params.organizationId,
      microsoftTeams: params.microsoftTeams,
      botUserId,
      targetUserId: recipientUserId,
    });
    chatId = chat.chatId;
    result.steps.createChat = { ok: !!chatId, chatId: chatId || undefined };
  } catch (error) {
    result.steps.createChat = {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown chat creation error',
    };
    return result;
  }

  if (!params.shouldSendMessage) {
    result.steps.sendMessage = { ok: true };
    result.success = true;
    return result;
  }

  try {
    const reminderDate = params.followUpDate || new Date();
    const followUpTimeRaw = await formatDateForOrganization(
      reminderDate,
      params.organizationId,
    );
    const followUpTimeLabel =
      typeof followUpTimeRaw === 'string'
        ? followUpTimeRaw
        : reminderDate.toISOString();

    await sendChatMessage({
      accessToken: botAccessToken,
      chatId,
      message: buildReminderMessage({
        eventType: 'followup.reminder',
        rawTemplates: params.microsoftTeams?.messageTemplates,
        candidateName: params.candidateName,
        followUpTimeLabel,
        note: params.note || 'Diagnostic reminder delivery test message.',
      }),
    });
    result.steps.sendMessage = { ok: true };
    result.success = true;
    return result;
  } catch (error) {
    result.steps.sendMessage = {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown message send error',
    };
    return result;
  }
}
