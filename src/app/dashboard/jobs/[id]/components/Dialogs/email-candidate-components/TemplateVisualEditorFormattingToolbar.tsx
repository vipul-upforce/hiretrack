'use client';

import React from 'react';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Palette,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

import { TEMPLATE_VISUAL_EDITOR_COLOR_OPTIONS } from './templateVisualEditor.constants';

export interface TemplateVisualEditorFormatState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  unorderedList: boolean;
  orderedList: boolean;
}

interface TemplateVisualEditorFormattingToolbarProps {
  formatState: TemplateVisualEditorFormatState;
  selectedColor: string;
  onExecuteCommand: (command: string, value?: string) => void;
  onSelectedColorChange: (color: string) => void;
}

export function TemplateVisualEditorFormattingToolbar({
  formatState,
  selectedColor,
  onExecuteCommand,
  onSelectedColorChange,
}: TemplateVisualEditorFormattingToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 bg-gray-50 p-2 dark:border-gray-800 dark:bg-gray-900/50">
      <Toggle
        size="sm"
        pressed={formatState.bold}
        onPressedChange={() => onExecuteCommand('bold')}
        aria-label="Bold"
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </Toggle>

      <Toggle
        size="sm"
        pressed={formatState.italic}
        onPressedChange={() => onExecuteCommand('italic')}
        aria-label="Italic"
        title="Italic (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </Toggle>

      <Toggle
        size="sm"
        pressed={formatState.underline}
        onPressedChange={() => onExecuteCommand('underline')}
        aria-label="Underline"
        title="Underline (Ctrl+U)"
      >
        <Underline className="h-4 w-4" />
      </Toggle>

      <div className="mx-1 h-6 w-px bg-gray-300 dark:bg-gray-700" />

      <Toggle
        size="sm"
        pressed={formatState.unorderedList}
        onPressedChange={() => onExecuteCommand('insertUnorderedList')}
        aria-label="Bullet List"
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </Toggle>

      <Toggle
        size="sm"
        pressed={formatState.orderedList}
        onPressedChange={() => onExecuteCommand('insertOrderedList')}
        aria-label="Numbered List"
        title="Numbered List"
      >
        <ListOrdered className="h-4 w-4" />
      </Toggle>

      <div className="mx-1 h-6 w-px bg-gray-300 dark:bg-gray-700" />

      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-2"
            title="Text Color"
          >
            <Palette className="h-4 w-4" />
            <div
              className="h-4 w-4 rounded border border-gray-300 dark:border-gray-600"
              style={{ backgroundColor: selectedColor }}
            />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-64 p-3">
          <div className="space-y-2">
            <div className="mb-2 text-sm font-medium">Text Color</div>
            <div className="grid grid-cols-6 gap-2">
              {TEMPLATE_VISUAL_EDITOR_COLOR_OPTIONS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => {
                    onExecuteCommand('foreColor', color.value);
                    onSelectedColorChange(color.value);
                  }}
                  className={cn(
                    'h-8 w-8 rounded border-2 transition-all hover:scale-110',
                    selectedColor === color.value
                      ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800'
                      : 'border-gray-300 dark:border-gray-600',
                  )}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                  aria-label={color.name}
                />
              ))}
            </div>

            <div className="border-t pt-2">
              <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">
                Custom Color
              </label>
              <input
                type="color"
                value={selectedColor}
                onChange={(e) => {
                  const color = e.target.value;
                  onExecuteCommand('foreColor', color);
                  onSelectedColorChange(color);
                }}
                className="h-8 w-full cursor-pointer rounded"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
