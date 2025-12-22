import type { IEmailTemplatesConfig } from '@/app/dashboard/settings/components/types';
import { defaultTemplatesAsObject as defaultTemplates } from '@/app/dashboard/settings/templates/constants';
import { extractVariablesFromContent } from '../../email-template-editor/utils';

interface VariableAnalysis {
  used: string[];
  unused: string[];
  invalid: string[];
}

export function analyzeVariables(
  values: IEmailTemplatesConfig,
  selectedTemplate: string,
): VariableAnalysis {
  const currentTemplate = values.templates[selectedTemplate];
  if (!currentTemplate) return { used: [], unused: [], invalid: [] };

  const availableVariables =
    defaultTemplates[selectedTemplate]?.variables || [];
  const subjectContent = currentTemplate.subject || '';
  const htmlContent = currentTemplate.html || '';
  const allContent = `${subjectContent} ${htmlContent}`;

  const usedVariables = extractVariablesFromContent(allContent);

  const used = availableVariables.filter((variable: string) =>
    usedVariables.includes(variable),
  );
  const unused = availableVariables.filter(
    (variable: string) => !usedVariables.includes(variable),
  );
  const invalid = usedVariables.filter(
    (variable) => !availableVariables.includes(variable),
  );

  return { used, unused, invalid };
}
