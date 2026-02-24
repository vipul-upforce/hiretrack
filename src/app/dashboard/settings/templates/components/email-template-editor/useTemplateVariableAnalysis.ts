import { useMemo } from 'react';

import type { IEmailTemplate } from '@/app/dashboard/settings/components/types';

import { extractVariablesFromContent } from './utils';

export interface TemplateVariableAnalysis {
  used: string[];
  unused: string[];
  invalid: string[];
}

export function useTemplateVariableAnalysis(args: {
  template: IEmailTemplate | undefined;
  availableVariables: string[];
}): TemplateVariableAnalysis {
  return useMemo(() => {
    if (!args.template) return { used: [], unused: [], invalid: [] };

    const subjectContent = args.template.subject || '';
    const htmlContent = args.template.html || '';
    const allContent = `${subjectContent} ${htmlContent}`;

    const usedVariables = extractVariablesFromContent(allContent);

    const used = args.availableVariables.filter((variable) =>
      usedVariables.includes(variable),
    );
    const unused = args.availableVariables.filter(
      (variable) => !usedVariables.includes(variable),
    );
    const invalid = usedVariables.filter(
      (variable) => !args.availableVariables.includes(variable),
    );

    return { used, unused, invalid };
  }, [args.availableVariables, args.template]);
}
