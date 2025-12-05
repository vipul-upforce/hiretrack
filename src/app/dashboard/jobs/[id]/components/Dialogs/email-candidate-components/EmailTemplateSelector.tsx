import React from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Mail, FileText } from 'lucide-react';
import { EmailTemplate } from './types';

interface EmailTemplateSelectorProps {
  templates: EmailTemplate[];
  selectedTemplate: string;
  onTemplateSelect: (templateId: string) => void;
  userName: string;
  candidateName: string;
  organizationName: string;
  contentMode: 'rich' | 'html';
}

export const EmailTemplateSelector: React.FC<EmailTemplateSelectorProps> = ({
  templates,
  selectedTemplate,
  onTemplateSelect,
  userName,
  candidateName,
  organizationName,
  contentMode,
}) => {
  if (templates.length === 0) return null;

  return (
    <div className="space-y-2">
      <Label>Email Template</Label>
      <div className="flex items-center gap-2">
        <Select value={selectedTemplate} onValueChange={onTemplateSelect}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Choose a template or start from scratch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Start from scratch
              </div>
            </SelectItem>
            {templates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {template.name}
                  </div>
                  {template.isCustom && (
                    <Badge variant="secondary" className="ml-2">
                      Custom
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {selectedTemplate !== 'none' && (
        <div className="text-xs text-muted-foreground">
          Variables will be automatically replaced: SenderName →
          {' '}
          {userName}
          ,
          ReceiverName →
          {' '}
          {candidateName}
          , PortalName →
          {' '}
          {organizationName}
        </div>
      )}
      {selectedTemplate === 'none' && contentMode === 'html' && (
        <div className="text-xs text-muted-foreground">
          💡 Tip: Use "Preview & Edit" mode to see how your email will look
          while writing, or stay in "Advanced HTML" mode for full control
        </div>
      )}
      {contentMode === 'rich' && selectedTemplate === 'none' && (
        <div className="text-xs text-muted-foreground">
          💡 Use the formatting toolbar to style your text - bold, italic, lists,
          and more. No HTML knowledge needed!
        </div>
      )}
      {contentMode === 'rich' && selectedTemplate !== 'none' && (
        <div className="text-xs text-muted-foreground">
          💡 You're using a pre-designed template. To customize the content,
          switch to "Advanced HTML" mode.
        </div>
      )}
    </div>
  );
};
