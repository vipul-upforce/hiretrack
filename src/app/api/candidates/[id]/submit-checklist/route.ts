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
import { broadcastCandidateUpdate } from '@/lib/broadcast/broadCastCandidate';
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

// POST - Submit checklist responses for a candidate
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const decoded = await getAuthenticatedUser(req);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await connectToDatabase();

    // Check if models are initialized
    if (!Candidate || !History || !User) {
      return NextResponse.json(
        { error: 'Database models not initialized' },
        { status: 500 },
      );
    }

    const body = await req.json();
    const {
      checklistId,
      checklistName,
      checklistType,
      laneId,
      laneName,
      responses: rawResponses,
      remark,
      currentTime,
    } = body;

    // Validate required fields
    if (!checklistId || !checklistType || !laneId || !rawResponses) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }

    // Normalize responses so files is always an array of objects (never stringified)
    const responses = normalizeChecklistResponses(rawResponses);

    const { id } = await params;
    // Get candidate
    const candidate = await Candidate!.findById(id).populate([
      {
        path: 'assignment.interviewerId',
        select: '_id name email',
      },
      {
        path: 'remarks.userId',
        select: 'name email',
      },
      {
        path: 'followUp.userId',
        select: 'name email',
      },
      {
        path: 'jobId',
        select: '_id description title',
      },
    ]);
    if (!candidate) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 },
      );
    }

    // Get user role for permission validation
    const userRole = getUserRole(decoded.role);
    if (!userRole) {
      return NextResponse.json({ error: 'Invalid user role' }, { status: 403 });
    }

    // Get the job lane configuration to validate field permissions
    const laneConfig = await JobLaneConfig!.findOne({ jobId: candidate.jobId });
    if (!laneConfig) {
      return NextResponse.json(
        { error: 'Lane configuration not found' },
        { status: 404 },
      );
    }

    // Find the specific checklist for validation
    const targetLane = laneConfig.laneConfigs.find(
      (lc) => lc.laneId === laneId,
    );
    if (!targetLane) {
      return NextResponse.json(
        { error: 'Lane not found in configuration' },
        { status: 404 },
      );
    }

    const checklist =
      checklistType === 'incoming'
        ? targetLane.incomingChecklist
        : targetLane.outgoingChecklist;

    if (!checklist || checklist.id !== checklistId) {
      return NextResponse.json(
        { error: 'Checklist not found or ID mismatch' },
        { status: 404 },
      );
    }

    // Validate that user can submit responses for the submitted fields
    const submittedFieldIds = Object.keys(responses);
    const canSubmitFields = validateUserCanSubmitFields(
      submittedFieldIds,
      checklist.fields,
      userRole,
    );

    if (!canSubmitFields) {
      return NextResponse.json(
        {
          error:
            'User does not have permission to submit responses for some of these fields',
        },
        { status: 403 },
      );
    }

    // Initialize checklistData if not exists (Mongoose Map)
    if (!candidate.checklistData) {
      candidate.checklistData = {};
    }

    // Get or create lane checklist data
    const laneChecklistData =
      (candidate.checklistData && candidate.checklistData.laneId) || {};

    // Store checklist responses
    const checklistData = {
      checklistId,
      completedAt: currentTime,
      completedBy: decoded.id,
      responses, // Keep as plain object
      // visibleInHistory,
    };

    // Update based on checklist type
    if (checklistType === 'incoming') {
      laneChecklistData.incoming =
        checklistData as unknown as typeof laneChecklistData.incoming;
    } else {
      laneChecklistData.outgoing =
        checklistData as unknown as typeof laneChecklistData.outgoing;
    }
    // Update candidate checklistData via native driver to avoid Mongoose casting (files array)
    const candidateUpdate =
      checklistType === 'incoming'
        ? { [`checklistData.${laneId}.incoming`]: checklistData }
        : { [`checklistData.${laneId}.outgoing`]: checklistData };

    await Candidate!.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      { $set: candidateUpdate },
    );

    // Get user details for history
    const userId = decoded.id as string;
    const user = await User!.findById(userId);

    // Create history entry
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
                      (
                        f,
                      ): f is {
                        id?: string;
                        name: string;
                        url: string;
                        type?: string;
                        size?: number;
                      } =>
                        typeof f === 'object' &&
                        f !== null &&
                        'url' in f &&
                        typeof (f as { url: unknown }).url === 'string',
                    )
                    .map((f) => ({
                      id: (f as { id?: string }).id ?? '',
                      name: (f as { name: string }).name ?? '',
                      url: (f as { url: string }).url,
                      type: (f as { type?: string }).type ?? '',
                      size: Number((f as { size?: number }).size) || 0,
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

    // Add remark if provided
    if (remark && remark.description) {
      historyEntry.remark = {
        id: currentTime,
        isPrivate: remark.isPrivate || false,
        description: remark.description,
        date: currentTime,
        rating: remark.rating,
        userId: {
          _id: userId,
          name: user?.name || '',
          email: user?.email || '',
        },
      };

      // Push remark via updateOne to avoid full-document validation (e.g. legacy docs missing required fields like relevantExperience)
      const remarkDoc = {
        description: remark.description,
        date: currentTime,
        ...(remark.rating != null && { rating: remark.rating }),
        userId: new mongoose.Types.ObjectId(userId),
      };
      await Candidate!.updateOne(
        { _id: new mongoose.Types.ObjectId(id) },
        { $push: { remarks: remarkDoc } },
      );
      // Update in-memory candidate for broadcast so clients receive the new remark
      candidate.remarks = [
        ...(candidate.remarks || []),
        historyEntry.remark,
      ] as typeof candidate.remarks;
    }

    // Update history: use raw collection to avoid Mongoose casting checklistForm.responses.files
    const historyFilter = {
      // jobId: String(
      //   typeof candidate?.jobId === 'object' && '_id' in candidate.jobId
      //     ? candidate?.jobId?._id
      //     : candidate.jobId,
      // ),
      candidateId: candidate?._id.toString(),
    };
    await History!.updateOne(
      historyFilter,
      { $push: { history: historyEntry } },
      { upsert: true },
    );

    // CRITICAL FIX: Use find() instead of findOne() to get ALL history documents
    // A candidate can have multiple History documents (one per job + batch upload with jobId: null)
    const populateFields = [
      { path: 'history.assignmentBy', select: '_id name email' },
      { path: 'history.currentInterviewer', select: '_id name email' },
      { path: 'history.previousInterviewer', select: '_id name email' },
      { path: 'history.note.userId', select: '_id name email' },
    ];

    const historyDocuments = await History?.find({
      candidateId: candidate?._id.toString(),
    })
      .populate(populateFields)
      .lean()
      .exec();

    // Merge all history entries from all documents
    const allHistory: ICandidateHistory[] = [];
    if (historyDocuments && historyDocuments.length > 0) {
      historyDocuments.forEach((doc) => {
        if (doc.history && Array.isArray(doc.history)) {
          allHistory.push(...doc.history);
        }
      });
      // Sort by dateTime (newest first)
      allHistory.sort(
        (a, b) =>
          new Date(b.dateTime ?? 0).getTime() -
          new Date(a.dateTime ?? 0).getTime(),
      );
    }

    const candidateHistoryPopulated = { history: allHistory };
    const candidateObj = candidate.toObject();
    // Fire-and-forget broadcast - errors handled internally
    broadcastCandidateUpdate({
      ...candidateObj,
      history: candidateHistoryPopulated?.history || [],
      duplicateCount: candidateObj.duplicateCount || 0,
    }).catch((error) => {
      logger.error({ error }, 'Failed to broadcast candidate checklist update');
    });
    return NextResponse.json({
      success: true,
      message: 'Checklist submitted successfully',
      data: {
        candidateId: id,
        checklistType,
        laneId,
        completedAt: checklistData.completedAt,
      },
    });
  } catch (error) {
    logger.error({ error, url: req.url }, 'Error submitting checklist');
    return NextResponse.json(
      {
        error: 'Failed to submit checklist',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
