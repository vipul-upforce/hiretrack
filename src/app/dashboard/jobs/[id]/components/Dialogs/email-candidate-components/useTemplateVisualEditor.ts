'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

import type { TemplateVisualEditorFormatState } from './TemplateVisualEditorFormattingToolbar';

interface UseTemplateVisualEditorParams {
  htmlContent: string;
  onContentChange: (html: string) => void;
}

interface UseTemplateVisualEditorResult {
  containerRef: React.RefObject<HTMLDivElement | null>;
  isEditing: boolean;
  isHovering: boolean;
  setIsHovering: React.Dispatch<React.SetStateAction<boolean>>;
  formatState: TemplateVisualEditorFormatState;
  selectedColor: string;
  setSelectedColor: React.Dispatch<React.SetStateAction<string>>;
  executeCommand: (command: string, value?: string) => void;
  toggleEditMode: () => void;
  handleInput: (e: React.FormEvent<HTMLDivElement>) => void;
  handlePaste: (e: React.ClipboardEvent<HTMLDivElement>) => void;
  handleClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
}

function rgbStringToHex(color: string): string | null {
  if (!color.startsWith('rgb')) return null;
  const rgb = color.match(/\d+/g);
  if (!rgb || rgb.length < 3) return null;

  const r = Number.parseInt(rgb[0], 10).toString(16).padStart(2, '0');
  const g = Number.parseInt(rgb[1], 10).toString(16).padStart(2, '0');
  const b = Number.parseInt(rgb[2], 10).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

function isEditableTagName(tagName: string): boolean {
  return (
    tagName === 'P' ||
    tagName === 'SPAN' ||
    tagName === 'H1' ||
    tagName === 'H2' ||
    tagName === 'H3' ||
    tagName === 'H4' ||
    tagName === 'H5' ||
    tagName === 'H6' ||
    tagName === 'LI' ||
    tagName === 'A' ||
    tagName === 'STRONG' ||
    tagName === 'EM' ||
    tagName === 'DIV'
  );
}

/**
 * Encapsulates the editing/formatting behavior for TemplateVisualEditor.
 *
 * Keeps the component file small while preserving identical behavior.
 */
export function useTemplateVisualEditor({
  htmlContent,
  onContentChange,
}: UseTemplateVisualEditorParams): UseTemplateVisualEditorResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(htmlContent);
  const [isHovering, setIsHovering] = useState(false);
  const [formatState, setFormatState] =
    useState<TemplateVisualEditorFormatState>({
      bold: false,
      italic: false,
      underline: false,
      unorderedList: false,
      orderedList: false,
    });
  const [selectedColor, setSelectedColor] = useState<string>('#000000');

  const checkFormatState = useCallback(() => {
    if (!containerRef.current || !isEditing) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    try {
      setFormatState({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        unorderedList: document.queryCommandState('insertUnorderedList'),
        orderedList: document.queryCommandState('insertOrderedList'),
      });

      let color = document.queryCommandValue('foreColor');
      if (!color || color === 'rgb(0, 0, 0)' || color === '#000000') {
        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;
        const element =
          container.nodeType === Node.TEXT_NODE
            ? container.parentElement
            : (container as HTMLElement);

        if (element) {
          const computedStyle = window.getComputedStyle(element);
          color = computedStyle.color;
          const hex = rgbStringToHex(color);
          if (hex) color = hex;
        }
      }

      if (color) setSelectedColor(color);
    } catch (_e) {
      // Ignore errors when checking format state
    }
  }, [isEditing]);

  useEffect(() => {
    if (containerRef.current) {
      const currentContent = containerRef.current.innerHTML;
      const contentChanged = currentContent !== htmlContent;

      const hasExternalUpdateWhileEditing =
        isEditing && contentChanged && htmlContent !== editedContent;

      if (hasExternalUpdateWhileEditing) {
        setIsEditing(false);
        setEditedContent(htmlContent);
        containerRef.current.innerHTML = htmlContent;
      } else if (!isEditing && contentChanged) {
        setEditedContent(htmlContent);
        containerRef.current.innerHTML = htmlContent;
      } else if (!isEditing && !containerRef.current.innerHTML) {
        setEditedContent(htmlContent);
        containerRef.current.innerHTML = htmlContent;
      }
    } else if (!isEditing) {
      setEditedContent(htmlContent);
    }
  }, [editedContent, htmlContent, isEditing]);

  useEffect(() => {
    if (!isEditing) return;

    const handleSelectionChange = () => {
      checkFormatState();
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    // eslint-disable-next-line
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [isEditing, checkFormatState]);

  const executeCommand = useCallback(
    (command: string, value?: string) => {
      if (!containerRef.current || !isEditing) return;

      containerRef.current.focus();
      document.execCommand(command, false, value);
      checkFormatState();

      const event = new Event('input', { bubbles: true });
      containerRef.current.dispatchEvent(event);
    },
    [isEditing, checkFormatState],
  );

  const handleInput = useCallback(
    (e: React.FormEvent<HTMLDivElement>) => {
      const newContent = e.currentTarget.innerHTML;
      setEditedContent(newContent);
      onContentChange(newContent);
      checkFormatState();
    },
    [onContentChange, checkFormatState],
  );

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);

      if (containerRef.current) {
        const event = new Event('input', { bubbles: true });
        containerRef.current.dispatchEvent(event);
      }
    }
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isEditing) return;

      const target = e.target as HTMLElement;
      if (isEditableTagName(target.tagName)) {
        target.focus();
        setTimeout(() => checkFormatState(), 10);
      }
    },
    [isEditing, checkFormatState],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!isEditing) return;

      const target = e.target as HTMLElement;

      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'b':
            e.preventDefault();
            executeCommand('bold');
            return;
          case 'i':
            e.preventDefault();
            executeCommand('italic');
            return;
          case 'u':
            e.preventDefault();
            executeCommand('underline');
            return;
          default:
            break;
        }
      }

      if (
        (e.key === 'Backspace' || e.key === 'Delete') &&
        (target.tagName === 'DIV' || target.tagName === 'TABLE')
      ) {
        if (target.textContent?.trim() === '') {
          e.preventDefault();
        }
      }
    },
    [isEditing, executeCommand],
  );

  useEffect(() => {
    if (containerRef.current && !containerRef.current.innerHTML) {
      containerRef.current.innerHTML = editedContent;
    }
  }, [editedContent]);

  const toggleEditMode = useCallback(() => {
    const newEditState = !isEditing;
    setIsEditing(newEditState);

    if (newEditState && containerRef.current) {
      containerRef.current.innerHTML = editedContent;
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.focus();
          checkFormatState();
        }
      }, 100);
    } else if (!newEditState && containerRef.current) {
      const currentHtml = containerRef.current.innerHTML;
      setEditedContent(currentHtml);
      onContentChange(currentHtml);
    }
  }, [checkFormatState, editedContent, isEditing, onContentChange]);

  return {
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
  };
}
