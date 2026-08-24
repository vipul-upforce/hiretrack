/**
 * Utility for parsing @mentions from text content
 * Supports flexible name matching patterns:
 * - @FirstName
 * - @FirstName LastName
 * - @FirstNameLastName
 */

import logger from '../logger';

export interface MentionPattern {
  fullMatch: string; // The complete matched text (e.g., "@Aneri Shah")
  cleanMatch: string; // The match without @ (e.g., "Aneri Shah")
  firstName: string; // First name extracted
  lastName?: string; // Last name if present
  patterns: string[]; // All variations to match against
}

/**
 * Generate all possible search patterns for a mention
 * This helps match against different user name formats
 */
function generateSearchPatterns(
  firstName: string,
  lastName?: string,
): string[] {
  const patterns: string[] = [];

  if (!firstName) return patterns;

  // Always include the first name alone
  patterns.push(firstName.toLowerCase());

  if (lastName) {
    // Include full name with space
    patterns.push(`${firstName} ${lastName}`.toLowerCase());
    // Include concatenated name
    patterns.push(`${firstName}${lastName}`.toLowerCase());
    // Include last name alone (for partial matches)
    patterns.push(lastName.toLowerCase());
  }

  return [...new Set(patterns)]; // Remove duplicates
}

/**
 * Extract all @mention patterns from text
 * Case-insensitive matching
 */
export function extractMentions(text: string): MentionPattern[] {
  try {
    if (!text || typeof text !== 'string') {
      return [];
    }

    // Regex to match @mentions with flexible name patterns
    // Matches: @word, @word word, @wordword, @word-word, etc.
    const mentionRegex =
      /@([a-zA-Z][a-zA-Z0-9\-_]*(?:\s+[a-zA-Z][a-zA-Z0-9\-_]*)*)/gi;

    const mentions: MentionPattern[] = [];

    for (
      let match = mentionRegex.exec(text);
      match !== null;
      match = mentionRegex.exec(text)
    ) {
      const fullMatch = match[0]; // e.g., "@Aneri Shah"
      const cleanMatch = match[1]; // e.g., "Aneri Shah"

      const nameParts = cleanMatch.trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName =
        nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined;

      // Generate search patterns
      const patterns = generateSearchPatterns(firstName, lastName);

      const mention = {
        fullMatch,
        cleanMatch,
        firstName,
        lastName,
        patterns,
      };

      mentions.push(mention);
    }

    // Remove duplicates based on cleanMatch (case-insensitive)
    const deduplicatedMentions = mentions.filter(
      (mention, index, array) =>
        array.findIndex(
          (m) =>
            m.cleanMatch.toLowerCase() === mention.cleanMatch.toLowerCase(),
        ) === index,
    );

    return deduplicatedMentions;
  } catch (error) {
    logger.error('❌ Error extracting mentions:', error);
    return [];
  }
}

/**
 * Check if a user's name matches any of the mention patterns
 */
export function matchesUserName(
  userFirstName: string,
  userLastName: string | undefined,
  mentionPatterns: string[],
): boolean {
  try {
    if (
      !userFirstName ||
      typeof userFirstName !== 'string' ||
      !mentionPatterns ||
      !Array.isArray(mentionPatterns) ||
      mentionPatterns.length === 0
    ) {
      return false;
    }

    const userFirstNameLower = userFirstName.toLowerCase().trim();
    const userLastNameLower = userLastName?.toLowerCase().trim();
    const userFullNameLower = userLastNameLower
      ? `${userFirstNameLower} ${userLastNameLower}`
      : userFirstNameLower;
    const userConcatenatedNameLower = userLastNameLower
      ? `${userFirstNameLower}${userLastNameLower}`
      : userFirstNameLower;

    for (const pattern of mentionPatterns) {
      const patternLower = pattern.toLowerCase().trim();

      // Check various matching scenarios
      const firstMatch = patternLower === userFirstNameLower;
      const fullMatch = patternLower === userFullNameLower;
      const concatMatch = patternLower === userConcatenatedNameLower;
      const lastMatch = userLastNameLower && patternLower === userLastNameLower;

      if (firstMatch || fullMatch || concatMatch || lastMatch) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Highlight mentions in text for display purposes
 */
export function highlightMentions(
  text: string,
  cssClass: string = 'mention-highlight',
): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  const mentionRegex =
    /@([a-zA-Z][a-zA-Z0-9\-_]*(?:\s+[a-zA-Z][a-zA-Z0-9\-_]*)*)/gi;

  return text.replace(
    mentionRegex,
    (match) => `<span class="${cssClass}">${match}</span>`,
  );
}

/**
 * Get unique mentioned users from text
 * Returns array of mention patterns for user matching
 */
export function getUniqueMentionPatterns(text: string): string[][] {
  const mentions = extractMentions(text);
  return mentions.map((mention) => mention.patterns);
}
