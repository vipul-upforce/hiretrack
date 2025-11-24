/**
 * Hook for parsing follow-up notes
 * Extracts duplicated follow-up parsing logic from multiple components
 */

import { useMemo } from "react";
import { Candidate } from "@/types/candidate";
import { followUpSepretorPatternRegex } from "@/lib/constants";

export interface ParsedFollowUp {
  parts: string[];
  completionNote: string | null;
  userNotes: string[];
  date: string | Date | null;
  rawNote: string | null;
}

/**
 * Parse follow-up note into structured parts
 */
export function parseFollowUpNote(note: string | undefined | null): ParsedFollowUp {
  if (!note) {
    return {
      parts: [],
      completionNote: null,
      userNotes: [],
      date: null,
      rawNote: null,
    };
  }

  // Split by separator regex
  const parts = note
    .split(followUpSepretorPatternRegex)
    .map((p) => p.trim())
    .filter(Boolean);

  // Separate completion note from user notes
  const completionNote = parts.find((p) => p.endsWith("has completed the last step.")) || null;
  const userNotes = parts.filter((p) => !p.endsWith("has completed the last step."));

  return {
    parts,
    completionNote,
    userNotes,
    date: null,
    rawNote: note,
  };
}

/**
 * Hook to parse candidate follow-up data
 */
export function useFollowUpParsing(candidate: Candidate | null | undefined): ParsedFollowUp {
  return useMemo(() => {
    if (!candidate?.followUp) {
      return {
        parts: [],
        completionNote: null,
        userNotes: [],
        date: null,
        rawNote: null,
      };
    }

    const parsed = parseFollowUpNote(candidate.followUp.note);

    return {
      ...parsed,
      date: candidate.followUp.date || null,
    };
  }, [candidate?.followUp]);
}

/**
 * Get the most recent user note (for editing)
 */
export function getMostRecentUserNote(parsed: ParsedFollowUp): string {
  return parsed.userNotes.length > 0
    ? parsed.userNotes[parsed.userNotes.length - 1]
    : "";
}

/**
 * Get all user notes excluding completion note
 */
export function getUserNotes(parsed: ParsedFollowUp): string[] {
  return parsed.userNotes;
}

/**
 * Check if follow-up has completion note
 */
export function hasCompletionNote(parsed: ParsedFollowUp): boolean {
  return parsed.completionNote !== null;
}

