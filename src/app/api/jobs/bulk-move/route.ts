import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Job, Candidate, History } from '@/lib/mongodb';
import { auth } from '@/lib/auth';
import { ICandidateHistory } from '@/lib/models/history';
import { broadcastCandidateUpdate } from '@/lib/broadcast/broadCastCandidate';
import { NotificationService } from '@/lib/notifications/notificationService';
import { logger } from '@/lib/logger/logger.server';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const session = await auth(req);
    const organizationId = session?.user.organizationId;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID not found' },
        { status: 404 },
      );
    }

    const body = await req.json();
    const { jobId, candidateIds } = body;

    if (
      !jobId ||
      !candidateIds ||
      !Array.isArray(candidateIds) ||
      candidateIds.length === 0
    ) {
      return NextResponse.json(
        { error: 'Job ID and candidate IDs array are required' },
        { status: 400 },
      );
    }

    if (!Candidate || !History || !Job) {
      return NextResponse.json(
        { error: 'Database models not found' },
        { status: 404 },
      );
    }

    // Fetch the target job
    const targetJob = await Job.findById(jobId);
    if (!targetJob) {
      return NextResponse.json(
        { error: 'Target job not found' },
        { status: 404 },
      );
    }

    const lane = session?.user?.organizationInfo?.lanes
      ? session?.user?.organizationInfo?.lanes[0]
      : session?.user?.organizationInfo?.defaultLanes
        ? session?.user?.organizationInfo?.defaultLanes[0]
        : 'applied';

    // Process each candidate
    const movedCandidateIds: string[] = [];

    for (const candidateId of candidateIds) {
      const candidate = await Candidate.findById(candidateId);
      if (!candidate) continue;

      // Skip if already assigned to this job
      if (candidate.jobId?.toString() === jobId) continue;

      const previousJobId = candidate.jobId?.toString() || null;
      const previousJob = previousJobId
        ? await Job.findById(previousJobId)
        : null;

      // Update candidate
      await Candidate.findByIdAndUpdate(candidateId, {
        jobId,
        status: lane,
        $set: {
          'tracking.assignedToJobDate': new Date().toISOString(),
        },
      });

      // Update history if exists
      if (previousJobId) {
        const existingHistory = await History.findOne({
          candidateId,
          jobId: previousJobId,
        });

        if (existingHistory) {
          await History.findOneAndUpdate(
            { candidateId, jobId: previousJobId },
            { $set: { jobId } },
          );
        }
      }

      // Create history entry
      const historyEntry: ICandidateHistory = {
        dateTime: new Date().toISOString(),
        title: 'Assigned to Job',
        note: {
          description: `Candidate moved from ${previousJob?.title || 'No previous job'} to ${targetJob.title}`,
          date: new Date().toISOString(),
          rating: 0,
          userId: session?.user.id || null,
        },
        attachments: [],
        currentInterviewer: null,
        previousInterviewer: null,
        assignmentBy: session?.user.id || null,
      };

      await History.findOneAndUpdate(
        { jobId, candidateId },
        { $push: { history: historyEntry } },
        { upsert: true },
      );

      // Collect candidate IDs for notification
      movedCandidateIds.push(candidateId);
    }

    // Send single bulk notification for all moved candidates
    if (session?.user && movedCandidateIds.length > 0) {
      try {
        await NotificationService.notifyBulkCandidateMoved({
          organizationId,
          candidateIds: movedCandidateIds,
          toJobId: jobId,
          toJobTitle: targetJob.title,
          triggerUserId: session.user.id,
          triggerUserName: session.user.name || 'Unknown User',
        });
      } catch (notificationError) {
        logger.error(
          { notificationError, url: req.url },
          'Failed to send bulk candidate moved notification',
        );
      }
    }

    // Fetch updated candidates for response
    const updatedCandidates = await Candidate.find({
      _id: { $in: candidateIds },
    }).populate([
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
        select: 'title description',
      },
    ]);

    // Broadcast updates
    for (const candidate of updatedCandidates) {
      const candidateObj = candidate.toObject();
      delete candidateObj.jobId;
      broadcastCandidateUpdate({
        ...candidateObj,
        jobId: {
          _id: jobId,
          title: targetJob.title,
          description: targetJob.description,
        },
      });
    }

    return NextResponse.json({
      success: true,
      updatedCandidates: updatedCandidates.map((c) => ({
        ...c.toObject(),
        jobId: {
          _id: jobId,
          title: targetJob.title,
          description: targetJob.description,
        },
      })),
    });
  } catch (error: unknown) {
    logger.error({ error, url: req.url });
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Unknown error' }, { status: 500 });
  }
}
