'use client';

import { useState, useCallback } from 'react';

interface MentionUser {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface InsertMentionResult {
  newText: string;
  insertionPosition: number;
}

interface UseMentionPickerReturn {
  selectedMentions: MentionUser[];
  addMention: (user: MentionUser) => void;
  removeMention: (userId: string) => void;
  clearMentions: () => void;
  getMentionText: () => string;
  insertMentionInText: (
    text: string,
    user: MentionUser,
    cursorPosition: number
  ) => InsertMentionResult;
}

export function useMentionPicker(): UseMentionPickerReturn {
  const [selectedMentions, setSelectedMentions] = useState<MentionUser[]>([]);

  const addMention = useCallback((user: MentionUser) => {
    setSelectedMentions((prev) => {
      // Check if user is already selected
      const isAlreadySelected = prev.some(
        (mention) => mention._id === user._id,
      );
      if (isAlreadySelected) {
        return prev;
      }
      return [...prev, user];
    });
  }, []);

  const removeMention = useCallback((userId: string) => {
    setSelectedMentions((prev) => prev.filter((mention) => mention._id !== userId));
  }, []);

  const clearMentions = useCallback(() => {
    setSelectedMentions([]);
  }, []);

  const getMentionText = useCallback(() => selectedMentions.map((user) => `@${user.name}`).join(' '), [selectedMentions]);

  const insertMentionInText = useCallback(
    (text: string, user: MentionUser, cursorPosition: number): InsertMentionResult => {
      const beforeCursor = text.substring(0, cursorPosition);
      const afterCursor = text.substring(cursorPosition);

      // Find the last @ before cursor
      const lastAtIndex = beforeCursor.lastIndexOf('@');

      if (lastAtIndex !== -1) {
        const textBeforeAt = beforeCursor.substring(0, lastAtIndex);
        const mentionText = `@${user.name} `;
        const newText = textBeforeAt + mentionText + afterCursor;
        // Return the position where the mention was inserted
        return {
          newText,
          insertionPosition: textBeforeAt.length,
        };
      }

      // If no @ found, just append the mention at cursor position
      const newText = `${beforeCursor}@${user.name} ${afterCursor}`;
      return {
        newText,
        insertionPosition: beforeCursor.length,
      };
    },
    [],
  );

  return {
    selectedMentions,
    addMention,
    removeMention,
    clearMentions,
    getMentionText,
    insertMentionInText,
  };
}
