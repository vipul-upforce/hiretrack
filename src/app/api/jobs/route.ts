import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Organization, Job, Candidate } from '@/lib/mongodb';
import { handleCustomFieldFiles, handleFileAttachments } from '@/lib/fileUtils';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { NotificationService } from '@/lib/notifications/notificationService';
import { logger } from '@/lib/logger/logger.server';

export async function GET(request: NextRequest) {
  try {
    const [userData] = await Promise.all([
      getAuthenticatedUser(request, ['admin', 'hr', 'interviewer']),
      connectToDatabase(),
    ]);
    if (!userData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { organizationId } = userData;

    const [jobs, organization] = await Promise.all([
      Job?.find({ organizationId }).lean().exec(),
      Organization?.findById(organizationId).lean().exec(),
    ]);

    if (!jobs?.length) {
      return NextResponse.json([]);
    }
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 },
      );
    }

    const openJobCardsOrder = organization.openJobCards || [];
    const openJobIds = new Set(openJobCardsOrder.map((id) => id?.toString()));
    const jobsMap = new Map(jobs.map((job) => [job._id.toString(), job]));

    const sortedJobs = openJobCardsOrder
      .map((id) => jobsMap.get(id?.toString()))
      .filter((job): job is NonNullable<typeof job> => !!job);
    const otherJobs = jobs.filter(
      (job) => !openJobIds.has(job._id?.toString()),
    );

    const candidateCounts = await Candidate?.aggregate([
      { $match: { jobId: { $in: jobs.map((job) => job._id) } } },
      { $group: { _id: '$jobId', count: { $sum: 1 } } },
    ]);
    const candidateCountMap = new Map(
      candidateCounts?.map((item) => [item._id?.toString(), item.count]),
    );

    const jobsWithCount = [...sortedJobs, ...otherJobs].map((job) => ({
      ...(job as any),
      candidateCount: candidateCountMap.get(job._id?.toString()) || 0,
    }));

    return NextResponse.json(jobsWithCount);
  } catch (error: unknown) {
    logger.error({ error, url: request.url }, 'Error fetching jobs');
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const [userData, data] = await Promise.all([
      getAuthenticatedUser(request, ['admin', 'hr']),
      request.json(),
      connectToDatabase(),
    ]);

    if (!data || !data.title || !data.attachments) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    if (!userData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { organizationId } = userData;
    const fileStorage = userData.fileStorage || 'local';
    // Handle file uploads
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

    if (!Job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    delete data._id;
    const newJob = new Job(data);
    await newJob.save();

    // Send job creation notification
    if (userData && organizationId) {
      try {
        await NotificationService.notifyJobCreated({
          organizationId,
          jobId: newJob._id?.toString(),
          jobTitle: newJob.title,
          triggerUserId: userData?.id as string,
          triggerUserName: userData?.name as string,
        });
      } catch (notificationError) {
        logger.error(
          { error: notificationError, url: request.url },
          'Failed to send job creation notification',
        );
        // Don't fail the API call if notification fails
      }
    }

    return NextResponse.json(newJob, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: 'Failed to create job', message: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: 'Failed to create job', message: 'An unknown error occurred' },
      { status: 500 },
    );
  }
}
