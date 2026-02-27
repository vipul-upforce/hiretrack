import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, {
  Candidate,
  History,
  User,
  JobLaneConfig,
} from '@/lib/mongodb';
import {
  validateUserCanSubmitFields,
  getUserRole,
} from '@/lib/utils/checklistVisibility';
import { broadcastMultipleCandidateUpdate } from '@/lib/broadcast/broadCastCandidate';
import { getAuthenticatedUser } from '@/app/actions/auth';
import mongoose from 'mongoose';
import { logger } from '@/lib/logger/logger.server';
import { ICandidateHistory } from '@/lib/models/history';
import {
  ChecklistResponse,
  ChecklistHistoryResponseItem,
} from '@/types/checklist';

type FileItem = {
  id?: string;
  name: string;
  url: string;
  type?: string;
  size?: number;
};

function parseFiles(files: unknown): FileItem[] {
  if (Array.isArray(files)) {
    return files.map((item) => {
      if (typeof item === 'string') {
        try {
          const parsed = JSON.parse(item) as FileItem;
          return {
            id: parsed.id ?? '',
            name: parsed.name,
            url: parsed.url,
            type: parsed.type ?? '',
            size: Number(parsed.size) || 0,
          };
        } catch {
          return { id: '', name: item, url: '', type: '', size: 0 };
        }
      }
      if (typeof item === 'object' && item !== null && 'url' in item) {
        const o = item as FileItem;
        return {
          id: o.id ?? '',
          name: o.name,
          url: o.url,
          type: o.type ?? '',
          size: Number(o.size) || 0,
        };
      }
      return { id: '', name: '', url: '', type: '', size: 0 };
    });
  }
  if (typeof files === 'string') {
    try {
      const parsed = JSON.parse(files) as FileItem[] | FileItem;
      return Array.isArray(parsed)
        ? parsed.map((f) => ({
            id: f.id ?? '',
            name: f.name,
            url: f.url,
            type: f.type ?? '',
            size: Number(f.size) || 0,
          }))
        : [parsed];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeChecklistResponses(
  raw: Record<string, unknown>,
): Record<string, ChecklistResponse> {
  const out: Record<string, ChecklistResponse> = {};
  for (const [fieldId, r] of Object.entries(raw)) {
    if (!r || typeof r !== 'object') continue;
    const resp = r as Record<string, unknown>;
    const files = parseFiles(resp.files);
    out[fieldId] = {
      value: resp.value,
      fieldLabel:
        typeof resp.fieldLabel === 'string' ? resp.fieldLabel : fieldId,
      fieldType: typeof resp.fieldType === 'string' ? resp.fieldType : 'text',
      visibleInHistory: Array.isArray(resp.visibleInHistory)
        ? resp.visibleInHistory
        : [],
      ...(files.length > 0 && { files }),
    } as ChecklistResponse;
  }
  return out;
}

/** POST - Submit the same checklist data for multiple candidates and set their status */
export async function POST(req: NextRequest) {
  try {
    const decoded = await getAuthenticatedUser(req);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await connectToDatabase();

    if (!Candidate || !History || !User || !JobLaneConfig) {
      return NextResponse.json(
        { error: 'Database models not initialized' },
        { status: 500 },
      );
    }

    const body = await req.json();
    const {
      data: checklistPayload,
      candidates: candidateItems,
      currentTime: requestTime,
    } = body as {
      data: {
        checklistId: string;
        checklistName: string;
        checklistType: 'incoming' | 'outgoing';
        laneId: string;
        laneName: string;
        responses: Record<string, unknown>;
        remark?: { description?: string; isPrivate?: boolean; rating?: number };
      };
      candidates: { candidateId: string; newStatus: string }[];
      currentTime?: string;
    };

    if (
      !checklistPayload?.checklistId ||
      !checklistPayload?.checklistType ||
      !checklistPayload?.laneId ||
      !checklistPayload?.responses ||
      !Array.isArray(candidateItems) ||
      candidateItems.length === 0
    ) {
      return NextResponse.json(
        { error: 'Missing required fields: data (checklistId, checklistType, laneId, responses), candidates[]' },
        { status: 400 },
      );
    }

    const currentTime = requestTime ?? new Date().toISOString();
    const responses = normalizeChecklistResponses(
      checklistPayload.responses as Record<string, unknown>,
    );
    const {
      checklistId,
      checklistName,
      checklistType,
      laneId,
      laneName,
      remark,
    } = checklistPayload;

    const userRole = getUserRole(decoded.role);
    if (!userRole) {
      return NextResponse.json(
        { error: 'Invalid user role' },
        { status: 403 },
      );
    }

    const userId = decoded.id as string;
    const user = await User.findById(userId);
    const updatedIds: string[] = [];

    for (const item of candidateItems) {
      const { candidateId: id, newStatus } = item;
      const candidate = await Candidate!.findById(id).populate([
        { path: 'jobId', select: '_id description title' },
      ]);
      if (!candidate) {
        logger.warn({ candidateId: id }, 'Bulk submit checklist: candidate not found, skipping');
        continue;
      }

      const jobId =
        typeof candidate.jobId === 'object' && candidate.jobId && '_id' in candidate.jobId
          ? (candidate.jobId as { _id: unknown })._id
          : candidate.jobId;
      const laneConfig = await JobLaneConfig!.findOne({ jobId });
      if (!laneConfig) {
        logger.warn({ candidateId: id }, 'Bulk submit checklist: lane config not found, skipping');
        continue;
      }

      const targetLane = laneConfig.laneConfigs.find((lc) => lc.laneId === laneId);
      if (!targetLane) {
        logger.warn({ candidateId: id, laneId }, 'Bulk submit checklist: lane not found, skipping');
        continue;
      }

      const checklist =
        checklistType === 'incoming'
          ? targetLane.incomingChecklist
          : targetLane.outgoingChecklist;
      if (!checklist || checklist.id !== checklistId) {
        logger.warn({ candidateId: id }, 'Bulk submit checklist: checklist not found or ID mismatch, skipping');
        continue;
      }

      const submittedFieldIds = Object.keys(responses);
      const canSubmitFields = validateUserCanSubmitFields(
        submittedFieldIds,
        checklist.fields,
        userRole,
      );
      if (!canSubmitFields) {
        logger.warn({ candidateId: id }, 'Bulk submit checklist: permission denied, skipping');
        continue;
      }

      const checklistData = {
        checklistId,
        completedAt: currentTime,
        completedBy: userId,
        responses,
      };

      const candidateUpdate =
        checklistType === 'incoming'
          ? { [`checklistData.${laneId}.incoming`]: checklistData }
          : { [`checklistData.${laneId}.outgoing`]: checklistData };

      await Candidate!.collection.updateOne(
        { _id: new mongoose.Types.ObjectId(id) },
        { $set: candidateUpdate },
      );

      const historyEntry: Partial<ICandidateHistory> = {
        dateTime: currentTime,
        title: `Completed ${checklistType} checklist for ${laneName} lane`,
        checklistForm: {
          checklistId,
          checklistName,
          checklistType,
          laneId,
          laneName,
          responses: Object.fromEntries(
            Object.entries(responses as Record<string, ChecklistResponse>).map(
              ([fieldId, response]): [string, ChecklistHistoryResponseItem] => {
                const rawFiles = response.files ?? [];
                const files = Array.isArray(rawFiles)
                  ? rawFiles
                      .filter(
                        (f): f is { id?: string; name: string; url: string; type?: string; size?: number } =>
                          typeof f === 'object' &&
                          f !== null &&
                          'url' in f &&
                          typeof (f as { url: unknown }).url === 'string',
                      )
                      .map((f) => ({
                        id: f.id ?? '',
                        name: f.name,
                        url: f.url,
                        type: f.type ?? '',
                        size: Number(f.size) || 0,
                      }))
                  : [];
                return [
                  fieldId,
                  {
                    value: response.value,
                    fieldLabel: response.fieldLabel || fieldId,
                    fieldType: response.fieldType || 'text',
                    files,
                    visibleInHistory: response.visibleInHistory || [],
                  },
                ];
              },
            ),
          ) as Record<string, ChecklistHistoryResponseItem>,
          completedAt: new Date(currentTime),
          completedBy: {
            _id: userId,
            name: user?.name || '',
            email: user?.email || '',
          },
        },
        currentInterviewer: null,
        previousInterviewer: null,
        assignmentBy: userId,
      };

      if (remark?.description) {
        historyEntry.remark = {
          id: currentTime,
          isPrivate: remark.isPrivate ?? false,
          description: remark.description,
          date: currentTime,
          rating: remark.rating,
          userId: {
            _id: userId,
            name: user?.name || '',
            email: user?.email || '',
          },
        };
        await Candidate!.collection.updateOne(
          { _id: new mongoose.Types.ObjectId(id) },
          {
            $push: {
              remarks: historyEntry.remark,
            },
          },
        );
      }

      const historyFilter = {
        jobId,
        candidateId: id,
      };
      await History!.collection.updateOne(
        historyFilter,
        { $push: { history: historyEntry } },
        { upsert: true },
      );

      await Candidate!.collection.updateOne(
        { _id: new mongoose.Types.ObjectId(id) },
        {
          $set: {
            status: newStatus,
            'tracking.updatedAt': new Date(currentTime),
          },
        },
      );

      updatedIds.push(id);
    }

    if (updatedIds.length === 0) {
      return NextResponse.json(
        { error: 'No candidates were updated' },
        { status: 422 },
      );
    }

    const updatedCandidates = await Candidate!.find({ _id: { $in: updatedIds } })
      .populate('jobId', '_id description title')
      .lean()
      .exec();

    const candidatesWithMergedHistory = await Promise.all(
      updatedCandidates.map(async (c) => {
        const historyDocuments = await History?.find({
          candidateId: c._id.toString(),
        })
          .lean()
          .exec();
        const allHistory: ICandidateHistory[] = [];
        if (historyDocuments?.length) {
          historyDocuments.forEach((doc) => {
            if (doc.history && Array.isArray(doc.history)) {
              allHistory.push(...(doc.history as ICandidateHistory[]));
            }
          });
          allHistory.sort(
            (a, b) =>
              new Date(b.dateTime ?? 0).getTime() -
              new Date(a.dateTime ?? 0).getTime(),
          );
        }
        return {
          ...c,
          history: allHistory,
          duplicateCount: (c as { duplicateCount?: number }).duplicateCount ?? 0,
        };
      }),
    );

    broadcastMultipleCandidateUpdate(candidatesWithMergedHistory).catch(
      (error) => {
        logger.error(
          { error },
          'Failed to broadcast bulk checklist update',
        );
      },
    );

    return NextResponse.json({
      success: true,
      message: `Checklist applied to ${updatedIds.length} candidate(s)`,
      data: { updatedCount: updatedIds.length, candidateIds: updatedIds },
    });
  } catch (error) {
    logger.error(
      { error, url: req.url },
      'Error bulk submitting checklist',
    );
    return NextResponse.json(
      {
        error: 'Failed to bulk submit checklist',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
