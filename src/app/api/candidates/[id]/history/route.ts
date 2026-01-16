import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, {
  History,
  JobLaneConfig,
  Candidate,
} from '@/lib/mongodb';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { filterChecklistResponses } from '@/lib/utils/checklistVisibility';
import type {
  IChecklistField,
  ILaneConfig,
  UserRole,
} from '@/lib/models/JobLaneConfig';
import { logger } from '@/lib/logger/logger.server';
import { ICandidateHistory } from '@/lib/models/history';
// Disable static generation for this API route
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface HistoryEntryWithJobId extends ICandidateHistory {
  _jobIdForConfig?: string | null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const [{ id }, userData] = await Promise.all([
      params,
      getAuthenticatedUser(request, ['admin', 'hr', 'interviewer']),
      connectToDatabase(),
    ]);

    if (!userData) {
      return NextResponse.json(
        { message: 'Unauthorised Access' },
        { status: 401 },
      );
    }

    const role = userData?.role;
    const candidateId = id;

    if (!History) {
      return NextResponse.json(
        { error: 'History model not found' },
        { status: 404 },
      );
    }

    // Verify candidate exists to prevent wrong candidateId issues
    if (Candidate) {
      const candidate = await Candidate.findById(candidateId)
        .select('_id')
        .lean()
        .exec();
      if (!candidate) {
        return NextResponse.json(
          { error: 'Candidate not found' },
          { status: 404 },
        );
      }
    }

    const populateFields = [
      { path: 'history.currentInterviewer', select: '_id name email' },
      { path: 'history.previousInterviewer', select: '_id name email' },
      { path: 'history.assignmentBy', select: '_id name email' },
      { path: 'history.note.userId', select: '_id name email' },
    ];

    // CRITICAL FIX: Use find() instead of findOne() to get ALL history documents
    // A candidate can have multiple History documents (one per job + batch upload with jobId: null)
    const historyDocuments = await History.find({
      candidateId,
    })
      .populate(populateFields)
      .lean()
      .exec();

    if (!historyDocuments || historyDocuments.length === 0) {
      return NextResponse.json({ history: [] });
    }

    // Collect all unique jobIds to fetch lane configs
    const jobIds = new Set<string>();
    historyDocuments.forEach((doc) => {
      if (doc.jobId && typeof doc.jobId === 'string') {
        jobIds.add(doc.jobId);
      }
    });

    // Fetch all relevant lane configs in parallel
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const laneConfigsMap = new Map<string, any>();
    if (jobIds.size > 0 && JobLaneConfig) {
      const laneConfigs = await JobLaneConfig.find({
        jobId: { $in: Array.from(jobIds) },
      })
        .lean()
        .exec();
      laneConfigs.forEach((config) => {
        if (config.jobId && typeof config.jobId === 'string') {
          laneConfigsMap.set(config.jobId, config);
        }
      });
    }

    // Merge all history entries from all documents
    const allHistoryEntries: HistoryEntryWithJobId[] = [];
    historyDocuments.forEach((historyDoc) => {
      if (historyDoc.history && Array.isArray(historyDoc.history)) {
        historyDoc.history.forEach((entry) => {
          // Store the jobId with each entry for lane config lookup
          allHistoryEntries.push({
            ...entry,
            _jobIdForConfig: historyDoc.jobId || null,
          });
        });
      }
    });

    // Sort all entries by dateTime (newest first)
    allHistoryEntries.sort(
      (a, b) =>
        new Date(b.dateTime ?? 0).getTime() -
        new Date(a.dateTime ?? 0).getTime(),
    );

    // Filter history entries and checklist responses based on user role
    const filteredHistory: ICandidateHistory[] = allHistoryEntries
      .filter((entry) => {
        // Admins and HR can see all entries
        if (role === 'admin' || role === 'hr') {
          return true;
        }
        // For other roles, show entries without remarks or non-private remarks
        if (entry?.remark?.id) {
          return !entry.remark.isPrivate;
        }
        return true;
      })
      .map((entry): ICandidateHistory => {
        const { _jobIdForConfig, ...entryWithoutJobId } = entry;
        const modifiedEntry: ICandidateHistory = entryWithoutJobId;

        if (role !== 'admin' && role !== 'hr') {
          if (modifiedEntry.note && modifiedEntry.note.isPrivate) {
            modifiedEntry.note = {
              ...modifiedEntry.note,
              description: '',
            };
          }
        }

        // If this entry has checklist data, filter the responses based on user role
        if (modifiedEntry.checklistForm && userData?.role && _jobIdForConfig) {
          const laneConfig = laneConfigsMap.get(_jobIdForConfig);
          if (laneConfig) {
            // Find the checklist configuration to get field visibility settings
            let checklistFields: IChecklistField[] = [];
            const targetLane = laneConfig.laneConfigs.find(
              (lc: ILaneConfig) =>
                lc.laneId === modifiedEntry.checklistForm?.laneId,
            );
            if (targetLane) {
              const checklist =
                modifiedEntry.checklistForm.checklistType === 'incoming'
                  ? targetLane.incomingChecklist
                  : targetLane.outgoingChecklist;

              if (checklist && checklist.fields) {
                checklistFields = checklist.fields;
              }
            }

            // Filter the responses based on user role and field visibility
            const filteredResponses = filterChecklistResponses(
              modifiedEntry.checklistForm.responses,
              checklistFields,
              userData?.role as UserRole,
            );

            return {
              ...modifiedEntry,
              checklistForm: {
                ...modifiedEntry.checklistForm,
                responses: filteredResponses,
              },
            };
          }
        }

        return modifiedEntry;
      });

    // Return all unique jobIds (for debugging/info)
    const allJobIds = Array.from(jobIds);

    return NextResponse.json({
      history: filteredHistory,
      candidateId,
      jobIds: allJobIds, // Return all jobIds instead of just one
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching candidate history');
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
