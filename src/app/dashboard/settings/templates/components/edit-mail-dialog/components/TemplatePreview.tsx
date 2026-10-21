import { Mail, Eye, EyeClosed, RotateCcw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { IEmailTemplatesConfig } from '@/app/dashboard/settings/components/types';
import { Data } from '@/app/dashboard/settings/templates/constants';
import { processTemplate } from '../../email-template-editor/utils';

interface TemplatePreviewProps {
  selectedTemplate: string;
  templateName: string;
  values: IEmailTemplatesConfig;
  isDemoEnabled: boolean;
  onToggleDemo: () => void;
  onReset: () => void;
}

export function TemplatePreview({
  selectedTemplate,
  templateName,
  values,
  isDemoEnabled,
  onToggleDemo,
  onReset,
}: TemplatePreviewProps) {
  const subject = values.templates[selectedTemplate]?.subject || '';
  const html = values.templates[selectedTemplate]?.html || '';

  const processedSubject = processTemplate({
    template: subject,
    data: Data,
    isDemoEnabled,
  });

  const processedHtml = processTemplate({
    template: html,
    data: Data,
    isDemoEnabled,
  });

  return (
    <div className="space-y-4 overflow-hidden">
      <div className="mb-2 flex items-end justify-between text-sm text-muted-foreground">
        <p>
          <strong>Template:</strong> {templateName}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={isDemoEnabled ? 'default' : 'outline'}
            size="sm"
            onClick={onToggleDemo}
            className="flex items-center gap-1"
          >
            {!isDemoEnabled ? <EyeClosed /> : <Eye />}
            Preview
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onReset}
            className="flex items-center gap-1"
          >
            <RotateCcw className="h-3 w-3" />
            Reset to Default
          </Button>
        </div>
      </div>

      <Card className="h-[calc(100%-60px)] overflow-hidden">
        <CardContent className="flex h-full flex-col p-0">
          <div className="border-b bg-gray-100 p-4">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4" />
              <span className="font-medium">Subject:</span>
              <span>{processedSubject}</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <iframe
              srcDoc={processedHtml}
              className="h-full w-full border-none"
              title="Email Preview"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
