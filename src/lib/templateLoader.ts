import fs from 'fs';
import path from 'path';

export function loadTemplate(
  templateName: string,
  variables: Record<string, string>,
) {
  const templatePath = path.join(
    process.cwd(),
    'public',
    'templates',
    `${templateName}.html`,
  );

  // console.log("########## PATH: ", templatePath);
  let content = fs.readFileSync(templatePath, 'utf-8');
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    content = content?.replace(regex, value);
  }

  return content;
}

export const MapTemplate = (
  templateHtml: string,
  variables: Record<string, string>,
) => {
  let content = templateHtml;

  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    content = content?.replace(regex, value);
  }

  return content;
};
