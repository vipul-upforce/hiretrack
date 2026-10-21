export type TeamsReminderTemplateEventType =
  | 'followup.reminder'
  | 'assignment.reminder';

type TeamsReminderTemplateStorageKey =
  | 'followup_reminder'
  | 'assignment_reminder';

const STORAGE_KEY_BY_EVENT_TYPE: Record<
  TeamsReminderTemplateEventType,
  TeamsReminderTemplateStorageKey
> = {
  'followup.reminder': 'followup_reminder',
  'assignment.reminder': 'assignment_reminder',
};

const EVENT_TYPE_BY_STORAGE_KEY: Record<
  TeamsReminderTemplateStorageKey,
  TeamsReminderTemplateEventType
> = {
  followup_reminder: 'followup.reminder',
  assignment_reminder: 'assignment.reminder',
};

export interface TeamsReminderTemplate {
  templateId: string;
  templateName: string;
  eventType: TeamsReminderTemplateEventType;
  content: string;
  variables: string[];
  isActive: boolean;
}

type TeamsReminderTemplateMap = Record<
  TeamsReminderTemplateEventType,
  TeamsReminderTemplate
>;

export const DEFAULT_TEAMS_REMINDER_TEMPLATES: TeamsReminderTemplateMap = {
  'followup.reminder': {
    templateId: 'teams-followup-reminder-default',
    templateName: 'Follow-up Reminder',
    eventType: 'followup.reminder',
    content:
      '<b>HireTrack Reminder</b><br /><b>Candidate:</b> {{candidateName}}<br /><b>Scheduled for:</b> {{followUpTimeLabel}}{{lateNoticeHtml}}{{noteHtml}}{{openAppHtml}}',
    variables: [
      'candidateName',
      'followUpTimeLabel',
      'lateNoticeHtml',
      'noteHtml',
      'openAppHtml',
    ],
    isActive: true,
  },
  'assignment.reminder': {
    templateId: 'teams-assignment-reminder-default',
    templateName: 'Assignment Reminder',
    eventType: 'assignment.reminder',
    content:
      '<b>HireTrack Assignment Reminder</b><br /><b>Candidate:</b> {{candidateName}}<br /><b>Scheduled for:</b> {{followUpTimeLabel}}{{lateNoticeHtml}}{{noteHtml}}{{openAppHtml}}',
    variables: [
      'candidateName',
      'followUpTimeLabel',
      'lateNoticeHtml',
      'noteHtml',
      'openAppHtml',
    ],
    isActive: true,
  },
};

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function isTemplateEventType(value: string): value is TeamsReminderTemplateEventType {
  return value === 'followup.reminder' || value === 'assignment.reminder';
}

function isTemplateStorageKey(value: string): value is TeamsReminderTemplateStorageKey {
  return value === 'followup_reminder' || value === 'assignment_reminder';
}

function sanitizeTemplateCandidate(
  eventType: TeamsReminderTemplateEventType,
  candidate: unknown,
) {
  if (!candidate || typeof candidate !== 'object') {
    return DEFAULT_TEAMS_REMINDER_TEMPLATES[eventType];
  }

  const parsed = candidate as Partial<TeamsReminderTemplate>;
  if (
    typeof parsed.templateId !== 'string' ||
    typeof parsed.templateName !== 'string' ||
    typeof parsed.content !== 'string'
  ) {
    return DEFAULT_TEAMS_REMINDER_TEMPLATES[eventType];
  }

  const variables = Array.isArray(parsed.variables)
    ? parsed.variables.filter((entry): entry is string => typeof entry === 'string')
    : DEFAULT_TEAMS_REMINDER_TEMPLATES[eventType].variables;

  return {
    templateId: parsed.templateId,
    templateName: parsed.templateName,
    eventType,
    content: parsed.content,
    variables,
    isActive: parsed.isActive !== false,
  } as TeamsReminderTemplate;
}

export function normalizeTeamsReminderTemplates(
  rawTemplates: unknown,
): TeamsReminderTemplateMap {
  if (!rawTemplates || typeof rawTemplates !== 'object') {
    return DEFAULT_TEAMS_REMINDER_TEMPLATES;
  }

  const output: TeamsReminderTemplateMap = {
    ...DEFAULT_TEAMS_REMINDER_TEMPLATES,
  };
  const entries = Object.entries(rawTemplates as Record<string, unknown>);

  for (const [key, value] of entries) {
    const resolvedEventType = isTemplateEventType(key)
      ? key
      : isTemplateStorageKey(key)
        ? EVENT_TYPE_BY_STORAGE_KEY[key]
        : null;
    if (!resolvedEventType) {
      continue;
    }
    output[resolvedEventType] = sanitizeTemplateCandidate(resolvedEventType, value);
  }

  return output;
}

export function toTeamsReminderTemplateStorageMap(rawTemplates: unknown) {
  const normalized = normalizeTeamsReminderTemplates(rawTemplates);
  return Object.fromEntries(
    (
      Object.entries(normalized) as Array<
        [TeamsReminderTemplateEventType, TeamsReminderTemplate]
      >
    ).map(([eventType, template]) => [STORAGE_KEY_BY_EVENT_TYPE[eventType], template]),
  );
}

export function renderTeamsReminderTemplate(params: {
  rawTemplates?: unknown;
  eventType: TeamsReminderTemplateEventType;
  variables: Record<string, string | number | null | undefined>;
}) {
  const templates = normalizeTeamsReminderTemplates(params.rawTemplates);
  const selected = templates[params.eventType] || templates['followup.reminder'];
  const templateContent = selected?.content || '';

  return templateContent.replaceAll(/\{\{(\w+)\}\}/g, (_fullMatch, variableName) => {
    const key = String(variableName || '');
    const value = params.variables[key];
    const normalized = value === null || value === undefined ? '' : String(value);
    const isRawHtmlVariable = key.toLowerCase().endsWith('html');

    return isRawHtmlVariable ? normalized : escapeHtml(normalized);
  });
}
