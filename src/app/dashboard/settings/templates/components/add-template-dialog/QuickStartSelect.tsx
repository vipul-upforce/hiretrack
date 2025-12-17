import React from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SampleTemplate, TemplateDraft } from './types';

type QuickStartSelectProps = {
  sampleTemplates: SampleTemplate[];
  setNewTemplate: React.Dispatch<React.SetStateAction<TemplateDraft>>;
};

export function QuickStartSelect({
  sampleTemplates,
  setNewTemplate,
}: QuickStartSelectProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Quick Start</Label>
      <Select
        value=""
        onValueChange={(value) => {
          const sampleTemplate = sampleTemplates.find((t) => t.name === value);
          if (!sampleTemplate) return;
          setNewTemplate({
            name: sampleTemplate.name,
            subject: sampleTemplate.subject,
            content: sampleTemplate.content,
          });
        }}
      >
        <SelectTrigger className="h-10">
          <SelectValue placeholder="Choose from sample templates or start from scratch" />
        </SelectTrigger>
        <SelectContent className="max-h-96">
          {sampleTemplates.map((sample) => (
            <SelectItem key={sample.name} value={sample.name} className="py-3">
              <div className="flex w-full flex-col">
                <span className="font-medium">{sample.name}</span>
                <p className="mt-1 text-xs text-gray-500">{sample.subject}</p>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Select a pre-made template to customize, or continue with a blank
        template below.
      </p>
    </div>
  );
}
