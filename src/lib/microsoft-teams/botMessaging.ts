import { decryptText } from '@/lib/encryption';
import { logger } from '@/lib/logger/logger.server';
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

function getBaseMicrosoftTeamsConfig(
  organizationId: string,
  microsoftTeams?: IMicrosoftTeamsConfig,
) {
  console.log('[teams-bot] getBaseMicrosoftTeamsConfig: validating credentials');
  if (
    !microsoftTeams?.tenantId ||
    !microsoftTeams.clientId ||
    !microsoftTeams.clientSecret
  ) {
    throw new Error('Microsoft Teams Azure credentials are not configured');
  }

  if (
    !microsoftTeams.botUsername ||
    !microsoftTeams.botPassword ||
    !microsoftTeams.botUserId
  ) {
    throw new Error('Microsoft Teams bot credentials are not configured');
  }

  return {
    tenantId: microsoftTeams.tenantId,
    clientId: microsoftTeams.clientId,
    clientSecret: decryptText(microsoftTeams.clientSecret, organizationId),
    botUsername: microsoftTeams.botUsername,
    botPassword: decryptText(microsoftTeams.botPassword, organizationId),
    botUserId: microsoftTeams.botUserId,
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

  const data = (await response.json()) as GraphTokenResponse;
  console.log('[teams-bot] requestGraphToken: response', {
    status: response.status,
    ok: response.ok,
    hasAccessToken: !!data.access_token,
  });

  if (!response.ok || !data.access_token) {
    throw new Error(
      data.error_description || data.error || 'Microsoft Graph auth failed',
    );
  }

  return data.access_token;
}

async function getApplicationToken(
  organizationId: string,
  microsoftTeams?: IMicrosoftTeamsConfig,
) {
  console.log('[teams-bot] getApplicationToken: start');
  const config = getBaseMicrosoftTeamsConfig(organizationId, microsoftTeams);

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
  const config = getBaseMicrosoftTeamsConfig(organizationId, microsoftTeams);

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

function formatFollowUpReminderMessage(params: {
  candidateName: string;
  followUpDate: Date;
  note?: string | null;
}) {
  const followUpTime = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(params.followUpDate);

  const noteMarkup = params.note?.trim()
    ? `<br /><b>Note:</b> ${escapeHtml(params.note.trim())}`
    : '';

  const baseUrl = process.env.BASE_URL || process.env.NEXTAUTH_URL || '';
  const openAppMarkup = baseUrl
    ? `<br /><br /><a href="${escapeHtml(baseUrl)}">Open HireTrack</a>`
    : '';

  return [
    '<b>HireTrack Follow-up Reminder</b>',
    `<br /><b>Candidate:</b> ${escapeHtml(params.candidateName)}`,
    `<br /><b>Scheduled for:</b> ${escapeHtml(followUpTime)}`,
    noteMarkup,
    openAppMarkup,
  ].join('');
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
    throw new Error(
      data.error?.message ||
        `Failed to resolve Microsoft Teams user for ${params.email}`,
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
  targetUserId: string;
}) {
  console.log('[teams-bot] createOneOnOneChat: start', {
    targetUserId: params.targetUserId,
  });
  const config = getBaseMicrosoftTeamsConfig(
    params.organizationId,
    params.microsoftTeams,
  );
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
          'user@odata.bind': `https://graph.microsoft.com/v1.0/users('${config.botUserId}')`,
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
    throw new Error(data.error?.message || 'Failed to create Teams chat');
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
    throw new Error(errorText || 'Failed to send Teams chat message');
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
  followUpDate: Date;
  note?: string | null;
}) {
  try {
    console.log('[teams-bot] sendFollowUpReminderToTeams: start', {
      organizationId: params.organizationId,
      recipientEmail: params.recipientEmail,
      candidateName: params.candidateName,
    });
    const graphUser = await resolveGraphUserByEmail({
      organizationId: params.organizationId,
      microsoftTeams: params.microsoftTeams,
      email: params.recipientEmail,
    });

    const { chatId, accessToken } = await createOneOnOneChat({
      organizationId: params.organizationId,
      microsoftTeams: params.microsoftTeams,
      targetUserId: graphUser.id || '',
    });

    await sendChatMessage({
      accessToken,
      chatId,
      message: formatFollowUpReminderMessage({
        candidateName: params.candidateName,
        followUpDate: params.followUpDate,
        note: params.note,
      }),
    });

    console.log('[teams-bot] sendFollowUpReminderToTeams: completed', {
      chatId,
    });

    return { chatId };
  } catch (error) {
    logger.error(
      {
        error,
        organizationId: params.organizationId,
        recipientEmail: params.recipientEmail,
        candidateName: params.candidateName,
      },
      'Failed to send follow-up reminder to Microsoft Teams',
    );
    throw error;
  }
}
