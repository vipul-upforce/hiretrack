import logger from '@/lib/logger';
import connectToDatabase, { User } from '@/lib/mongodb';

/**
 * Gets user IDs by role for an organization
 */
export async function getUsersByRole(
  organizationId: string,
  roles: string[],
): Promise<string[]> {
  try {
    await connectToDatabase();

    if (!User) {
      throw new Error('User model not available');
    }

    const users = await User.find({
      organizationId,
      role: { $in: roles },
      isDeleted: { $ne: true },
    }).select('_id role name email');

    return users.map((user) => user._id.toString());
  } catch (error) {
    logger.error('Error getting users by role:', error);
    return [];
  }
}

/**
 * Gets display name for bulk email greeting.
 * When single recipient: returns their name. When multiple: returns 'Team'.
 */
export async function getRecipientDisplayNameForBulkEmail(
  organizationId: string,
  recipientIds: string[],
): Promise<string> {
  if (recipientIds.length === 0) return 'Team';
  if (recipientIds.length > 1) return 'Team';

  try {
    await connectToDatabase();
    if (!User) return 'Team';

    const user = await User.findOne({
      _id: recipientIds[0],
      organizationId,
      isDeleted: { $ne: true },
    })
      .select('name')
      .lean();

    return user?.name?.trim() || 'Team';
  } catch (error) {
    logger.error('Error getting recipient name for bulk email:', error);
    return 'Team';
  }
}

/**
 * Gets HR contact info (email + name) for organization.
 * Prefers trigger user if they are HR, else first HR user.
 */
export async function getHrContactInfo(
  organizationId: string,
  triggerUserId?: string,
): Promise<string> {
  try {
    await connectToDatabase();
    if (!User) return 'N/A';

    const hrUsers = await User.find({
      organizationId,
      role: 'hr',
      isDeleted: { $ne: true },
    })
      .select('_id email name')
      .lean();

    if (triggerUserId) {
      const triggerUser = hrUsers.find(
        (u) => u._id?.toString() === triggerUserId,
      );
      if (triggerUser?.email) {
        return `${triggerUser.email}${triggerUser.name ? ` | ${triggerUser.name}` : ''}`.trim();
      }
    }
    const firstHr = hrUsers[0];
    if (firstHr?.email) {
      return `${firstHr.email}${firstHr.name ? ` | ${firstHr.name}` : ''}`.trim();
    }
    return 'N/A';
  } catch (error) {
    logger.error('Error getting HR contact info:', error);
    return 'N/A';
  }
}

/**
 * Gets user IDs and emails by role for an organization
 */
export async function getUsersEmailByRole(
  organizationId: string,
  roles: string[],
): Promise<{ id: string; email: string }[]> {
  try {
    await connectToDatabase();

    if (!User) {
      throw new Error('User model not available');
    }

    const users = await User.find({
      organizationId,
      role: { $in: roles },
      isDeleted: { $ne: true },
    }).select('_id role name email');

    return users.map((user) => ({
      id: user._id.toString(),
      email: user.email,
    }));
  } catch (error) {
    logger.error('Error getting users email by role:', error);
    return [];
  }
}
