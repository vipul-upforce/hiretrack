import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Job, Candidate, History, DuplicateCandidate } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { ICandidateHistory } from '@/lib/models/history';
import { broadcastMultipleCandidateUpdate } from '@/lib/broadcast/broadCastCandidate';
import { NotificationService } from '@/lib/notifications/notificationService';
import { logger } from '@/lib/logger/logger.server';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const user = await getAuthenticatedUser(req, ['admin', 'hr']);

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    const { organizationId } = user;
    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID not found' },
        { status: 404 },
      );
    }

    const { jobId, candidateIds } = await req.json();

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

    // Determine lane - avoid nested ternary
    const lane = 'applied';
   
    // Fetch all candidates upfront to filter invalid ones
    const candidates = await Candidate.find({
      _id: { $in: candidateIds },
    });

    // Filter valid candidates (exist and not already assigned to target job)
    const validCandidates = candidates.filter(
      (candidate) => candidate.jobId?.toString() !== jobId,
    );

    if (validCandidates.length === 0) {
      return NextResponse.json(
        { error: 'No valid candidates to move' },
        { status: 400 },
      );
    }

    // Process each valid candidate
    const movedCandidateIds: string[] = [];
    const userId = user.id || null;
    const userName = user.name || 'Unknown User';

    for (const candidate of validCandidates) {
      const candidateId = candidate._id.toString();

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

      if (candidate.email && organizationId && candidate._id) {
        try {
          await DuplicateCandidate?.findOneAndUpdate(
            {
              email: candidate.email.toLowerCase(),
              orgId: organizationId, 
              'duplicates.candidateId': candidate._id,
            },
            {
              $set: { 'duplicates.$.jobId': jobId || null },
            },
            { new: true },
          );
        } catch (error) {
          logger.error({ error }, `Failed to update duplicate candidates for ${candidate._id} during bulk job switch`);
          // We don't want to block candidate update if this fails
        }
      }

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
          userId,
        },
        attachments: [],
        currentInterviewer: null,
        previousInterviewer: null,
        assignmentBy: userId,
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
    if (movedCandidateIds.length > 0) {
      try {
        await NotificationService.notifyBulkCandidateMoved({
          organizationId,
          candidateIds: movedCandidateIds,
          toJobId: jobId,
          toJobTitle: targetJob.title,
          triggerUserId: userId || '',
          triggerUserName: userName,
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

    // CRITICAL FIX: Use batch broadcasting instead of individual broadcasts
    // This reduces token signings from (N candidates × M clients) to just 1
    if (updatedCandidates.length > 0) {
      const candidatesToBroadcast = updatedCandidates.map((candidate) => {
        const candidateObj = candidate.toObject();
        delete candidateObj.jobId;
        return {
          ...candidateObj,
          jobId: {
            _id: jobId,
            title: targetJob.title,
            description: targetJob.description,
          },
        };
      });

      // Use batch broadcast - signs token ONCE for all candidates
      // Fire-and-forget: don't block response, but handle errors internally
      broadcastMultipleCandidateUpdate(candidatesToBroadcast).catch((error) => {
        logger.error({ error, url: req.url }, 'Failed to broadcast candidate updates');
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
