import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { FileText, Mail, Plus } from 'lucide-react';

type TemplateVariablesCardProps = {
  templateVariables: readonly string[];
  insertVariableInNewTemplate: (variable: string) => void;
};

function getVariableDescription(variable: string) {
  switch (variable) {
    case 'SenderName':
      return 'Person sending the email';
    case 'ReceiverName':
      return 'Candidate receiving the email';
    case 'PortalName':
      return 'Your organization name';
    default:
      return '';
  }
}

export function TemplateVariablesCard({
  templateVariables,
  insertVariableInNewTemplate,
}: TemplateVariablesCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" />
          Available Variables
        </CardTitle>
        <CardDescription className="text-sm">
          Click to insert at cursor position
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {templateVariables.map((variable) => {
            const description = getVariableDescription(variable);
            return (
              <button
                type="button"
                key={variable}
                className="flex w-full cursor-pointer items-center justify-between rounded-lg bg-muted p-3 text-left transition-colors hover:bg-muted/80"
                onClick={() => insertVariableInNewTemplate(variable)}
              >
                <div className="flex flex-col">
                  <code className="font-mono text-sm font-medium">{`{{${variable}}}`}</code>
                  {description ? (
                    <span className="mt-1 text-xs text-muted-foreground">
                      {description}
                    </span>
                  ) : null}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    insertVariableInNewTemplate(variable);
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function TemplateTipsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Mail className="h-4 w-4" />
          Tips
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <div className="font-medium">Variable Usage</div>
          <div className="mt-1 text-muted-foreground">
            Variables will be automatically replaced when sending emails.
          </div>
        </div>
        <div>
          <div className="font-medium">Styling Guidelines</div>
          <div className="mt-1 text-muted-foreground">
            Use inline CSS styles for maximum email client compatibility.
          </div>
        </div>
        <div>
          <div className="font-medium">Preview</div>
          <div className="mt-1 text-muted-foreground">
            Use the Preview button to see how your template will look to
            recipients.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
