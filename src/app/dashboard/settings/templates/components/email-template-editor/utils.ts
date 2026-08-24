import type {
  IEmailTemplatesConfig,
  IEmailTemplate,
} from '@/app/dashboard/settings/components/types';

export type TemplateMap = IEmailTemplatesConfig['templates'];

export function mergeTemplatesWithDefaults(args: {
  defaults: TemplateMap;
  existing?: Partial<IEmailTemplatesConfig> | null;
}): TemplateMap {
  const existingTemplates = args.existing?.templates ?? {};

  const merged: TemplateMap = { ...args.defaults };
  (Object.keys(args.defaults) as Array<keyof TemplateMap>).forEach((key) => {
    const existingTemplate = existingTemplates[key as string];
    if (existingTemplate) {
      merged[key as string] = existingTemplate as IEmailTemplate;
    }
  });

  return merged;
}

/**
 * Replaces `{{key}}` placeholders in a template string using safe split/join.
 * Suitable for both previewing (frontend) and applying real values.
 */
export function substituteTemplateVariables(
  template: string,
  data: Record<string, string>,
): string {
  let processed = template;
  for (const [key, value] of Object.entries(data)) {
    processed = processed.split(`{{${key}}}`).join(value);
  }
  return processed;
}

export function processTemplate(args: {
  template: string;
  data: Record<string, string>;
  isDemoEnabled: boolean;
}): string {
  if (!args.isDemoEnabled) return args.template;
  return substituteTemplateVariables(args.template, args.data);
}

export function extractVariablesFromContent(content: string): string[] {
  const variableRegex = /\{\{([^}]+)\}\}/g;
  const matches: string[] = [];

  let match = variableRegex.exec(content);
  while (match) {
    const variableName = match[1]?.trim();
    if (variableName) {
      matches.push(variableName);
    }
    match = variableRegex.exec(content);
  }

  return [...new Set(matches)];
}
