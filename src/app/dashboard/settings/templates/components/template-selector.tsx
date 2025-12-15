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

export function TemplateSelector({
  templates,
  selectedTemplate,
  onSelectTemplate,
  onAddClick,
  onDeleteClick,
}: TemplateSelectorProps) {
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
          <Plus className="mr-2 h-4 w-4" />
          Add Custom
        </Button>
      </div>

      <div className="max-w-md">
        <Label htmlFor="template-select" className="text-sm font-medium">
          Template
        </Label>
        <Select value={selectedTemplate} onValueChange={onSelectTemplate}>
          <SelectTrigger className="mt-2 h-[60px]">
            <SelectValue placeholder="Select a template" />
          </SelectTrigger>
          <SelectContent className="max-h-96">
            {templates.map((template) => (
              <SelectItem
                key={template.id}
                value={template.id}
                className="py-3"
              >
                <div className="flex w-full flex-col">
                  <div className="flex items-center justify-between gap-2">
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
                  <p className="mt-1 text-xs leading-relaxed text-gray-500">
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
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Template
          </Button>
        </div>
      )}
    </div>
  );
}
