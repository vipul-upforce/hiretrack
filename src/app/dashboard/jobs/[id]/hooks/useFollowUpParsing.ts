/**
 * Hook for parsing follow-up notes
 * Extracts duplicated follow-up parsing logic from multiple components
 */

import { useMemo } from 'react';
import { isValid } from 'date-fns';
import { Candidate } from '@/types/candidate';
import { followUpSepretorPatternRegex } from '@/lib/constants';

export interface ParsedFollowUp {
  parts: string[];
  completionNote: string | null;
  userNotes: string[];
  date: string | Date | null;
  rawNote: string | null;
}

/**
 * Returns true when a follow-up note string is corrupt / non-user content
 * (e.g. boolean serialization artifacts like "fffffffft").
 */
export function isGarbageFollowUpNote(note: string): boolean {
  const trimmed = note.trim();
  if (!trimmed) return true;
  if (/^[ft]{4,}$/i.test(trimmed)) return true;
  if (/^(false|true)+$/i.test(trimmed)) return true;
  if (/^(\|\|\|)+$/.test(trimmed)) return true;
  return false;
}

/**
 * Coerce API/SSE follow-up note values to a displayable string or null.
 */
export function normalizeFollowUpNote(note: unknown): string | null {
  if (note == null) return null;
  if (typeof note === 'boolean' || typeof note === 'number' || typeof note === 'object') {
    return null;
  }

  const trimmed = String(note).trim();
  if (!trimmed || isGarbageFollowUpNote(trimmed)) return null;
  return trimmed;
}

/**
 * Returns true when follow-up date is a real, parseable date.
 */
export function isValidFollowUpDate(value: unknown): value is string | Date {
  if (value == null || value === false || value === '') return false;
  const date = value instanceof Date ? value : new Date(String(value));
  return isValid(date);
}

/**
 * Parse follow-up note into structured parts
 */
export function parseFollowUpNote(note: unknown): ParsedFollowUp {
  const normalized = normalizeFollowUpNote(note);
  if (!normalized) {
    return {
      parts: [],
      completionNote: null,
      userNotes: [],
      date: null,
      rawNote: null,
    };
  }

  const parts = normalized
    .split(followUpSepretorPatternRegex)
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !isGarbageFollowUpNote(p));

  const completionNote =
    parts.find((p) => p.endsWith('has completed the last step.')) || null;
  const userNotes = parts.filter(
    (p) => !p.endsWith('has completed the last step.'),
  );

  return {
    parts,
    completionNote,
    userNotes,
    date: null,
    rawNote: normalized,
  };
}

/**
 * Hook to parse candidate follow-up data
 */
export function useFollowUpParsing(
  candidate: Candidate | null | undefined,
): ParsedFollowUp {
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
 * Get the most recent user note (for editing / table display)
 */
export function getMostRecentUserNote(parsed: ParsedFollowUp): string {
  return parsed.userNotes.length > 0
    ? parsed.userNotes[parsed.userNotes.length - 1]
    : '';
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
