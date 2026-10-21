'use client';

import { cn } from '@/lib/utils';
import type { ErrorPageTemplate } from '../constants';

interface TemplateCardProps {
  template: ErrorPageTemplate;
  isSelected: boolean;
  onSelect: (id: ErrorPageTemplate['id']) => void;
}

export function TemplateCard({
  template,
  isSelected,
  onSelect,
}: TemplateCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(template.id)}
      className={cn(
        'flex h-full w-full flex-col gap-3 rounded-xl border p-4 text-left transition',
        isSelected
          ? 'border-primary/60 bg-primary/5 shadow-sm'
          : 'border-border/60 bg-background hover:border-primary/40 hover:bg-muted/40',
      )}
    >
      <div
        className="h-2 w-full rounded-full"
        style={{ background: template.previewTint }}
      />
      <div className="flex-1 space-y-1">
        <h4 className="text-sm font-semibold text-foreground">
          {template.name}
        </h4>
        <p className="text-xs text-muted-foreground">{template.description}</p>
      </div>
      <div className="text-[11px] font-medium text-muted-foreground">
        {isSelected ? 'Selected' : 'Click to preview'}
      </div>
    </button>
  );
}
