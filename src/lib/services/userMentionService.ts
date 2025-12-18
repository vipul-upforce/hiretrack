import connectToDatabase, { User } from '@/lib/mongodb';
import { extractMentions, matchesUserName } from '@/lib/utils/mentionParser';
import type { IUser } from '@/lib/models/user';
import mongoose from 'mongoose';
import logger from '../logger';

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

interface OrgUserLean {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  role: IUser['role'];
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

/**
 * Find users mentioned in text within an organization
 * @param text - The text to search for mentions
 * @param organizationId - The organization ID
 * @param validMentionUserIds - Optional list of user IDs that were selected from the mention picker.
 *                              For interviewers, only mentions in this list will trigger notifications.
 *                              For HR and Admin, manually typed mentions will still work.
 */
export async function findMentionedUsers(
  text: string,
  organizationId: string,
  validMentionUserIds?: string[],
): Promise<MentionMatchResult> {
  try {
    // Validate inputs
    if (
      !text ||
      typeof text !== 'string' ||
      !organizationId ||
      typeof organizationId !== 'string'
    ) {
      logger.error('Invalid input parameters');
      return { mentionedUsers: [], unrecognizedMentions: [] };
    }

    await connectToDatabase();

    if (!User) {
      logger.error('User model not initialized');
      return { mentionedUsers: [], unrecognizedMentions: [] };
    }

    const mentions = extractMentions(text);

    if (mentions.length === 0) {
      logger.log('  - No mentions found in text');
      return { mentionedUsers: [], unrecognizedMentions: [] };
    }

    // Get all users in the organization (exclude candidates)
    const orgUsers = await User.find({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      role: { $in: ['admin', 'hr', 'interviewer'] },
      isDeleted: { $ne: true },
    })
      .select('_id name email role')
      .lean<OrgUserLean[]>();

    if (!orgUsers || orgUsers.length === 0) {
      return {
        mentionedUsers: [],
        unrecognizedMentions: mentions.map((m) => m.cleanMatch),
      };
    }

    const mentionedUsers: MentionedUser[] = [];
    const unrecognizedMentions: string[] = [];

    for (const mention of mentions) {
      try {
        let foundMatch = false;

        // Check each user against the mention patterns
        const validUsers = orgUsers.filter((user) => {
          if (!user.name || typeof user.name !== 'string') {
            return false;
          }
          return true;
        });

        for (const user of validUsers) {
          try {
            const nameParts = user.name.trim().split(/\s+/);
            const firstName = nameParts[0];
            const lastName =
              nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined;

            if (matchesUserName(firstName, lastName, mention.patterns)) {
              // For interviewers: only include if they were selected from the mention picker
              // For HR and Admin: allow manually typed mentions
              const userRole = user.role;
              const userIdStr = user._id.toString();
              const isValidMention = validMentionUserIds?.includes(userIdStr);

              if (
                userRole === 'interviewer' &&
                validMentionUserIds &&
                !isValidMention
              ) {
                foundMatch = true; // Mark as found to avoid adding to unrecognized
                // Skip adding to mentionedUsers for interviewers not in valid list
              } else {
                // Check if user is already in the results (avoid duplicates)
                const alreadyAdded = mentionedUsers.some(
                  (mu) => mu._id === userIdStr,
                );

                if (!alreadyAdded) {
                  mentionedUsers.push({
                    _id: userIdStr,
                    name: user.name,
                    email: user.email,
                    firstName,
                    lastName,
                    matchedPattern: mention.cleanMatch,
                  });
                }
                foundMatch = true;
              }
            }
          } catch (_userError) {
            // Continue processing other users
          }
        }

        if (!foundMatch) {
          unrecognizedMentions.push(mention.cleanMatch);
        }
      } catch (_mentionError) {
        unrecognizedMentions.push(mention.cleanMatch);
      }
    }

    return { mentionedUsers, unrecognizedMentions };
  } catch (error) {
    logger.error('❌ Error finding mentioned users:', error);
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

    if (!User) {
      logger.error('User model not initialized');
      return { valid: [], suggestions: [] };
    }

    const mentions = extractMentions(text);
    const orgUsers = await User.find({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      role: { $in: ['admin', 'hr', 'interviewer'] },
      isDeleted: { $ne: true },
    })
      .select('_id name email')
      .lean<OrgUserLean[]>();

    if (!orgUsers || orgUsers.length === 0) {
      return { valid: [], suggestions: [] };
    }

    const valid: MentionedUser[] = [];
    const suggestions: {
      pattern: string;
      suggestedUsers: { name: string; email: string }[];
    }[] = [];

    for (const mention of mentions) {
      const exactMatches: MentionedUser[] = [];
      const partialMatches: { name: string; email: string }[] = [];

      const validUsers = orgUsers.filter((user) => {
        if (!user.name || typeof user.name !== 'string') {
          return false;
        }
        return true;
      });

      for (const user of validUsers) {
        const nameParts = user.name.trim().split(/\s+/);
        const firstName = nameParts[0];
        const lastName =
          nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined;

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
    logger.error('Error validating mentions:', error);
    return { valid: [], suggestions: [] };
  }
}
