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

export function processTemplate(args: {
  template: string;
  data: Record<string, string>;
  isDemoEnabled: boolean;
}): string {
  if (!args.isDemoEnabled) return args.template;

  let processed = args.template;
  Object.entries(args.data).forEach(([key, value]) => {
    // Avoid RegExp injection and keep a simple global replacement
    processed = processed.split(`{{${key}}}`).join(value);
  });

  return processed;
}

export function extractVariablesFromContent(content: string): string[] {
  const variableRegex = /\{\{([^}]+)\}\}/g;
  const matches: string[] = [];

  let match = variableRegex.exec(content);
  while (match) {
    matches.push(match[1]?.trim());
    match = variableRegex.exec(content);
  }

  return [...new Set(matches)];
}
