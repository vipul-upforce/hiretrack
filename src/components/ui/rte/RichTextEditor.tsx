'use client';

import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useEditor, EditorContent, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Color from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import FontFamily from '@tiptap/extension-font-family';
import Highlight from '@tiptap/extension-highlight';
import './rteStyles.css';

import {
  Bold,
  Italic,
  UnderlineIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  Palette,
  Type,
  Highlighter,
} from 'lucide-react';
import { colorOptions, fontFamilies, highlightColors } from '@/lib/rteUtils';
import { Toggle } from '../toggle';
import { Button } from '../button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '../popover';

interface RichTextEditorProps {
  value: string;
  onChange: (data: string) => void;
  onBlur?: (data: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
  maxLength?: number;
  id?: string;
  name?: string;
  error?: string;
  touched?: boolean;
}

function RichTextEditor({
  value,
  onChange,
  onBlur,
  placeholder = 'Write something...',
  readOnly = false,
  className = '',
  maxLength,
  id,
  name,
  error,
  ...props
}: RichTextEditorProps) {
  const [currentFont, setCurrentFont] = useState('Default');
  const [isFocused, setIsFocused] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        paragraph: {
          HTMLAttributes: {
            class: 'my-paragraph',
          },
        },
        hardBreak: {
          keepMarks: false,
          HTMLAttributes: {
            class: 'hard-break',
          },
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
      }),
      Image,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TextStyle,
      Color,
      FontFamily,
      Highlight.configure({
        multicolor: true,
      }),

      Extension.create({
        name: 'customEnterKeymap',
        addKeyboardShortcuts() {
          return {
            'Shift-Enter': ({ editor: editor2 }) =>
              editor2.commands.setHardBreak(),
          };
        },
      }),
    ],
    content: value,
    editable: !readOnly,
    onUpdate: ({ editor: editor2 }) => {
      const text = editor2.getText();
      if (maxLength && text.length > maxLength) {
        return;
      }
      const html = editor2.getHTML();
      onChange(html);
    },
    onFocus: () => {
      setIsFocused(true);
    },
    onBlur: ({ editor: editor2 }) => {
      setIsFocused(false);
      const html = editor2.getHTML();
      if (onBlur) {
        onBlur(html);
      }
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm sm:prose dark:prose-invert focus:outline-none min-h-[150px] max-w-none p-4',
        placeholder,
      },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [editor, value]);

  const setFontFamily = useCallback(
    (fontFamily: string, fontName: string) => {
      if (!editor) return;
      editor.chain().focus().setFontFamily(fontFamily).run();
      setCurrentFont(fontName);
    },
    [editor],
  );

  const setColor = useCallback(
    (color: string) => {
      if (!editor) return;
      editor.chain().focus().setColor(color).run();
    },
    [editor],
  );

  const setHighlight = useCallback(
    (color: string) => {
      if (!editor) return;
      editor.chain().focus().toggleHighlight({ color }).run();
    },
    [editor],
  );

  if (!editor) {
    return <div className="h-64 w-full animate-pulse rounded-md bg-muted" />;
  }

  const borderColor = isFocused ? 'border-primary' : 'border-input';

  return (
    <div className={`rounded-md border ${borderColor} ${className}`}>
      {!readOnly && (
        <div className="flex flex-wrap gap-1 border-b p-1">
          <Toggle
            size="sm"
            pressed={editor.isActive('bold')}
            onPressedChange={() => editor.chain().focus().toggleBold().run()}
            aria-label="Bold"
          >
            <Bold className="h-4 w-4" />
          </Toggle>

          <Toggle
            size="sm"
            pressed={editor.isActive('italic')}
            onPressedChange={() => editor.chain().focus().toggleItalic().run()}
            aria-label="Italic"
          >
            <Italic className="h-4 w-4" />
          </Toggle>

          <Toggle
            size="sm"
            pressed={editor.isActive('underline')}
            onPressedChange={() =>
              editor.chain().focus().toggleUnderline().run()
            }
            aria-label="Underline"
          >
            <UnderlineIcon className="h-4 w-4" />
          </Toggle>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1">
                <Type className="h-4 w-4" />
                <span className="hidden text-xs sm:inline">{currentFont}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {fontFamilies.map((font) => (
                <DropdownMenuItem
                  key={font.value}
                  onClick={() => setFontFamily(font.value, font.name)}
                  className={
                    editor.isActive('textStyle', { fontFamily: font.value })
                      ? 'bg-accent'
                      : ''
                  }
                >
                  <span style={{ fontFamily: font.value }}>{font.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" aria-label="Text Color">
                <Palette className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2">
              <div className="grid grid-cols-4 gap-1">
                {colorOptions.map((color) => (
                  <Button
                    key={color.value}
                    variant="ghost"
                    className="h-8 w-8 rounded-md p-0"
                    style={{ backgroundColor: color.value }}
                    onClick={() => setColor(color.value)}
                    title={color.name}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" aria-label="Highlight">
                <Highlighter className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2">
              <div className="grid grid-cols-4 gap-1">
                {highlightColors.map((color) => (
                  <Button
                    key={color.value}
                    variant="ghost"
                    className="h-8 w-8 rounded-md p-0"
                    style={{ backgroundColor: color.value }}
                    onClick={() => setHighlight(color.value)}
                    title={color.name}
                  />
                ))}
                <Button
                  variant="ghost"
                  className="h-8 w-8 rounded-md border border-dashed p-0"
                  onClick={() => editor.chain().focus().unsetHighlight().run()}
                  title="Remove highlight"
                >
                  ✕
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Toggle
            size="sm"
            pressed={editor.isActive('bulletList')}
            onPressedChange={() =>
              editor.chain().focus().toggleBulletList().run()
            }
            aria-label="Bullet List"
          >
            <List className="h-4 w-4" />
          </Toggle>

          <Toggle
            size="sm"
            pressed={editor.isActive('orderedList')}
            onPressedChange={() =>
              editor.chain().focus().toggleOrderedList().run()
            }
            aria-label="Ordered List"
          >
            <ListOrdered className="h-4 w-4" />
          </Toggle>

          <Toggle
            size="sm"
            pressed={editor.isActive({ textAlign: 'left' })}
            onPressedChange={() =>
              editor.chain().focus().setTextAlign('left').run()
            }
            aria-label="Align Left"
          >
            <AlignLeft className="h-4 w-4" />
          </Toggle>

          <Toggle
            size="sm"
            pressed={editor.isActive({ textAlign: 'center' })}
            onPressedChange={() =>
              editor.chain().focus().setTextAlign('center').run()
            }
            aria-label="Align Center"
          >
            <AlignCenter className="h-4 w-4" />
          </Toggle>

          <Toggle
            size="sm"
            pressed={editor.isActive({ textAlign: 'right' })}
            onPressedChange={() =>
              editor.chain().focus().setTextAlign('right').run()
            }
            aria-label="Align Right"
          >
            <AlignRight className="h-4 w-4" />
          </Toggle>

          <div className="ml-auto flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              aria-label="Undo"
            >
              <Undo className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              aria-label="Redo"
            >
              <Redo className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {!readOnly && maxLength && (
        <p
          className={`mx-1 mt-1 text-right text-sm ${
            editor?.getText().length >= maxLength
              ? 'text-red-500'
              : 'text-gray-400'
          }`}
        >
          {editor?.getText().length || 0} /{maxLength}
        </p>
      )}

      <EditorContent
        {...props}
        editor={editor}
        className={className}
        id={id}
        placeholder={placeholder}
        name={name}
      />

      {error && <p className="ml-1 mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}

export default RichTextEditor;
