import { promises as fsp } from 'fs';
import path from 'path';

/**
 * Replaces `{{key}}` placeholders in a template string using safe split/join.
 * Avoids RegExp injection and handles all occurrences in a single pass per key.
 */
export function substituteTemplateVariables(
  template: string,
  variables: Record<string, string>,
): string {
  let content = template;
  for (const [key, value] of Object.entries(variables)) {
    content = content.split(`{{${key}}}`).join(value);
  }
  return content;
}

/**
 * Loads an HTML template from `public/templates/<templateName>.html`
 * and substitutes the provided variables.
 */
export async function loadTemplate(
  templateName: string,
  variables: Record<string, string>,
): Promise<string> {
  const templatePath = path.join(
    process.cwd(),
    'public',
    'templates',
    `${templateName}.html`,
  );
  const content = await fsp.readFile(templatePath, 'utf-8');
  return substituteTemplateVariables(content, variables);
}

/**
 * Substitutes variables in an in-memory template HTML string.
 */
export const MapTemplate = (
  templateHtml: string,
  variables: Record<string, string>,
): string => substituteTemplateVariables(templateHtml, variables);
