import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SectionProps } from './types';
import { GeneralSettingsSection } from './sections/general-settings';
import { EnhancedFeaturesSection } from './sections/enhanced-features';
import { PromptSettingsSection } from './sections/prompt-settings';

export function EvaluationSettingsContent(props: SectionProps) {
  return (
    <div className="flex-1 space-y-6 overflow-y-auto px-6 py-4">
      <GeneralSettingsSection {...props} />

      <EnhancedFeaturesSection {...props} />

      <PromptSettingsSection {...props} />

      {/* Warning Alert */}
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="pt-2 text-xs">
          Changes will only apply to new evaluations. Existing candidate scores
          will not be affected. Manual re-evaluation will use these new
          settings.
        </AlertDescription>
      </Alert>
    </div>
  );
}
