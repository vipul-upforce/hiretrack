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
