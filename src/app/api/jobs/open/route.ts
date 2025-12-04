import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Job, Candidate, History } from '@/lib/mongodb';
import { ICandidateHistory } from '@/lib/models/history';
import { broadcastCandidateUpdate } from '@/lib/broadcast/broadCastCandidate';
import { getAuthenticatedUser } from '@/app/actions/auth';

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
    ).sort({
      'tracking.createdAt': -1,
    }).lean().exec();
    return NextResponse.json(jobs);
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
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

    // Find the candidate and their current history
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

    const existingHistory = await History!.findOne({
      candidateId,
      jobId: candidate.jobId,
    }).lean().exec();

    const lane = user?.organizationInfo?.lanes
      ? user?.organizationInfo?.lanes[0]
      : user?.organizationInfo?.defaultLanes
        ? user?.organizationInfo?.defaultLanes[0]
        : 'applied';

    // Update candidate with new job assignment and set status to "applied"
    const latestCandidate = await Candidate!.findByIdAndUpdate(candidateId, {
      jobId,
      status: lane,
      $set: {
        'tracking.assignedToJobDate': new Date().toISOString(),
      },
    });

    // If there's existing history, update it with the new jobId
    if (existingHistory) {
      await History!.findOneAndUpdate(
        {
          candidateId,
          jobId: candidate.jobId,
        },
        {
          $set: { jobId },
        },
      );
    }

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
    // Add this entry to history collection
    await History!.findOneAndUpdate(
      { jobId, candidateId },
      { $push: { history: historyEntry } },
      { upsert: true },
    );
    const updatedHistory = await History!
      .findOne({
        jobId,
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
    broadcastCandidateUpdate({
      ...candidateObj,
      jobId: {
        _id: jobId,
        title: nextJob.title,
        description: nextJob.description,
      },
      history: updatedHistory?.history,
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
      },
    });
  } catch (error: unknown) {
    console.error(error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
}
