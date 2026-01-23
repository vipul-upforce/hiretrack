'use client';

import React from 'react';
import { cn } from '@/lib/utils';

import { TemplateVisualEditorHeader } from './TemplateVisualEditorHeader';
import { TemplateVisualEditorFormattingToolbar } from './TemplateVisualEditorFormattingToolbar';
import { useTemplateVisualEditor } from './useTemplateVisualEditor';

interface TemplateVisualEditorProps {
  htmlContent: string;
  onContentChange: (html: string) => void;
  className?: string;
}

/**
 * Visual editor for email templates that allows inline text editing
 * while preserving HTML structure and styling
 */
export function TemplateVisualEditor({
  htmlContent,
  onContentChange,
  className,
}: TemplateVisualEditorProps) {
  const {
    containerRef,
    isEditing,
    isHovering,
    setIsHovering,
    formatState,
    selectedColor,
    setSelectedColor,
    executeCommand,
    toggleEditMode,
    handleInput,
    handlePaste,
    handleClick,
    handleKeyDown,
  } = useTemplateVisualEditor({ htmlContent, onContentChange });

  return (
    <div
      className={cn('relative overflow-hidden rounded-lg border', className)}
    >
      {/* Toolbar */}
      <TemplateVisualEditorHeader
        isEditing={isEditing}
        onToggleEditMode={toggleEditMode}
      />

      {/* Formatting Toolbar - Only visible in edit mode */}
      {isEditing && (
        <TemplateVisualEditorFormattingToolbar
          formatState={formatState}
          selectedColor={selectedColor}
          onExecuteCommand={executeCommand}
          onSelectedColorChange={setSelectedColor}
        />
      )}

      {/* Editable Content Area */}
      <div
        ref={containerRef}
        contentEditable={isEditing}
        role="textbox"
        aria-label="Template visual editor"
        aria-multiline="true"
        tabIndex={isEditing ? 0 : -1}
        suppressContentEditableWarning
        onInput={handleInput}
        onPaste={handlePaste}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className={cn(
          'overflow-y-auto bg-white p-4',
          'prose prose-sm max-w-none',
          isEditing &&
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          isEditing &&
            isHovering &&
            '[&_a]:cursor-text [&_h1]:cursor-text [&_h2]:cursor-text [&_h3]:cursor-text [&_p]:cursor-text [&_span]:cursor-text',
          !isEditing && 'cursor-default',
        )}
        style={{
          minHeight: '300px',
        }}
      />

      {/* Helper Text */}
      {isEditing && (
        <div className="border-t border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          💡 <strong>Tip:</strong> Click on any text element to edit it. HTML
          structure and styling are preserved automatically.
        </div>
      )}
    </div>
  );
}
