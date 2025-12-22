'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { User, X } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { MentionPicker } from '@/components/ui/mention-picker';
import { useMentionPicker } from '@/hooks/useMentionPicker';
import { cn } from '@/lib/utils';

interface MentionUser {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  organizationId: string;
  currentUserRole: string;
  rows?: number;
  isRemarkPrivate?: boolean;
  onSelectedMentionsChange?: (mentions: MentionUser[]) => void;
}

export function MentionTextarea({
  value,
  onChange,
  onKeyDown,
  placeholder = 'Add a remark... (Alt+Enter to submit)',
  className,
  disabled = false,
  organizationId,
  currentUserRole,
  rows = 3,
  isRemarkPrivate = true,
  onSelectedMentionsChange,
}: MentionTextareaProps) {
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [pickerPosition, setPickerPosition] = useState<'bottom' | 'top'>(
    'bottom',
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionPickerRef = useRef<{
    handleKeyDown: (e: React.KeyboardEvent) => void;
  }>(null);
  const {
    selectedMentions,
    addMention,
    removeMention,
    clearMentions,
    insertMentionInText,
  } = useMentionPicker();

  // Don't show mention picker for interviewers
  const shouldShowMentionPicker =
    currentUserRole === 'admin' || currentUserRole === 'hr';

  // Calculate optimal position for mention picker
  const calculatePickerPosition = useCallback(() => {
    if (!textareaRef.current) return 'bottom';

    const textareaRect = textareaRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const pickerHeight = 240; // Approximate height of the picker (max-h-60 = 240px)
    const spaceBelow = viewportHeight - textareaRect.bottom;
    const spaceAbove = textareaRect.top;

    // If there's not enough space below but enough space above, show on top
    if (spaceBelow < pickerHeight && spaceAbove > pickerHeight) {
      return 'top';
    }

    // Default to bottom
    return 'bottom';
  }, []);

  // Handle text change and detect @ mentions
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPosition = e.target.selectionStart || 0;
    const oldValue = value;

    onChange(newValue);

    if (!shouldShowMentionPicker) return;

    // Check if @ was deleted (backspace detection)
    // If the old value had @ and new value doesn't, or if @ was removed, close picker
    const oldTextBeforeCursor = oldValue.substring(0, Math.min(cursorPosition, oldValue.length));
    const newTextBeforeCursor = newValue.substring(0, cursorPosition);
    const hadAt = oldTextBeforeCursor.includes('@');
    const hasAt = newTextBeforeCursor.includes('@');

    // If @ was deleted (had @ but doesn't have it now, or cursor moved back past @)
    if (hadAt && !hasAt) {
      setShowMentionPicker(false);
      setMentionQuery('');
      return;
    }

    // Check if user typed @ or is typing after @
    const textBeforeCursor = newValue.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      // Only show mention picker if there's no space or newline after @
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        const position = calculatePickerPosition();
        setPickerPosition(position);
        setShowMentionPicker(true);
        setMentionQuery(textAfterAt);
        return;
      }
    }

    setShowMentionPicker(false);
  };

  // Handle mention selection
  const handleMentionSelect = (user: MentionUser) => {
    const cursorPosition = textareaRef.current?.selectionStart || 0;
    const result = insertMentionInText(value, user, cursorPosition);
    const { newText, insertionPosition } = result;

    onChange(newText);
    addMention(user);
    setShowMentionPicker(false);
    setMentionQuery('');

    // Focus back to textarea
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        // Position cursor after the inserted mention (at the actual insertion point)
        const newCursorPosition = insertionPosition + `@${user.name} `.length;
        textareaRef.current.setSelectionRange(
          newCursorPosition,
          newCursorPosition,
        );
      }
    }, 0);
  };

  // Handle mention removal
  const handleMentionRemove = (user: MentionUser) => {
    // Remove mention from selected mentions
    removeMention(user._id);

    // Remove only the first occurrence of the mention to avoid removing duplicates incorrectly
    const mentionText = `@${user.name} `;
    const firstIndex = value.indexOf(mentionText);
    if (firstIndex !== -1) {
      const newText = value.slice(0, firstIndex) + value.slice(firstIndex + mentionText.length);
      onChange(newText);
    }
  };

  // Handle key events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionPicker) {
      // Handle mention picker keyboard navigation
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        e.preventDefault();
        // Forward the event to the MentionPicker
        if (mentionPickerRef.current) {
          mentionPickerRef.current.handleKeyDown(e);
        }
        return;
      }

      if (e.key === 'Escape') {
        setShowMentionPicker(false);
        setMentionQuery('');
        return;
      }

      // Close picker on space or newline (user finished typing mention query)
      if (e.key === ' ' || e.key === 'Enter') {
        setShowMentionPicker(false);
        setMentionQuery('');
        // Don't prevent default - allow space/enter to be inserted
      }

      // Close picker on backspace if it would delete the @
      if (e.key === 'Backspace') {
        const cursorPosition = textareaRef.current?.selectionStart || 0;
        const textBeforeCursor = value.substring(0, cursorPosition);
        // If backspace would delete the @, close picker
        if (textBeforeCursor.endsWith('@')) {
          setShowMentionPicker(false);
          setMentionQuery('');
        }
      }
    }

    // Call the original onKeyDown if provided
    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  // Clear mentions when value is cleared and sync with text
  useEffect(() => {
    if (!value.trim()) {
      clearMentions();
      return;
    }

    // Sync selected mentions with actual mentions in text
    // Remove mentions that are no longer in the text
    // Use a ref-like approach to avoid dependency issues
    const currentMentions = selectedMentions;
    const mentionsStillInText = currentMentions.filter((user) => {
      const mentionText = `@${user.name}`;
      // Check if mention exists in text
      return value.includes(mentionText);
    });

    // Only update if there's a mismatch
    if (mentionsStillInText.length < currentMentions.length) {
      // Remove mentions that are no longer in text
      currentMentions.forEach((user) => {
        const mentionText = `@${user.name}`;
        if (!value.includes(mentionText)) {
          removeMention(user._id);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, clearMentions, removeMention]);

  // Notify parent component when selected mentions change
  useEffect(() => {
    if (onSelectedMentionsChange) {
      onSelectedMentionsChange(selectedMentions);
    }
  }, [selectedMentions, onSelectedMentionsChange]);

  // Recalculate position on window resize and scroll
  useEffect(() => {
    const handleResize = () => {
      if (showMentionPicker) {
        const position = calculatePickerPosition();
        setPickerPosition(position);
      }
    };

    const handleScroll = () => {
      if (showMentionPicker) {
        const position = calculatePickerPosition();
        setPickerPosition(position);
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true); // Use capture to catch all scroll events
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [showMentionPicker, calculatePickerPosition]);

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn('resize-none', className)}
        disabled={disabled}
        rows={rows}
      />

      {/* Mention picker overlay */}
      {shouldShowMentionPicker && showMentionPicker && (
        <div
          className={cn(
            'absolute left-0 z-[9999] w-full max-w-sm transition-all duration-200 ease-in-out',
            pickerPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1',
          )}
        >
          <MentionPicker
            ref={mentionPickerRef}
            onMentionSelect={handleMentionSelect}
            onMentionRemove={removeMention}
            selectedMentions={selectedMentions}
            organizationId={organizationId}
            currentUserRole={currentUserRole}
            isOpen={showMentionPicker}
            onClose={() => setShowMentionPicker(false)}
            searchQuery={mentionQuery}
            onSearchQueryChange={setMentionQuery}
            className="w-full"
            position={pickerPosition}
            isRemarkPrivate={isRemarkPrivate}
          />
        </div>
      )}

      {/* Selected mentions display */}
      {shouldShowMentionPicker && selectedMentions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            Mentioned:
          </span>
          {selectedMentions.map((user) => (
            <span
              key={user._id}
              className="bg-primary/10 border-primary/20 hover:bg-primary/15 inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs text-primary transition-colors"
            >
              <User className="h-3 w-3" />@{user.name}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMentionRemove(user);
                }}
                className="hover:bg-primary/20 ml-1 rounded-full p-0.5 transition-colors"
                aria-label={`Remove mention of ${user.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
