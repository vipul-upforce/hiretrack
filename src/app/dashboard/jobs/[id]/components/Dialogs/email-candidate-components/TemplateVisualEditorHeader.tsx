'use client';

import React from 'react';
import { Edit2, Eye } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface TemplateVisualEditorHeaderProps {
  isEditing: boolean;
  onToggleEditMode: () => void;
}

export function TemplateVisualEditorHeader({
  isEditing,
  onToggleEditMode,
}: TemplateVisualEditorHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
      <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
        {isEditing ? (
          <>
            <Edit2 className="h-4 w-4" />
            <span>Visual Edit Mode - Click on any text to edit</span>
          </>
        ) : (
          <>
            <Eye className="h-4 w-4" />
            <span>Preview Mode</span>
          </>
        )}
      </div>

      <Button
        type="button"
        variant={isEditing ? 'primary' : 'outline'}
        size="sm"
        onClick={onToggleEditMode}
        className="gap-2"
      >
        {isEditing ? (
          <>
            <Eye className="h-4 w-4" />
            Preview
          </>
        ) : (
          <>
            <Edit2 className="h-4 w-4" />
            Edit Template
          </>
        )}
      </Button>
    </div>
  );
}
