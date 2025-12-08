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
import { ObjectId } from 'mongoose';
import { logger } from '@/lib/logger/logger.server';
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
      console.error('Models not initialized:', {
        Candidate: !!Candidate,
        History: !!History,
        User: !!User,
      });
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
      // visibleInHistory,
      responses,
      remark,
      currentTime,
    } = body;

    // Validate required fields
    if (!checklistId || !checklistType || !laneId || !responses) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }

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
      (candidate.checklistData && candidate.checklistData[laneId]) || {};

    // Store checklist responses
    const checklistData = {
      checklistId,
      completedAt: currentTime,
      completedBy: decoded.id as unknown as ObjectId,
      responses, // Keep as plain object
      // visibleInHistory,
    };

    // Update based on checklist type
    if (checklistType === 'incoming') {
      laneChecklistData.incoming = checklistData;
    } else {
      laneChecklistData.outgoing = checklistData;
    }
    // Update the candidate's checklist data using MongoDB's Map update syntax
    const updateQuery =
      checklistType === 'incoming'
        ? { [`checklistData.${laneId}.incoming`]: checklistData }
        : { [`checklistData.${laneId}.outgoing`]: checklistData };

    await Candidate!.findByIdAndUpdate(
      id,
      { $set: updateQuery },
      {
        new: true,
        runValidators: false, // Skip validation for other fields
        upsert: false,
      },
    );

    // Get user details for history
    const userId = decoded.id;
    const user = await User!.findById(userId);

    // Create history entry
    const historyEntry: any = {
      dateTime: currentTime,
      title: `Completed ${checklistType} checklist for ${laneName} lane`,
      checklistForm: {
        checklistId,
        checklistName,
        checklistType,
        laneId,
        laneName,
        responses: Object.fromEntries(
          Object.entries(responses).map(
            ([fieldId, response]: [string, any]) => [
              fieldId,
              {
                fieldId,
                fieldLabel: response.fieldLabel || fieldId,
                fieldType: response.fieldType || 'text',
                value: response.value,
                files: response.files || [],
                visibleInHistory: response.visibleInHistory || [],
              },
            ],
          ),
        ),
        completedAt: currentTime,
        completedBy: userId,
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

      candidate.remarks = [...(candidate.remarks || []), historyEntry.remark];
      await candidate.save();
    }

    // Update history
    await History!.findOneAndUpdate(
      {
        jobId:
          typeof candidate?.jobId === 'object' && '_id' in candidate?.jobId
            ? candidate?.jobId?._id
            : candidate.jobId,
        candidateId: candidate?._id.toString(),
      },
      {
        $push: { history: historyEntry },
      },
      { upsert: true },
    );

    const candidateHistoryPopulated = await History?.findOne({
      jobId:
        typeof candidate?.jobId === 'object' && '_id' in candidate?.jobId
          ? candidate?.jobId?._id
          : candidate.jobId,
      candidateId: candidate?._id.toString(),
    })
      .populate([
        { path: 'history.assignmentBy', select: '_id name email' },
        { path: 'history.currentInterviewer', select: '_id name email' },
        { path: 'history.previousInterviewer', select: '_id name email' },
        { path: 'history.note.userId', select: '_id name email' },
      ])
      .lean();
    const candidateObj = candidate.toObject();
    broadcastCandidateUpdate({
      ...candidateObj,
      history: candidateHistoryPopulated?.history || [],
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
