import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, {
  Candidate,
  History,
  JobLaneConfig,
  User,
} from '@/lib/mongodb';
import {
  Attachments,
  FileAttachment,
  handleFileAttachments,
} from '@/lib/fileUtils';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { v4 as uuidv4 } from 'uuid';
import mongoose, { FilterQuery, Types, UpdateQuery } from 'mongoose';
import { broadcastCandidateUpdate } from '@/lib/broadcast/broadCastCandidate';
import { ICandidate } from '@/lib/models/candidate';
import { ICandidateHistory } from '@/lib/models/history';
import { filterChecklistResponses } from '@/lib/utils/checklistVisibility';
import { NotificationService } from '@/lib/notifications/notificationService';
import {
  IChecklistField,
  ILaneConfig,
  UserRole,
} from '@/lib/models/JobLaneConfig';
import { sendRemarkNotificationWithMentions } from '@/lib/notifications/email/unifiedEmailService';
import { getFormattedDate } from '@/components/timezoneFormat/getFormattedTZ';
import { logger } from '@/lib/logger/logger.server';

export async function POST(request: NextRequest) {
  // Getting the history data
  try {
    const [userData, data] = await Promise.all([
      getAuthenticatedUser(request),
      request.json(),
      connectToDatabase(),
    ]);
    if (!userData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!History) {
      return NextResponse.json(
        { error: 'Database not connected' },
        { status: 400 },
      );
    }

    if (!data || !data.jobId || !data.candidateId) {
      return NextResponse.json(
        { error: 'Job ID and Candidate ID are required' },
        { status: 400 },
      );
    }
    const populateFields = [
      { path: 'history.currentInterviewer', select: '_id name email' },
      { path: 'history.previousInterviewer', select: '_id name email' },
      { path: 'history.assignmentBy', select: '_id name email' },
      { path: 'history.note.userId', select: '_id name email' },
    ];
    const [historyEntry, laneConfig] = await Promise.all([
      History.findOne({
        // jobId: data.jobId,
        candidateId: data.candidateId,
      })
        .populate(populateFields)
        .lean(),
      JobLaneConfig?.findOne({ jobId: data.jobId }).lean().exec(),
    ]);

    if (!historyEntry) {
      return NextResponse.json(
        { error: 'No Assignment History Found' },
        { status: 404 },
      );
    }

    // Filter checklist responses in history based on user role visibility
    const filteredHistory = historyEntry.history.map(
      (entry: ICandidateHistory) => {
        if (!entry.checklistForm) {
          return entry;
        }

        // Find the checklist configuration to get field visibility settings
        let checklistFields: IChecklistField[] = [];
        if (laneConfig) {
          const targetLane = laneConfig.laneConfigs.find(
            (lc: ILaneConfig) => lc.laneId === entry.checklistForm?.laneId,
          );
          if (targetLane) {
            const checklist =
              entry.checklistForm.checklistType === 'incoming'
                ? targetLane.incomingChecklist
                : targetLane.outgoingChecklist;

            if (checklist && checklist.fields) {
              checklistFields = checklist.fields;
            }
          }
        }

        // Filter the responses based on user role and field visibility
        const filteredResponses = filterChecklistResponses(
          entry.checklistForm.responses,
          checklistFields,
          userData.role as UserRole,
        );

        return {
          ...entry,
          checklistForm: {
            ...entry.checklistForm,
            responses: filteredResponses,
          },
        };
      },
    );

    return NextResponse.json(filteredHistory);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: 'An unknown error occurred' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const [userData, data] = await Promise.all([
      getAuthenticatedUser(request),
      request.json(),
      connectToDatabase(),
    ]);
    if (!userData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id, description, isPrivate, rating } = data;
    const user = userData;

    if (!History) {
      throw new Error('Database not connected');
    }

    // Detect type by checking DB, not by UUID format
    const remarkExists = await History.findOne({
      'history.remark.id': id,
    });

    const isRemark = !!remarkExists;

    const filter: FilterQuery<ICandidateHistory> = {};
    const updateFields: UpdateQuery<
      ICandidate & { history?: ICandidateHistory[] }
    > = {};

    if (isRemark) {
      // 🔹 Update remark
      filter['history.remark.id'] = id;
      if (user.role === 'interviewer') {
        filter['history.assignmentBy'] = new mongoose.Types.ObjectId(user.id);
      }

      updateFields['history.$.remark.description'] = description;
      updateFields['history.$.remark.isPrivate'] = isPrivate;
      updateFields['history.$.remark.rating'] = rating;
      updateFields['history.$.remark.updatedAt'] = new Date();
      updateFields['history.$.assignmentBy'] = new mongoose.Types.ObjectId(
        user.id,
      );
      updateFields['history.$.remark.userId'] = new mongoose.Types.ObjectId(
        user.id,
      );
      // updateFields["history.$.title"] = "Remark Updated";
    } else {
      // 🔹 Update note
      filter['history._id'] = new mongoose.Types.ObjectId(id);
      if (user.role === 'interviewer') {
        filter['history._id'] = new mongoose.Types.ObjectId(id);
      }

      updateFields['history.$.note.description'] = description;
      updateFields['history.$.note.isPrivate'] = isPrivate;
      updateFields['history.$.note.rating'] = rating;
      updateFields['history.$.assignmentBy'] = new mongoose.Types.ObjectId(
        user.id,
      );
    }

    // 🔹 Update doc
    const updatedHistory = await History.findOneAndUpdate(
      filter,
      { $set: updateFields },
      { new: true },
    );

    if (!updatedHistory) {
      return NextResponse.json(
        { error: `${isRemark ? 'Remark' : 'Note'} not found or unauthorized` },
        { status: 404 },
      );
    }

    // 🔹 Populate refs
    const populatedHistory = await updatedHistory.populate([
      { path: 'history.assignmentBy', select: '_id name email' },
      { path: 'history.currentInterviewer', select: '_id name email' },
      { path: 'history.previousInterviewer', select: '_id name email' },
      { path: 'history.note.userId', select: '_id name email' },
    ]);

    // 🔹 Extract updated item
    const updatedItem = populatedHistory.history.find((item) =>
      isRemark
        ? item.remark && item.remark.id === id
        : item.note && item?._id?.toString() === id,
    );

    if (!updatedItem) {
      return NextResponse.json(
        {
          error: `${isRemark ? 'Remark' : 'Note'} not found in updated document`,
        },
        { status: 404 },
      );
    }
    const candidateData = await Candidate?.findById(updatedHistory.candidateId)
      .populate([
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
      ])
      .lean();

    // Fire-and-forget broadcast - errors handled internally
    broadcastCandidateUpdate({
      ...candidateData,
      history: populatedHistory?.history || [],
      duplicateCount: candidateData?.duplicateCount || 0,
    } as ICandidate & { history?: ICandidateHistory[] }).catch((error) => {
      logger.error({ error }, 'Failed to broadcast candidate history update');
    });

    return NextResponse.json(
      {
        message: `Successfully updated the ${isRemark ? 'remark' : 'note'}`,
        data: updatedItem,
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error({ error, url: request.url }, 'Error updating remark/note:');
    return NextResponse.json(
      { error: 'Failed to update remark/note' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  if (!History) {
    return NextResponse.json(
      { error: 'Database not connected' },
      { status: 400 },
    );
  }
  try {
    const [userData] = await Promise.all([
      getAuthenticatedUser(request),
      connectToDatabase(),
    ]);
    let data = await request.json();
    if (!userData) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (data?.newEntry?.remark?.description) {
      data = {
        ...data,
        newEntry: {
          ...data.newEntry,
          dateTime: new Date().toISOString(),
          remark: {
            ...data.newEntry.remark,
            id: uuidv4(),
          },
        },
      };
    }

    const fileStorage = userData.fileStorage || 'local';
    const { organizationId } = userData;
    // Extracted history saving feature
    if (!data || !data.candidateId) {
      return NextResponse.json(
        { error: 'Candidate ID is required' },
        { status: 400 },
      );
    }

    // CRITICAL FIX: Normalize jobId to prevent history merge issues
    // Handle: object {_id, title, description}, string, null, or empty string
    let normalizedJobId: string | null = null;
    if (data.jobId) {
      if (
        typeof data.jobId === 'object' &&
        data.jobId !== null &&
        '_id' in data.jobId
      ) {
        normalizedJobId = String(data.jobId._id) || null;
      } else if (typeof data.jobId === 'string' && data.jobId.trim() !== '') {
        normalizedJobId = data.jobId.trim();
      }
    }
    // Normalize empty string to null for consistency
    if (normalizedJobId === '') {
      normalizedJobId = null;
    }

    if (data.newEntry.attachments && Array.isArray(data.newEntry.attachments)) {
      // Filter out invalid attachments and ensure type exists
      const validAttachments = data.newEntry.attachments.filter(
        (attachment: FileAttachment) =>
          attachment &&
          attachment.type &&
          typeof attachment.type === 'string' &&
          attachment.type.length > 0,
      );

      if (validAttachments.length > 0) {
        const newAttachments: Attachments = {
          files: validAttachments.filter(
            (attachment: FileAttachment) =>
              attachment.type && !attachment.type.startsWith('image/'),
          ) as FileAttachment[],
          images: validAttachments.filter(
            (attachment: FileAttachment) =>
              attachment.type && attachment.type.startsWith('image/'),
          ) as FileAttachment[],
        };
        const updatedFiles = await handleFileAttachments(
          newAttachments,
          fileStorage,
          organizationId,
        );

        data.newEntry.attachments = [
          ...updatedFiles.files,
          ...updatedFiles.images,
        ];
      } else {
        // If no valid attachments, set to empty array
        data.newEntry.attachments = [];
      }
    }
    if (data.newEntry.note && !data.newEntry.note.userId) {
      data.newEntry.note.userId = userData.id;
    }

    if (!Candidate) {
      throw new Error('Database not connceted');
    }

    const candidateId = new Types.ObjectId(data.candidateId);
    const populateHistoryFields = [
      { path: 'history.currentInterviewer', select: '_id name email' },
      { path: 'history.previousInterviewer', select: '_id name email' },
      { path: 'history.assignmentBy', select: '_id name email' },
      { path: 'history.note.userId', select: '_id name email' },
    ];
    const populateCandidateFields = [
      { path: 'assignment.interviewerId', select: '_id name email' },
      { path: 'remarks.userId', select: 'name email' },
      { path: 'jobId', select: 'title description' },
      { path: 'followUp.userId', select: 'name _id email' },
    ];
    const [candidateData, historyEntry] = await Promise.all([
      Candidate.findById(candidateId).populate(populateCandidateFields).lean(),
      History?.findOneAndUpdate(
        { jobId: normalizedJobId, candidateId: data.candidateId },
        { $push: { history: data.newEntry } },
        { upsert: true, new: true, runValidators: true },
      )
        .populate(populateHistoryFields)
        .lean(),
    ]);

    if (!historyEntry) {
      return NextResponse.json(
        { error: 'No Assignment History Found' },
        { status: 404 },
      );
    }
    if (!candidateData?.name) {
      return NextResponse.json(
        { error: 'Candidate data is incomplete' },
        { status: 400 },
      );
    }

    // Notify users based on isPrivate status
    if (data.newEntry?.remark?.description) {
      const selectedMentionUserIds =
        data.newEntry.remark.selectedMentionUserIds || [];

      await NotificationService.notifyRemarkAdded({
        organizationId,
        candidateId: data.candidateId,
        candidateName: candidateData.name,
        jobId:
          typeof data.jobId === 'string' && data.jobId !== ''
            ? data.jobId
            : data.jobId._id || null,
        jobTitle: data.jobId?.title || 'Unknown Job',
        remarkText: data.newEntry.remark.description,
        triggerUserId: userData.id?.toString() || '',
        triggerUserName: userData.name || 'Unknown User',
        roles: ['admin', 'hr'],
        validMentionUserIds: selectedMentionUserIds,
      });

      // ⭐ INSERTED EMAIL NOTIFICATION BLOCK HERE ⭐
      try {
        const users = await User?.find({
          organizationId: userData.organizationId,
          role: { $in: ['hr', 'admin'] },
          $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
        }).select('email');
        const remarkDate = (await getFormattedDate(
          request,
          data.newEntry.remark.date,
          false,
          userData.organizationId,
        )) as string;
        const remark = data.newEntry.remark.description || '';
        const remarkFor = candidateData?.name || '';
        const remarkAdder = userData.name;
        const rating = data.newEntry?.remark?.rating || null;
        const origin = request.headers.get('origin') || '';
        const jobIdForLink =
          typeof data.jobId === 'string' && data.jobId !== ''
            ? data.jobId
            : data.jobId?._id?.toString?.() || null;
        // Email is sent to admin/hr only → use job page link (not /candidate for interviewer)
        const candidateProfileLink =
          jobIdForLink && origin
            ? `${origin}/dashboard/jobs/${jobIdForLink}?candidateId=${data.candidateId}`
            : `${origin}/candidate/${data.candidateId}`;
        const organizationName = userData.organizationInfo?.name || 'HireTrack';
        const emailList = (users || []).map((user) => user.email);
        await sendRemarkNotificationWithMentions(
          organizationId,
          remark,
          {
            triggererUserId: userData.id?.toString() || '',
            triggererEmail: userData.email,
            triggererName: userData.name,
            jobId: data?.jobId?._id?.toString?.() || data?.jobId?.toString(),
            candidateId: data.candidateId.toString(),
            candidateName: remarkFor,
            jobTitle: data?.jobId?.title || 'Unknown Position',
            reviewerName: remarkAdder,
            remarkDate,
            rating,
            candidateProfileLink,
            organizationName,
            validMentionUserIds: selectedMentionUserIds,
            recipientName: emailList[0] || '',
          },
          emailList as string[],
        );
      } catch (err) {
        logger.error(
          { err, url: request.url },
          'Email remark notification failed',
        );
      }
    }

    const transformedHistory = (historyEntry.history || []).map(
      (historyItem: ICandidateHistory) => {
        if (historyItem.checklistForm?.responses) {
          return {
            ...historyItem,
            checklistForm: {
              ...historyItem.checklistForm,
              responses: new Map(
                Object.entries(historyItem.checklistForm.responses),
              ),
            },
          };
        }
        return historyItem;
      },
    );

    // Fire-and-forget broadcast - errors handled internally
    broadcastCandidateUpdate({
      ...candidateData,
      history: transformedHistory,
      duplicateCount: candidateData.duplicateCount || 0,
    } as ICandidate & { history?: ICandidateHistory[] }).catch((error) => {
      logger.error({ error }, 'Failed to broadcast candidate history update');
    });

    return NextResponse.json(transformedHistory);
  } catch (error) {
    logger.error({ error, url: request.url }, 'Error adding history entry:');
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { error: 'An unknown error occurred' },
      { status: 500 },
    );
  }
}
