import mongoose from 'mongoose';
import { User } from '@/lib/mongodb';
import { ResolveSentByParams } from './types';

/**
 * Resolve sentBy to a valid ObjectId (creates system user if needed)
 */
export async function resolveSentByToObjectId(
  params: ResolveSentByParams,
): Promise<string> {
  const { sentBy, organizationId, fromEmail } = params;

  // Fast path: if sentBy is already a valid ObjectId string, return it
  if (typeof sentBy === 'object' && sentBy?._id) {
    return sentBy._id.toString();
  }

  if (typeof sentBy === 'string' && mongoose.Types.ObjectId.isValid(sentBy)) {
    return sentBy;
  }

  // Create or get system user (optimized with select)
  const systemUser = await User?.findOneAndUpdate(
    {
      email: fromEmail,
      organizationId: new mongoose.Types.ObjectId(organizationId),
    },
    {
      $setOnInsert: {
        name: 'HireTrack System',
        email: fromEmail,
        role: 'system',
        organizationId: new mongoose.Types.ObjectId(organizationId),
      },
    },
    { upsert: true, new: true, select: '_id' },
  ).lean();

  if (!systemUser?._id) {
    throw new Error('Failed to create or retrieve system user');
  }

  return systemUser._id.toString();
}
