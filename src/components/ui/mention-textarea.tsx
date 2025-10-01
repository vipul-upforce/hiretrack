"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { User } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { MentionPicker } from "@/components/ui/mention-picker";
import { useMentionPicker } from "@/hooks/useMentionPicker";
import { userCacheService } from "@/lib/services/userCache";
import { cn } from "@/lib/utils";

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
}

export function MentionTextarea({
  value,
  onChange,
  onKeyDown,
  placeholder = "Add a remark... (Alt+Enter to submit)",
  className,
  disabled = false,
  organizationId,
  currentUserRole,
  rows = 3,
}: MentionTextareaProps) {
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionPosition, setMentionPosition] = useState(0);
  const [mentionQuery, setMentionQuery] = useState("");
  const [pickerPosition, setPickerPosition] = useState<"bottom" | "top">(
    "bottom"
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
    currentUserRole === "admin" || currentUserRole === "hr";

  // Calculate optimal position for mention picker
  const calculatePickerPosition = useCallback(() => {
    if (!textareaRef.current) return "bottom";

    const textareaRect = textareaRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const pickerHeight = 240; // Approximate height of the picker (max-h-60 = 240px)
    const spaceBelow = viewportHeight - textareaRect.bottom;
    const spaceAbove = textareaRect.top;

    // If there's not enough space below but enough space above, show on top
    if (spaceBelow < pickerHeight && spaceAbove > pickerHeight) {
      return "top";
    }

    // Default to bottom
    return "bottom";
  }, []);

  // Handle text change and detect @ mentions
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPosition = e.target.selectionStart || 0;

    onChange(newValue);

    if (!shouldShowMentionPicker) return;

    // Check if user typed @
    const textBeforeCursor = newValue.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      // Only show mention picker if there's no space after @
      if (!textAfterAt.includes(" ") && !textAfterAt.includes("\n")) {
        const position = calculatePickerPosition();
        setPickerPosition(position);
        setShowMentionPicker(true);
        setMentionPosition(lastAtIndex);
        setMentionQuery(textAfterAt);
        return;
      }
    }

    setShowMentionPicker(false);
  };

  // Handle mention selection
  const handleMentionSelect = (user: MentionUser) => {
    const cursorPosition = textareaRef.current?.selectionStart || 0;
    const newText = insertMentionInText(value, user, cursorPosition);

    onChange(newText);
    addMention(user);
    setShowMentionPicker(false);
    setMentionQuery("");

    // Focus back to textarea
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        // Position cursor after the mention
        const newCursorPosition =
          newText.indexOf(`@${user.name} `) + `@${user.name} `.length;
        textareaRef.current.setSelectionRange(
          newCursorPosition,
          newCursorPosition
        );
      }
    }, 0);
  };

  // Handle key events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionPicker) {
      // Handle mention picker keyboard navigation
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter") {
        e.preventDefault();
        // Forward the event to the MentionPicker
        if (mentionPickerRef.current) {
          mentionPickerRef.current.handleKeyDown(e);
        }
        return;
      }

      if (e.key === "Escape") {
        setShowMentionPicker(false);
        setMentionQuery("");
        return;
      }
    }

    // Call the original onKeyDown if provided
    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  // Clear mentions when value is cleared
  useEffect(() => {
    if (!value.trim()) {
      clearMentions();
    }
  }, [value, clearMentions]);

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

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true); // Use capture to catch all scroll events
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
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
        className={cn("resize-none", className)}
        disabled={disabled}
        rows={rows}
      />

      {/* Mention picker overlay */}
      {shouldShowMentionPicker && showMentionPicker && (
        <div
          className={cn(
            "absolute left-0 z-[9999] w-full max-w-sm transition-all duration-200 ease-in-out",
            pickerPosition === "top" ? "bottom-full mb-1" : "top-full mt-1"
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
          />
        </div>
      )}

      {/* Selected mentions display */}
      {shouldShowMentionPicker && selectedMentions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground font-medium">
            Mentioned:
          </span>
          {selectedMentions.map((user) => (
            <span
              key={user._id}
              className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full border border-primary/20 hover:bg-primary/15 transition-colors"
            >
              <User className="h-3 w-3" />@{user.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
