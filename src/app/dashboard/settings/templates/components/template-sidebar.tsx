import React from 'react';
import { FileText, Send } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { EmailTemplate } from '../types';
import { templateVariables } from '../constants';

interface TemplateSidebarProps {
  currentTemplate: EmailTemplate;
}

export const TemplateSidebar: React.FC<TemplateSidebarProps> = ({
  currentTemplate,
}) => {
  const activeVariables = currentTemplate.isCustom
    ? templateVariables
    : currentTemplate.variables;

  const copyToClipboard = (variable: string) => {
    navigator.clipboard.writeText(`{{${variable}}}`);
    toast.success('Variable copied to clipboard');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Available Variables
          </CardTitle>
          <CardDescription>
            Use these variables in your template
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {activeVariables.map((variable) => (
              <div
                key={variable}
                className="flex items-center justify-between p-2 bg-muted rounded text-sm"
              >
                <code className="font-mono">{`{{${variable}}}`}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(variable)}
                  className="h-6 px-2"
                >
                  Copy
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Template Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <div className="font-medium">Template Usage</div>
            <div className="text-muted-foreground mt-1">
              {currentTemplate.isDefault
                ? 'This template is automatically sent when candidates apply for positions.'
                : 'This is a custom template for manual emails to candidates.'}
            </div>
          </div>
          <div>
            <div className="font-medium">Styling Guidelines</div>
            <div className="text-muted-foreground mt-1">
              Use inline CSS styles for maximum email client compatibility.
              Avoid external stylesheets or CSS variables.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
