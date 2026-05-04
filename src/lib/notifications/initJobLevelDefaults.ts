import connectToDatabase, { User } from '@/lib/mongodb';
import { DEFAULT_NOTIFICATION_SETTINGS } from '@/lib/constants/notificationDefaults';
import logger from '@/lib/logger';

/**
 * Initialize job-level notification settings to all enabled (default true) for all
 * eligible users (admin, hr, interviewer) when a new job is created.
 * Ensures new jobs receive notifications without requiring manual job-level setup.
 */
export async function initJobLevelDefaultsForNewJob(
  organizationId: string,
  jobId: string,
): Promise<void> {
  try {
    await connectToDatabase();

    if (!User) {
      logger.warn('User model not available for initJobLevelDefaultsForNewJob');
      return;
    }

    const eligibleUsers = await User.find({
      organizationId,
      role: { $in: ['admin', 'hr', 'interviewer'] },
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
    })
      .select('_id')
      .lean();

    if (eligibleUsers.length === 0) return;

    const jobLevelDefaults = { ...DEFAULT_NOTIFICATION_SETTINGS };

    const bulkOps = eligibleUsers.map((u) => ({
      updateOne: {
        filter: { _id: u._id },
        update: {
          $set: {
            [`emailNotificationSettings.jobLevel.${jobId}`]: jobLevelDefaults,
          },
        },
      },
    }));

    await User.bulkWrite(bulkOps);
  } catch (error) {
    logger.error(
      { error, organizationId, jobId },
      'Failed to init job-level notification defaults',
    );
    throw error;
  }
}
