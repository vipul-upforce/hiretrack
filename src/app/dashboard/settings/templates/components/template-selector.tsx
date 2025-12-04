import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmailTemplate } from '../types';

interface TemplateSelectorProps {
  templates: EmailTemplate[];
  selectedTemplate: string;
  onSelectTemplate: (value: string) => void;
  onAddClick: () => void;
  onDeleteClick: (templateId: string) => void;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  templates,
  selectedTemplate,
  onSelectTemplate,
  onAddClick,
  onDeleteClick,
}) => {
  const currentTemplate = templates.find((t) => t.id === selectedTemplate);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Email Templates</h2>
          <p className="text-sm text-muted-foreground">
            Select a template to customize
          </p>
        </div>
        <Button size="sm" onClick={onAddClick} variant="primary">
          <Plus className="h-4 w-4 mr-2" />
          Add Custom
        </Button>
      </div>

      <div className="max-w-md">
        <Label htmlFor="template-select" className="text-sm font-medium">
          Template
        </Label>
        <Select value={selectedTemplate} onValueChange={onSelectTemplate}>
          <SelectTrigger className="h-[60px] mt-2">
            <SelectValue placeholder="Select a template" />
          </SelectTrigger>
          <SelectContent className="max-h-96">
            {templates.map((template) => (
              <SelectItem
                key={template.id}
                value={template.id}
                className="py-3"
              >
                <div className="flex flex-col w-full">
                  <div className="flex items-center gap-2 justify-between">
                    <span className="font-medium">{template.name}</span>
                    <div className="flex gap-1">
                      {template.isDefault && (
                        <Badge variant="outline" className="text-xs">
                          Default
                        </Badge>
                      )}
                      {template.isCustom && (
                        <Badge variant="secondary" className="text-xs">
                          Custom
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    {template.subject}
                  </p>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Delete button for custom templates */}
      {currentTemplate?.isCustom && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDeleteClick(selectedTemplate)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Template
          </Button>
        </div>
      )}
    </div>
  );
};
