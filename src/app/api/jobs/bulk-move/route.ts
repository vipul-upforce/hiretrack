import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Job, Candidate, History, DuplicateCandidate } from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { ICandidateHistory } from '@/lib/models/history';
import { broadcastMultipleCandidateUpdate } from '@/lib/broadcast/broadCastCandidate';
import { NotificationService } from '@/lib/notifications/notificationService';
import { logger } from '@/lib/logger/logger.server';
import { getJobAppliedLaneId } from '@/lib/services/laneService';
import { Types } from 'mongoose';

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

    // Get the "applied" lane ObjectId for the target job
    let appliedLaneId: Types.ObjectId | null = null;
    try {
      appliedLaneId = await getJobAppliedLaneId(
        organizationId,
        jobId,
      );
    } catch (error) {
      logger.error(
        { error, jobId, organizationId },
        'Failed to get applied lane for bulk move',
      );
    }

    if (!appliedLaneId) {
      return NextResponse.json(
        {
          error:
            'Applied lane not found. Please ensure default lanes are set up for this organization and job.',
        },
        { status: 400 },
      );
    }

    // Fetch all candidates upfront to filter invalid ones
    const candidates = await Candidate.find({
      _id: { $in: candidateIds },
    });

    // Filter valid candidates (exist and not already assigned to target job)
    const validCandidates = candidates.filter(
      (candidate) => candidate.jobId?.toString() !== jobId,
    );

    // Track each candidate's previous job id for SSE job-switch deltas on clients.
    // This lets connected boards (source + target jobs) apply laneCountDeltas and
    // movedOutByLane correctly without any refetch, even when candidates aren't on
    // the current API page due to sorting/pagination.
    const previousJobIdByCandidateId = new Map<string, string | null>();
    for (const candidate of validCandidates) {
      const cid = candidate._id?.toString?.() ?? String(candidate._id);
      const prevJobId =
        candidate.jobId != null ? candidate.jobId.toString() : null;
      previousJobIdByCandidateId.set(cid, prevJobId);
    }

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

      // Update candidate with Lane ObjectId
      await Candidate.findByIdAndUpdate(candidateId, {
        jobId,
        status: appliedLaneId, // Use Lane ObjectId, not string
        $set: {
          jobId,
          status: appliedLaneId,
          'tracking.assignedToJobDate': new Date().toISOString(),
          'tracking.updatedAt': new Date(),
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

      // Update history if exists - no longer needed; history is keyed by candidateId only

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
        { candidateId },
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
      {
        path: 'status',
        select: 'name',
        transform: (status: { name?: string } | null) => status?.name?.toLowerCase() ?? null,
      },
    ]);

    // CRITICAL FIX: Use batch broadcasting instead of individual broadcasts
    // This reduces token signings from (N candidates × M clients) to just 1.
    // Also embed per-candidate previousJobIdFromSSE so clients can treat this as
    // a real job-switch event for SSE lane deltas (no refetch).
    if (updatedCandidates.length > 0) {
      const candidatesToBroadcast = updatedCandidates.map((candidate) => {
        const candidateObj = candidate.toObject();
        const cid =
          (candidate as { _id?: unknown })._id?.toString?.() ??
          String((candidate as { _id?: unknown })._id ?? '');
        const previousJobIdForSse =
          previousJobIdByCandidateId.get(cid) ?? null;

        delete candidateObj.jobId;
        return {
          ...candidateObj,
          jobId: {
            _id: jobId,
            title: targetJob.title,
            description: targetJob.description,
          },
          // Used by useNormalizedCandidates to compute job-switch in/out deltas
          // for bulk moves (multipleCandidateUpdate SSE).
          previousJobIdFromSSE: previousJobIdForSse,
        };
      });

      // Use batch broadcast - signs token ONCE for all candidates
      // Fire-and-forget: don't block response, but handle errors internally
      broadcastMultipleCandidateUpdate(candidatesToBroadcast).catch((error) => {
        logger.error(
          { error, url: req.url },
          'Failed to broadcast candidate updates',
        );
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
