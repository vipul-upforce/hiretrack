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

/**
 * Get lane config by laneId from history entries.
 * Fetches JobLaneConfig docs that contain any of the given laneIds and builds
 * a map laneId -> { config, laneConfig } for checklist visibility filtering.
 */
async function getLaneConfigMapByLaneIds(
  laneIds: string[],
  JobLaneConfigModel: {
    find: (q: object) => {
      lean: () => { exec: () => Promise<{ laneConfigs?: ILaneConfig[] }[]> };
    };
  } | null,
): Promise<
  Map<
    string,
    { config: { laneConfigs: ILaneConfig[] }; laneConfig: ILaneConfig }
  >
> {
  const laneConfigsMap = new Map<
    string,
    { config: { laneConfigs: ILaneConfig[] }; laneConfig: ILaneConfig }
  >();
  if (laneIds.length === 0 || !JobLaneConfigModel) return laneConfigsMap;
  const configs = await JobLaneConfigModel.find({
    'laneConfigs.laneId': { $in: laneIds },
  })
    .lean()
    .exec();
  configs.forEach((config) => {
    const laneConfigs = config.laneConfigs ?? [];
    laneConfigs.forEach((lc: ILaneConfig) => {
      if (lc.laneId) {
        laneConfigsMap.set(lc.laneId, {
          config: config as { laneConfigs: ILaneConfig[] },
          laneConfig: lc,
        });
      }
    });
  });
  return laneConfigsMap;
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

    // History: one document per candidate (keyed by candidateId only)
    const historyDocuments = await History.find({
      candidateId,
    })
      .populate(populateFields)
      .lean()
      .exec();

    if (!historyDocuments || historyDocuments.length === 0) {
      return NextResponse.json({ history: [], candidateId, jobIds: [] });
    }

    // Flatten history from single doc (or multiple if migration leftover)
    const allHistoryEntries: ICandidateHistory[] = [];
    historyDocuments.forEach((historyDoc) => {
      if (historyDoc.history && Array.isArray(historyDoc.history)) {
        allHistoryEntries.push(...historyDoc.history);
      }
    });

    // Collect unique laneIds from entries that have checklistForm for lane config lookup
    const laneIds = [
      ...new Set(
        allHistoryEntries
          .map((e) => e.checklistForm?.laneId)
          .filter((laneId): laneId is string => Boolean(laneId)),
      ),
    ];
    const laneConfigsByLaneId = await getLaneConfigMapByLaneIds(
      laneIds,
      JobLaneConfig ?? null,
    );

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
        const modifiedEntry = { ...entry };

        if (role !== 'admin' && role !== 'hr') {
          if (modifiedEntry.note && modifiedEntry.note.isPrivate) {
            modifiedEntry.note = {
              ...modifiedEntry.note,
              description: '',
            };
          }
        }

        // If this entry has checklist data, filter the responses based on user role using laneId
        const laneId = modifiedEntry.checklistForm?.laneId;
        if (modifiedEntry.checklistForm && userData?.role && laneId) {
          const laneConfigEntry = laneConfigsByLaneId.get(laneId);
          if (laneConfigEntry) {
            const { laneConfig } = laneConfigEntry;
            let checklistFields: IChecklistField[] = [];
            const checklist =
              modifiedEntry.checklistForm.checklistType === 'incoming'
                ? laneConfig.incomingChecklist
                : laneConfig.outgoingChecklist;
            if (checklist?.fields) {
              checklistFields = checklist.fields;
            }
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

    return NextResponse.json({
      history: filteredHistory,
      candidateId,
      jobIds: [],
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
