import connectToDatabase, { User } from '@/lib/mongodb';
import {
  extractMentions,
  matchesUserName,
  MentionPattern,
} from '@/lib/utils/mentionParser';
import mongoose from 'mongoose';

export interface MentionedUser {
  _id: string;
  name: string;
  email: string;
  firstName: string;
  lastName?: string;
  matchedPattern: string;
}

export interface MentionMatchResult {
  mentionedUsers: MentionedUser[];
  unrecognizedMentions: string[];
}

/**
 * Find users mentioned in text within an organization
 */
export async function findMentionedUsers(
  text: string,
  organizationId: string,
): Promise<MentionMatchResult> {
  try {
    console.log('🔍 FIND MENTIONED USERS DEBUG:');
    console.log('  - Input text:', text);
    console.log('  - Organization ID:', organizationId);

    // Validate inputs
    if (
      !text
      || typeof text !== 'string'
      || !organizationId
      || typeof organizationId !== 'string'
    ) {
      console.log('  - Invalid input parameters');
      return { mentionedUsers: [], unrecognizedMentions: [] };
    }

    await connectToDatabase();

    const mentions = extractMentions(text);
    console.log('  - Extracted mentions:', JSON.stringify(mentions, null, 2));

    if (mentions.length === 0) {
      console.log('  - No mentions found in text');
      return { mentionedUsers: [], unrecognizedMentions: [] };
    }

    // Get all users in the organization (exclude candidates)
    const orgUsers = await User.find({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      role: { $in: ['admin', 'hr', 'interviewer'] },
      isDeleted: { $ne: true },
    })
      .select('_id name email')
      .lean();

    console.log(
      '  - Organization users:',
      JSON.stringify(
        orgUsers.map((u) => ({ _id: u._id, name: u.name, email: u.email })),
        null,
        2,
      ),
    );

    const mentionedUsers: MentionedUser[] = [];
    const unrecognizedMentions: string[] = [];

    for (const mention of mentions) {
      try {
        console.log(`  - Processing mention: "${mention.cleanMatch}"`);
        console.log('    - Patterns:', mention.patterns);
        let foundMatch = false;

        // Check each user against the mention patterns
        for (const user of orgUsers) {
          try {
            if (!user.name || typeof user.name !== 'string') {
              console.log(`    - Skipping user with invalid name: ${user._id}`);
              continue;
            }

            const nameParts = user.name.trim().split(/\s+/);
            const firstName = nameParts[0];
            const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined;

            console.log(
              `    - Checking user: "${user.name}" (${firstName}, ${lastName})`,
            );

            if (matchesUserName(firstName, lastName, mention.patterns)) {
              console.log(`    - ✅ MATCH FOUND for user: ${user.name}`);
              // Check if user is already in the results (avoid duplicates)
              const alreadyAdded = mentionedUsers.some(
                (mu) => mu._id === user._id.toString(),
              );

              if (!alreadyAdded) {
                mentionedUsers.push({
                  _id: user._id.toString(),
                  name: user.name,
                  email: user.email,
                  firstName,
                  lastName,
                  matchedPattern: mention.cleanMatch,
                });
                console.log(`    - Added user to results: ${user.name}`);
              } else {
                console.log(`    - User already in results: ${user.name}`);
              }
              foundMatch = true;
            } else {
              console.log(`    - ❌ No match for user: ${user.name}`);
            }
          } catch (userError) {
            console.error(
              `    - Error processing user ${user._id}:`,
              userError,
            );
            continue;
          }
        }

        if (!foundMatch) {
          console.log(
            `    - No match found for mention: "${mention.cleanMatch}"`,
          );
          unrecognizedMentions.push(mention.cleanMatch);
        }
      } catch (mentionError) {
        console.error(
          `  - Error processing mention "${mention.cleanMatch}":`,
          mentionError,
        );
        unrecognizedMentions.push(mention.cleanMatch);
      }
    }

    console.log('  - Final results:');
    console.log(
      '    - Mentioned users:',
      JSON.stringify(mentionedUsers, null, 2),
    );
    console.log('    - Unrecognized mentions:', unrecognizedMentions);

    return { mentionedUsers, unrecognizedMentions };
  } catch (error) {
    console.error('❌ Error finding mentioned users:', error);
    return { mentionedUsers: [], unrecognizedMentions: [] };
  }
}

/**
 * Get user IDs mentioned in text for email notifications
 */
export async function getMentionedUserIds(
  text: string,
  organizationId: string,
): Promise<string[]> {
  const result = await findMentionedUsers(text, organizationId);
  return result.mentionedUsers.map((user) => user._id);
}

/**
 * Check if a specific user is mentioned in text
 */
export async function isUserMentioned(
  text: string,
  userId: string,
  organizationId: string,
): Promise<boolean> {
  const mentionedIds = await getMentionedUserIds(text, organizationId);
  return mentionedIds.includes(userId);
}

/**
 * Get mention summary for display/logging purposes
 */
export function getMentionSummary(result: MentionMatchResult): string {
  const parts: string[] = [];

  if (result.mentionedUsers.length > 0) {
    const names = result.mentionedUsers.map((user) => user.name);
    parts.push(`Found users: ${names.join(', ')}`);
  }

  if (result.unrecognizedMentions.length > 0) {
    parts.push(`Unrecognized: ${result.unrecognizedMentions.join(', ')}`);
  }

  return parts.length > 0 ? parts.join(' | ') : 'No mentions found';
}

/**
 * Validate mention patterns for user interface
 * Returns suggestions for partial matches
 */
export async function validateAndSuggestMentions(
  text: string,
  organizationId: string,
): Promise<{
  valid: MentionedUser[];
  suggestions: {
    pattern: string;
    suggestedUsers: { name: string; email: string }[];
  }[];
}> {
  try {
    await connectToDatabase();

    const mentions = extractMentions(text);
    const orgUsers = await User.find({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      role: { $in: ['admin', 'hr', 'interviewer'] },
      isDeleted: { $ne: true },
    })
      .select('_id name email')
      .lean();

    const valid: MentionedUser[] = [];
    const suggestions: {
      pattern: string;
      suggestedUsers: { name: string; email: string }[];
    }[] = [];

    for (const mention of mentions) {
      const exactMatches: MentionedUser[] = [];
      const partialMatches: { name: string; email: string }[] = [];

      for (const user of orgUsers) {
        const nameParts = user.name.trim().split(/\s+/);
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined;

        if (matchesUserName(firstName, lastName, mention.patterns)) {
          exactMatches.push({
            _id: user._id.toString(),
            name: user.name,
            email: user.email,
            firstName,
            lastName,
            matchedPattern: mention.cleanMatch,
          });
        } else if (isPartialMatch(mention.cleanMatch, user.name)) {
          partialMatches.push({
            name: user.name,
            email: user.email,
          });
        }
      }

      if (exactMatches.length > 0) {
        valid.push(...exactMatches);
      } else if (partialMatches.length > 0) {
        suggestions.push({
          pattern: mention.cleanMatch,
          suggestedUsers: partialMatches,
        });
      }
    }

    return { valid, suggestions };
  } catch (error) {
    console.error('Error validating mentions:', error);
    return { valid: [], suggestions: [] };
  }
}

/**
 * Check for partial name matches for suggestions
 */
function isPartialMatch(mentionPattern: string, userName: string): boolean {
  const mentionLower = mentionPattern.toLowerCase().trim();
  const nameLower = userName.toLowerCase().trim();

  // Check if mention is a substring of the user's name
  return nameLower.includes(mentionLower) && mentionLower.length >= 2;
}
