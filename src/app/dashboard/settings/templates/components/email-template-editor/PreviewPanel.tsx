import { Eye, EyeClosed, Mail, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

import { processTemplate } from './utils';

interface PreviewPanelProps {
  selectedTemplateName?: string;
  isDemoEnabled: boolean;
  onTogglePreview: () => void;
  onResetToDefault: () => void;
  subject: string;
  html: string;
  previewData: Record<string, string>;
}

export function PreviewPanel({
  selectedTemplateName,
  isDemoEnabled,
  onTogglePreview,
  onResetToDefault,
  subject,
  html,
  previewData,
}: PreviewPanelProps) {
  return (
    <div className="space-y-4 overflow-hidden">
      <div className="mb-2 flex items-end justify-between text-sm text-muted-foreground">
        <p>
          <strong>Template:</strong> {selectedTemplateName}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={isDemoEnabled ? 'default' : 'outline'}
            size="sm"
            onClick={onTogglePreview}
            className="flex items-center gap-1"
          >
            {!isDemoEnabled ? <EyeClosed /> : <Eye />}
            Preview
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onResetToDefault}
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
              <span>
                {processTemplate({
                  template: subject,
                  data: previewData,
                  isDemoEnabled,
                })}
              </span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <iframe
              srcDoc={processTemplate({
                template: html,
                data: previewData,
                isDemoEnabled,
              })}
              className="h-full w-full border-none"
              title="Email Preview"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
