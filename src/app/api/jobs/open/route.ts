import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, {
  Job,
  Candidate,
  History,
  DuplicateCandidate,
} from '@/lib/mongodb';
import { ICandidateHistory } from '@/lib/models/history';
import { broadcastCandidateUpdate } from '@/lib/broadcast/broadCastCandidate';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { NotificationService } from '@/lib/notifications/notificationService';
import { logger } from '@/lib/logger/logger.server';
import { ICandidate } from '@/lib/models/candidate';
import { getDuplicateCountForCandidate } from '@/lib/utils/candidateUtils';

export async function GET(request: NextRequest) {
  try {
    const [user] = await Promise.all([
      getAuthenticatedUser(request),
      connectToDatabase(),
    ]);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!Job) {
      return NextResponse.json(
        { error: 'Job or Candidate not found' },
        { status: 404 },
      );
    }
    const jobs = await Job.find(
      {
        organizationId: user.organizationId,
        status: 'open',
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      },
      {
        _id: 1,
        title: 1,
      },
    )
      .sort({
        'tracking.createdAt': -1,
      })
      .lean()
      .exec();
    return NextResponse.json(jobs);
  } catch (error: unknown) {
    logger.error({ message: String(error), name: 'GetJobsError' }, 'Failed to get jobs');
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: 'An unknown error occurred' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const [user] = await Promise.all([
      getAuthenticatedUser(req),
      connectToDatabase(),
    ]);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { jobId, candidateId } = body;

    if (!jobId || !candidateId) {
      return NextResponse.json(
        { error: 'Job ID and Candidate ID are required' },
        { status: 400 },
      );
    }

    if (!Candidate && !History) {
      return NextResponse.json(
        { error: 'Candidate & History not found' },
        { status: 404 },
      );
    }

    // Find the candidate and their current history (history is keyed by candidateId only)
    const candidate = await Candidate!.findById(candidateId);

    if (!candidate) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 },
      );
    }

    // Check if candidate is already assigned to this job
    if (candidate.jobId?.toString() === jobId) {
      return NextResponse.json(
        { error: 'Candidate is already assigned to this job' },
        { status: 400 },
      );
    }

    // No need to update jobId on history doc - history is keyed by candidateId only

    // Fetch the job details using jobId
    const job = await Job!.findById(jobId);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Fetch both previous and new job details
    const previousJob = candidate.jobId
      ? await Job!.findById(candidate.jobId)
      : null;

    const nextJob = await Job!.findById(jobId);

    if (!nextJob) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    candidate.jobId = jobId;
    candidate.status = 'applied';

    await candidate.save();

    if (candidate.email && candidate.organizationId && candidate._id) {
      try {
        await DuplicateCandidate?.findOneAndUpdate(
          {
            email: candidate.email.toLowerCase(),
            orgId: candidate.organizationId,
            'duplicates.candidateId': candidate._id, 
          },
          {
            $set: { 'duplicates.$.jobId': candidate.jobId || null }, 
          },
          { new: true },
        );
      } catch (error) {
        logger.error(
          { message: String(error), name: 'UpdateDuplicateError' },
          'Failed to update duplicate candidates during job switch',
        );
        // We don't want to block candidate update if this fails
      }
    }

    // Create a new history entry for the job assignment
    const historyEntry: ICandidateHistory = {
      dateTime: new Date().toISOString(),
      title: 'Assigned to Job',
      note: {
        description: `Candidate moved from ${previousJob?.title || 'No previous job'} to ${nextJob.title}`,
        date: new Date().toISOString(),
        rating: 0,
        userId: user.id || null,
      },
      attachments: [],
      currentInterviewer: null,
      previousInterviewer: null,
      assignmentBy: user.id || null,
    };

    // Add this entry to history collection (one doc per candidate, keyed by candidateId only)
    await History!.findOneAndUpdate(
      { candidateId },
      { $push: { history: historyEntry } },
      { upsert: true },
    );

    // Send notification about candidate being moved
    if (previousJob && user) {
      try {
        await NotificationService.notifyCandidateMoved({
          organizationId: user.organizationId,
          candidateId,
          candidateName: candidate.name || 'Unknown Candidate',
          fromJobId: previousJob._id.toString(),
          fromJobTitle: previousJob.title,
          toJobId: jobId,
          toJobTitle: nextJob.title,
          triggerUserId: user.id!,
          triggerUserName: user.name!,
        });
      } catch (notificationError) {
        logger.error(
          { message: String(notificationError), name: 'NotificationError' },
          'Failed to send candidate moved notification',
        );
        // Don't fail the API call if notification fails
      }
    }

    const updatedHistory = await History!
      .findOne({
        candidateId,
      })
      .populate('history.currentInterviewer', '_id name email')
      .populate('history.previousInterviewer', '_id name email')
      .populate('history.assignmentBy', '_id name email')
      .populate('history.note.userId', '_id name email');

    const populatedCandidate = await candidate.populate([
      {
        path: 'assignment.interviewerId',
        select: '_id name email',
      },
      {
        path: 'remarks.userId',
        select: 'name email',
      },
      {
        path: 'jobId',
        select: 'title description ',
      },
    ]);

    const candidateObj = populatedCandidate.toObject();

    delete candidateObj.jobId;

    // Calculate duplicateCount
    const duplicateCount = await getDuplicateCountForCandidate(
      candidateObj as ICandidate,
      user.organizationId,
    );

    // Fire-and-forget broadcast - errors handled internally
    broadcastCandidateUpdate({
      ...candidateObj,
      jobId: {
        _id: jobId,
        title: nextJob.title,
        description: nextJob.description,
      },
      history: updatedHistory?.history,
      duplicateCount,
    }).catch((error) => {
      logger.error({ message: String(error), name: 'BroadcastCandidateJobOpenError' }, 'Failed to broadcast candidate job open update');
    });

    return NextResponse.json({
      success: true,
      updatedCandidate: {
        ...candidateObj,
        jobId: {
          _id: jobId,
          title: nextJob.title,
          description: nextJob.description,
        },
        history: updatedHistory?.history,
        duplicateCount,
      },
    });
  } catch (error: unknown) {
    logger.error({ message: String(error), name: 'PostJobsOpenError' }, 'Failed to post jobs open');
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Unknown error' }, { status: 500 });
  }
}
