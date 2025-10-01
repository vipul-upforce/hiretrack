/**
 * Utility for parsing @mentions from text content
 * Supports flexible name matching patterns:
 * - @FirstName
 * - @FirstName LastName
 * - @FirstNameLastName
 */

export interface MentionPattern {
  fullMatch: string; // The complete matched text (e.g., "@Aneri Shah")
  cleanMatch: string; // The match without @ (e.g., "Aneri Shah")
  firstName: string; // First name extracted
  lastName?: string; // Last name if present
  patterns: string[]; // All variations to match against
}

/**
 * Extract all @mention patterns from text
 * Case-insensitive matching
 */
export function extractMentions(text: string): MentionPattern[] {
  try {
    console.log("🔍 EXTRACT MENTIONS DEBUG:");
    console.log("  - Input text:", text);
    console.log("  - Text type:", typeof text);
    console.log("  - Text length:", text?.length);

    if (!text || typeof text !== "string") {
      console.log("  - Invalid text input, returning empty array");
      return [];
    }

    // Regex to match @mentions with flexible name patterns
    // Matches: @word, @word word, @wordword, @word-word, etc.
    const mentionRegex =
      /@([a-zA-Z][a-zA-Z0-9\-_]*(?:\s+[a-zA-Z][a-zA-Z0-9\-_]*)*)/gi;
    console.log("  - Using regex:", mentionRegex);

    const mentions: MentionPattern[] = [];
    let match;
    let matchCount = 0;

    while ((match = mentionRegex.exec(text)) !== null) {
      matchCount++;
      console.log(`  - Match ${matchCount}:`, match);

      const fullMatch = match[0]; // e.g., "@Aneri Shah"
      const cleanMatch = match[1]; // e.g., "Aneri Shah"

      console.log(`    - Full match: "${fullMatch}"`);
      console.log(`    - Clean match: "${cleanMatch}"`);

      const nameParts = cleanMatch.trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName =
        nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined;

      console.log(`    - Name parts:`, nameParts);
      console.log(`    - First name: "${firstName}"`);
      console.log(`    - Last name: "${lastName}"`);

      // Generate search patterns
      const patterns = generateSearchPatterns(firstName, lastName);
      console.log(`    - Generated patterns:`, patterns);

      const mention = {
        fullMatch,
        cleanMatch,
        firstName,
        lastName,
        patterns,
      };

      mentions.push(mention);
      console.log(`    - Added mention:`, mention);
    }

    console.log(`  - Total matches found: ${matchCount}`);
    console.log(`  - Mentions before deduplication:`, mentions.length);

    // Remove duplicates based on cleanMatch (case-insensitive)
    const deduplicatedMentions = mentions.filter(
      (mention, index, array) =>
        array.findIndex(
          (m) => m.cleanMatch.toLowerCase() === mention.cleanMatch.toLowerCase()
        ) === index
    );

    console.log(
      `  - Mentions after deduplication:`,
      deduplicatedMentions.length
    );
    console.log(
      `  - Final mentions:`,
      JSON.stringify(deduplicatedMentions, null, 2)
    );

    return deduplicatedMentions;
  } catch (error) {
    console.error("❌ Error extracting mentions:", error);
    return [];
  }
}

/**
 * Generate all possible search patterns for a mention
 * This helps match against different user name formats
 */
function generateSearchPatterns(
  firstName: string,
  lastName?: string
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
 * Check if a user's name matches any of the mention patterns
 */
export function matchesUserName(
  userFirstName: string,
  userLastName: string | undefined,
  mentionPatterns: string[]
): boolean {
  try {
    console.log("🔍 MATCHES USER NAME DEBUG:");
    console.log("  - User first name:", userFirstName);
    console.log("  - User last name:", userLastName);
    console.log("  - Mention patterns:", mentionPatterns);

    if (
      !userFirstName ||
      typeof userFirstName !== "string" ||
      !mentionPatterns ||
      !Array.isArray(mentionPatterns) ||
      mentionPatterns.length === 0
    ) {
      console.log("  - Invalid input, returning false");
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

    console.log("  - User name variations:");
    console.log("    - First name lower:", userFirstNameLower);
    console.log("    - Last name lower:", userLastNameLower);
    console.log("    - Full name lower:", userFullNameLower);
    console.log("    - Concatenated name lower:", userConcatenatedNameLower);

    for (const pattern of mentionPatterns) {
      const patternLower = pattern.toLowerCase().trim();
      console.log(`  - Checking pattern: "${patternLower}"`);

      // Check various matching scenarios
      const firstMatch = patternLower === userFirstNameLower;
      const fullMatch = patternLower === userFullNameLower;
      const concatMatch = patternLower === userConcatenatedNameLower;
      const lastMatch = userLastNameLower && patternLower === userLastNameLower;

      console.log("    - First name match:", firstMatch);
      console.log("    - Full name match:", fullMatch);
      console.log("    - Concatenated match:", concatMatch);
      console.log("    - Last name match:", lastMatch);

      if (firstMatch || fullMatch || concatMatch || lastMatch) {
        console.log("    - ✅ MATCH FOUND!");
        return true;
      } else {
        console.log("    - ❌ No match");
      }
    }

    console.log("  - No patterns matched, returning false");
    return false;
  } catch (error) {
    console.error("❌ Error matching user name:", error);
    return false;
  }
}

/**
 * Highlight mentions in text for display purposes
 */
export function highlightMentions(
  text: string,
  cssClass: string = "mention-highlight"
): string {
  if (!text || typeof text !== "string") {
    return text;
  }

  const mentionRegex =
    /@([a-zA-Z][a-zA-Z0-9\-_]*(?:\s+[a-zA-Z][a-zA-Z0-9\-_]*)*)/gi;

  return text.replace(mentionRegex, (match) => {
    return `<span class="${cssClass}">${match}</span>`;
  });
}

/**
 * Get unique mentioned users from text
 * Returns array of mention patterns for user matching
 */
export function getUniqueMentionPatterns(text: string): string[][] {
  const mentions = extractMentions(text);
  return mentions.map((mention) => mention.patterns);
}
