import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Job, Candidate } from '@/lib/mongodb';
import { handleFileAttachments, handleCustomFieldFiles } from '@/lib/fileUtils';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { NotificationService } from '@/lib/notifications/notificationService';
import { logger } from '@/lib/logger/logger.server';
import { coerceJobExperienceForStorage } from '@/lib/utils/job-experience';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    if (!Job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    const job = await Job.findById(id).lean().exec();

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json(job);
  } catch (error: unknown) {
    logger.error({ error, url: request.url }, 'Error fetching job by ID');
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: 'Unknown error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let fileStorage = 'local';
  let organizationId;
  let triggerUserId = '';
  let triggerUserName = '';
  try {
    const [userData, data, { id }] = await Promise.all([
      getAuthenticatedUser(request, ['admin', 'hr']),
      request.json(),
      params,
      connectToDatabase(),
    ]);
    if (userData) {
      fileStorage = userData.fileStorage || 'local';
      organizationId = userData.organizationId;
      triggerUserId = userData.id || '';
      triggerUserName = userData.name || '';
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!data || Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    if (!Job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Get existing job to compare attachments
    // Handle both attachments and custom field files
    if (data.attachments) {
      data.attachments = await handleFileAttachments(
        data.attachments,
        fileStorage,
        organizationId,
      );
    }

    if (data.customFields) {
      const cs = await handleCustomFieldFiles(
        data.customFields,
        fileStorage,
        organizationId,
      );
      data.customFields = cs;
    }

    if (data.experience !== undefined) {
      const coercedExperience = coerceJobExperienceForStorage(data.experience);
      if (coercedExperience) {
        data.experience = coercedExperience;
      }
    }

    const updatedJob = await Job.findByIdAndUpdate(id, data, { new: true });

    if (
      triggerUserId &&
      triggerUserName &&
      userData?.role !== 'candidate' &&
      organizationId
    ) {
      try {
        await NotificationService.notifyJobUpdated({
          organizationId: organizationId.toString(),
          jobId: id,
          jobTitle: updatedJob?.title || 'Untitled Job',
          triggerUserId,
          triggerUserName,
        });
      } catch (notificationError) {
        logger.error(
          { notificationError, url: request.url },
          'Failed to send job update notification',
        );
        // Don't fail the API call if notification fails
      }
    }
    return NextResponse.json(updatedJob);
  } catch (error: unknown) {
    logger.error({ error, url: request.url }, 'Error updating job by ID');
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Unknown error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const [userData, { id }] = await Promise.all([
      getAuthenticatedUser(request, ['admin', 'hr']),
      params,
      connectToDatabase(),
    ]);
    if (!userData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!Job || !Candidate) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    // First, find the job to ensure it exists
    const job = await Job.findById(id).lean().exec();
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Toggle Delete the job
    await Job.findByIdAndUpdate(id, { isDeleted: !job.isDeleted });

    return NextResponse.json(
      {
        message: `Job ${job.isDeleted ? 'Un' : ''}Archived successfully.`,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    logger.error({ error, url: request.url }, 'Error deleting job by ID');
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Unknown error' }, { status: 500 });
  }
}
