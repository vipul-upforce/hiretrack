import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, {
  User,
  Candidate,
  History,
  DuplicateCandidate,
} from '@/lib/mongodb';
import {
  handleCustomFieldFiles,
  handleFileAttachments,
  handleSingleFile,
} from '@/lib/fileUtils';
import { ICandidate as IExternalCandidate } from '@/lib/models/candidate';
import mongoose, { ProjectionType } from 'mongoose';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { IinfoUpdateLog, ICandidateHistory } from '@/lib/models/history';
import { broadcastCandidateUpdate } from '@/lib/broadcast/broadCastCandidate';
import { ITag } from '@/lib/models/organization';
import { NotificationService } from '@/lib/notifications/notificationService';
import logger from '@/lib/logger';
import { getFilterPrivateCFSingle } from '@/lib/filterPrivateCF';
import { getDuplicateCountForCandidate } from '@/lib/utils/candidateUtils';
import { Attachment } from '../route';

// /*  max-lines-per-function max-lines-per-file 300 */

interface UpdateObject {
  $set: Record<string, unknown>;
  $currentDate: { 'tracking.updatedAt': boolean };
  $unset?: Record<string, number>;
}

interface IFJob {
  _id: string | mongoose.Types.ObjectId;
  title: string;
  description: string;
}

type ICandidate = IExternalCandidate & {
  _id?: string | mongoose.Types.ObjectId;
  jobId?: IFJob | mongoose.Types.ObjectId | null;
  [key: string]: unknown;
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const updates: IinfoUpdateLog[] = [];

  const fieldsToTrack = [
    'name',
    'email',
    'contact',
    'location',
    'experience',
    'relevantExperience',
    'currentCTC',
    'expectedCTC',
    'atttachments',
    'noticePeriod',
    'customFields',
    'resume',
    'status',
    'tags',
  ];

  try {
    // Connect to database, parse request, and resolve params in parallel
    const [data, { id }, userData] = await Promise.all([
      request.json(),
      params,
      getAuthenticatedUser(request),
      connectToDatabase(),
    ]);

    if (!userData) {
      return NextResponse.json(
        { message: 'Unauthorised Access' },
        { status: 401 },
      );
    }
    const fileStorage = userData.fileStorage || 'local';
    const { organizationId } = userData;
    // Validate candidate ID
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid candidate ID' },
        { status: 400 },
      );
    }

    const existingCandidate: ICandidate | null = (await Candidate!
      .findById(id)
      .populate({
        path: 'jobId',
        select: '_id title', // Only fetch necessary fields
      })
      .lean()) as ICandidate | null;
    if (!existingCandidate) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 },
      );
    }

    if (data.resume) {
      data.resume = await handleSingleFile(
        data.resume,
        fileStorage,
        organizationId,
      );
      if (
        JSON.stringify(existingCandidate.resume) !== JSON.stringify(data.resume)
      ) {
        updates.push({
          title: 'Updated Resume',
          previousValue: existingCandidate.resume,
          currentValue: data.resume,
          attachments: [data.resume],
        });
      }
    }

    if (data.tags) {
      if (
        JSON.stringify(existingCandidate.tags) !== JSON.stringify(data.tags)
      ) {
        const existingCandidateTagsStr = existingCandidate.tags
          ?.map((tag) => tag.title)
          .join(', ');
        const dataTagsStr = data.tags?.map((tag: ITag) => tag.title).join(', ');
        updates.push({
          title: 'Updated Tags',
          previousValue: existingCandidateTagsStr,
          currentValue: dataTagsStr,
        });
      }
    }

    if (data.attachments) {
      const images = data.attachments.filter((attachment: Attachment) =>
        attachment.type.startsWith('image'),
      );
      const files = data.attachments.filter(
        (attachment: Attachment) => !attachment.type.startsWith('image'),
      );

      data.attachments = {
        images: images || [],
        files: files || [],
      };
      const { files: f, images: i } = await handleFileAttachments(
        data.attachments,
        fileStorage,
        organizationId,
      );
      data.attachments = [...f, ...i];
      if (
        JSON.stringify(existingCandidate.attachments) !==
        JSON.stringify(data.attachments)
      ) {
        updates.push({
          title: 'Updated Attachments',
          previousValue: existingCandidate.attachments,
          currentValue: data.attachments,
          attachments: data.attachments.filter(
            (file: Attachment) =>
              !existingCandidate.attachments.some(
                (existingFile: Attachment) => existingFile.url === file.url,
              ),
          ),
        });
      }
    }

    // if (data.customFields) {
    //   const cs = await handleCustomFieldFiles(
    //     data.customFields,
    //     fileStorage,
    //     organizationId
    //   );
    //   data.customFields = cs;
    //   if (
    //     JSON.stringify(existingCandidate.customFields) !==
    //     JSON.stringify(data.customFields)
    //   ) {
    //     const allKeys = Object.keys({
    //       ...existingCandidate.customFields,
    //       ...data.customFields,
    //     });

    //     allKeys.forEach((key) => {
    //       const prev = existingCandidate.customFields[key];
    //       const curr = data.customFields[key];
    //       const csAttachments =
    //         Array(data.customFields) &&
    //         data.customFields.length > 0 &&
    //         "base64" in data.customFields[0]
    //           ? data.customFields[key]
    //           : null;
    //       if (prev !== curr) {
    //         updates.push({
    //           title: `Updated ${key}`,
    //           previousValue: prev || "~",
    //           currentValue: curr || "~",
    //           attachments: csAttachments,
    //         });
    //       }
    //     });
    //   }
    // }
    if (data.customFields) {
      // Process uploaded custom field files
      const cs = await handleCustomFieldFiles(
        data.customFields,
        fileStorage,
        organizationId,
      );
      data.customFields = cs;

      // Check for changes
      if (
        JSON.stringify(existingCandidate.customFields) !==
        JSON.stringify(data.customFields)
      ) {
        const allKeys = Object.keys({
          ...existingCandidate.customFields,
          ...data.customFields,
        });

        allKeys.forEach((key) => {
          const prev = existingCandidate.customFields?.[key];
          const curr = data.customFields?.[key];
          if (
            (prev === '' ||
              prev === null ||
              prev === undefined ||
              !((prev as string[]).length > 0)) &&
            (curr === '' ||
              curr === null ||
              curr === undefined ||
              !((curr as string[]).length > 0))
          ) {
            return;
          }
          let attachments;

          if (typeof curr === 'object' && curr !== null) {
            if ('base64' in curr) {
              attachments = [curr];
            } else if (
              Array.isArray(curr) &&
              curr.some((v) => v && typeof v === 'object' && 'base64' in v)
            ) {
              attachments = curr.filter(
                (v) => v && typeof v === 'object' && 'base64' in v,
              );
            }
          }

          if (JSON.stringify(prev) !== JSON.stringify(curr)) {
            updates.push({
              title: `Updated ${key}`,
              previousValue: prev || '',
              currentValue: curr || '',
              attachments,
            });
          }
        });
      }
    }

    if (
      data.email &&
      existingCandidate.email &&
      data.email.toLowerCase() !== existingCandidate.email.toLowerCase()
    ) {
      const oldEmail = existingCandidate.email.toLowerCase();
      const newEmail = String(data.email).toLowerCase();

      // CRITICAL FIX: Safely extract Job ID whether it's populated or not
      const jobIdValue =
        existingCandidate.jobId &&
        typeof existingCandidate.jobId === 'object' &&
        '_id' in existingCandidate.jobId
          ? existingCandidate.jobId._id
          : existingCandidate.jobId;

      try {
        // 1. Remove candidate from old email's duplicate entry
        await DuplicateCandidate?.findOneAndUpdate(
          {
            email: oldEmail,
            orgId: organizationId,
          },
          {
            $pull: {
              duplicates: {
                candidateId: new mongoose.Types.ObjectId(id),
              },
            },
          },
        );

        // 2. Add candidate to new email's duplicate entry
        await DuplicateCandidate?.findOneAndUpdate(
          {
            email: newEmail,
            orgId: organizationId,
          },
          {
            $addToSet: {
              duplicates: {
                candidateId: new mongoose.Types.ObjectId(id),
                jobId: jobIdValue || null,
              },
            },
          },
          { upsert: true, new: true },
        );
      } catch (error) {
        logger.error(
          { error },
          'Failed to update duplicate candidates during email change',
        );
      }
    }

    const updateObj: UpdateObject = {
      $set: {},
      $currentDate: { 'tracking.updatedAt': true },
    };

    let assignmentCompletedFollowUp = null;

    if ('assignment' in data) {
      if (data.assignment === null) {
        // Initialize $unset if it doesn't exist, then merge
        if (!updateObj.$unset) {
          updateObj.$unset = {};
        }
        updateObj.$unset.assignment = 1;

        // Add follow-up entry to highlight assignment complete
        if (userData.role === 'interviewer') {
          assignmentCompletedFollowUp = {
            note: `${userData?.name || 'Unknown User'} has completed the last step.`,
            date: null, // No specific follow-up date needed for completion note
            userId: userData?.id,
          };
        }
      } else {
        // Normalize interviewerId: convert empty string or "-1" to null
        const normalizedAssignment = { ...data.assignment };
        if (
          normalizedAssignment.interviewerId === '' ||
          normalizedAssignment.interviewerId === '-1'
        ) {
          normalizedAssignment.interviewerId = null;
        }

        // Handle null time explicitly - set time to null directly in the assignment object
        // MongoDB will store null, and we can filter for it properly
        if (
          normalizedAssignment.time === null ||
          normalizedAssignment.time === undefined
        ) {
          // Explicitly set time to null in the assignment object
          normalizedAssignment.time = null;
        }
        // Set the entire assignment object (with time as null if it was null/undefined)
        updateObj.$set.assignment = normalizedAssignment;
      }
    }
    const whatWasUpdated: string[] = [];
    if ('attachments' in data) {
      if (data.attachments === null) {
        // Initialize $unset if it doesn't exist, then merge
        if (!updateObj.$unset) {
          updateObj.$unset = {};
        }
        updateObj.$unset.attachments = 1;
      } else {
        if (
          JSON.stringify(existingCandidate.attachments) !==
          JSON.stringify(data.attachments)
        ) {
          whatWasUpdated.push('attachments');
        }
        updateObj.$set.attachments = data.attachments;
      }
    }
    if ('resume' in data) {
      if (data.resume === null) {
        // Initialize $unset if it doesn't exist, then merge
        if (!updateObj.$unset) {
          updateObj.$unset = {};
        }
        updateObj.$unset.resume = 1;
      } else {
        updateObj.$set.resume = data.resume;
      }
    }
    if ('customFields' in data) {
      if (data.customFields === null) {
        // Initialize $unset if it doesn't exist, then merge
        if (!updateObj.$unset) {
          updateObj.$unset = {};
        }
        updateObj.$unset.customFields = 1;
      } else {
        updateObj.$set.customFields = data.customFields;
      }
    }

    if ('skills' in data) {
      updateObj.$set.skills = data.skills;
    }
    if ('scores' in data) {
      updateObj.$set.scores = data.scores;
    }
    if ('tags' in data) {
      updateObj.$set.tags = data.tags;
    }
    if ('followUp' in data) {
      updateObj.$set.followUp = data.followUp;
      const oldFollowUp = existingCandidate.followUp;
      const newFollowUp = data?.followUp;

      try {
        const jobInfo = existingCandidate.jobId as IFJob;

        // Follow-up notifications
        // if ("followUp" in data) {
        // Case 1: Follow-up Added
        // Check if old follow-up is effectively empty (null/undefined OR both note and date are null)
        const isOldFollowUpEmpty =
          !oldFollowUp ||
          oldFollowUp === null ||
          oldFollowUp === undefined ||
          ((oldFollowUp.note === null ||
            oldFollowUp.note === undefined ||
            oldFollowUp.note === '') &&
            (oldFollowUp.date === null || oldFollowUp.date === undefined));

        // Check if new follow-up has actual content
        const hasNewFollowUpContent =
          newFollowUp &&
          ((newFollowUp.note != null && newFollowUp.note !== '') ||
            newFollowUp.date != null);

        if (isOldFollowUpEmpty && hasNewFollowUpContent) {
          await NotificationService.notifyFollowUpAdded({
            organizationId,
            candidateId: existingCandidate._id?.toString() || '',
            candidateName: existingCandidate.name,
            jobId:
              jobInfo?._id?.toString() ||
              existingCandidate.jobId?.toString() ||
              '',
            jobTitle: jobInfo?.title || 'Unknown Job',
            followupNote: newFollowUp.note || '',
            followupDate: newFollowUp.date
              ? new Date(newFollowUp.date)
              : undefined,
            triggerUserId: userData?.id || '',
            triggerUserName: userData?.name || '',
          });
        }
        // Case 2: Follow-up Updated
        else if (
          oldFollowUp &&
          oldFollowUp.note !== null &&
          oldFollowUp.note !== undefined &&
          newFollowUp &&
          newFollowUp.note !== null &&
          (newFollowUp.note !== oldFollowUp.note ||
            newFollowUp.date !== oldFollowUp.date)
        ) {
          await NotificationService.notifyFollowupUpdated({
            organizationId,
            candidateId: existingCandidate._id?.toString() || '',
            candidateName: existingCandidate.name,
            jobId:
              jobInfo?._id?.toString() ||
              existingCandidate.jobId?.toString() ||
              '',
            jobTitle: jobInfo?.title || 'Unknown Job',
            triggerUserId: userData?.id || '',
            triggerUserName: userData?.name || '',
          });
        }
        // Case 3: Follow-up Removed
        else if (
          oldFollowUp &&
          oldFollowUp !== undefined &&
          (oldFollowUp.note !== null || oldFollowUp.date !== null) &&
          newFollowUp &&
          newFollowUp.note === null &&
          newFollowUp.date === null
        ) {
          await NotificationService.notifyFollowupRemoved({
            organizationId,
            candidateId: existingCandidate._id?.toString() || '',
            candidateName: existingCandidate.name,
            jobId:
              jobInfo?._id?.toString() ||
              existingCandidate.jobId?.toString() ||
              '',
            jobTitle: jobInfo?.title || 'Unknown Job',
            triggerUserId: userData?.id || '',
            triggerUserName: userData?.name || '',
          });
        }
        // }
      } catch (notificationError) {
        logger.error(
          { notificationError, url: request.url },
          'Failed to send follow-up notifications',
        );
        // Continue execution even if notification fails
      }
    }
    // Track follow-up history entry for assignment completion
    let followUpHistoryEntry: ICandidateHistory | null = null;

    // Assignment completed follow-up notifications
    if (assignmentCompletedFollowUp) {
      const completionNote = `${userData?.name || 'Unknown User'} has completed the last step.`;
      const oldAssignment = existingCandidate.assignment;
      const oldFollowUp = existingCandidate.followUp;
      const isFollowUpNew =
        !oldFollowUp || (!oldFollowUp.note && !oldFollowUp.date);

      if ('followUp' in data && data.followUp && data.followUp.note) {
        // Split on ||||| and trim each note
        const noteArr: string[] = data.followUp.note
          .split('|||||')
          .map((n: string) => n.trim())
          .filter(Boolean);

        // 🛠 Look for an existing completion note (from ANY user)
        const completionIndex = noteArr.findIndex((n) =>
          n.endsWith('has completed the last step.'),
        );

        // Check if completion note already exists (to avoid duplicate history entries)
        const completionNoteExists = completionIndex !== -1;

        if (completionIndex !== -1) {
          // 🗑 Remove existing completion note
          noteArr.splice(completionIndex, 1);
        }

        // ➕ Always add new completion note at the end
        noteArr.push(completionNote);

        // Always join with ||||| + newline
        data.followUp.note = noteArr.join('|||||\n');

        // Ensure userId is updated
        data.followUp.userId =
          assignmentCompletedFollowUp.userId || data.followUp.userId;

        updateObj.$set.followUp = data.followUp;

        // Only create history entry if follow-up actually changed
        // (i.e., if completion note didn't already exist or follow-up is new)
        if (!completionNoteExists || isFollowUpNew) {
          // Create history entry for follow-up update
          followUpHistoryEntry = {
            dateTime: data.dateTime || new Date().toISOString(),
            title: isFollowUpNew ? 'Followup Created' : 'Followup Updated',
            assignmentBy: userData?.id || '',
            note: {
              description: completionNote,
              date: data.followUp.date || '',
              rating: 0,
              userId: userData?.id || null,
            },
            currentInterviewer: null,
            previousInterviewer: null,
            attachments: [],
          };
        }
      } else if (oldAssignment && oldAssignment !== null) {
        // Only create follow-up if there was an old assignment
        // Check if follow-up already exists to avoid duplicate history
        const shouldCreateFollowUp =
          !oldFollowUp || (!oldFollowUp.note && !oldFollowUp.date);

        if (shouldCreateFollowUp) {
          updateObj.$set.followUp = {
            note: `${completionNote}`,
            date: null,
            userId: assignmentCompletedFollowUp.userId,
          };

          // Create history entry for follow-up creation
          followUpHistoryEntry = {
            dateTime: data.dateTime || new Date().toISOString(),
            title: 'Followup Created',
            assignmentBy: userData?.id || '',
            note: {
              description: completionNote,
              date: '',
              rating: 0,
              userId: userData?.id || null,
            },
            currentInterviewer: null,
            previousInterviewer: null,
            attachments: [],
          };
        }
      }
    }

    if (
      'remarks' in data &&
      Array.isArray(data.remarks) &&
      data.remarks.length > 0
    ) {
      const existingRemarks = existingCandidate.remarks || [];
      if (JSON.stringify(existingRemarks) !== JSON.stringify(data.remarks)) {
        updateObj.$set.remarks = data.remarks;
      }
    }
    fieldsToTrack.forEach((key) => {
      if (
        key in data &&
        key === 'resume' &&
        JSON.stringify(existingCandidate[key]) !== JSON.stringify(data[key])
      ) {
        whatWasUpdated.push(key);
      }
      if (
        key in data &&
        key === 'customFields' &&
        JSON.stringify(existingCandidate[key]) !== JSON.stringify(data[key])
      ) {
        const customKeys = Object.keys(data.customFields);
        customKeys.forEach((customKey) => {
          const oldValue = existingCandidate.customFields?.[customKey];
          const newValue = data.customFields[customKey];
          if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
            whatWasUpdated.push(customKey);
          }
        });
      }
      if (
        key in data &&
        key !== 'resume' &&
        key !== 'customFields' &&
        key !== 'tags'
      ) {
        if (
          (key === 'currentCTC' || key === 'expectedCTC') &&
          userData.role &&
          userData.role === 'interviewer'
        ) {
          return;
        }
        if (
          JSON.stringify(existingCandidate[key]) !== JSON.stringify(data[key])
        ) {
          whatWasUpdated.push(key);
          updateObj.$set[key] = data[key];
          updates.push({
            title: `Updated ${key.charAt(0).toUpperCase() + key.slice(1)}`,
            previousValue: existingCandidate[key],
            currentValue: data[key],
          });
        }
      }
    });

    if (!Candidate || !History) {
      return NextResponse.json(
        { error: 'Database not connected' },
        { status: 404 },
      );
    }

    // console.log("$$$$$$$ UPDATED OBJ: ", updateObj);

    if (Object.keys(updateObj.$set).length > 0 || updateObj.$unset) {
      const updatedCandidate = (await Candidate.findByIdAndUpdate(
        id,
        updateObj,
        {
          new: true,
          // runValidators: true,
        },
      )
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
            path: 'followUp.userId',
            select: 'name email',
          },
          {
            path: 'jobId',
            select: '_id title description',
          },
        ])
        .lean()
        .exec()) as ICandidate;

      if (!updatedCandidate) {
        return NextResponse.json(
          { error: 'Candidate not found' },
          { status: 404 },
        );
      }

      // let candidateHistory = null;

      // Collect all history entries to push in a single query
      const historyEntriesToPush: ICandidateHistory[] = [];

      // Add field updates history entry if there are updates
      if (updates.length > 0) {
        historyEntriesToPush.push({
          dateTime: (data.dateTime || new Date().toISOString()) as string,
          title: `Updated ${whatWasUpdated.join(' & ')}`,
          previousInterviewer: null,
          currentInterviewer: null,
          assignmentBy: userData?.id || '',
          note: {
            description: updates,
            date: '',
            rating: 0,
            userId: userData?.id || null,
          },
          attachments: [...updates]
            .filter((item) => item.attachments)
            .flatMap((item) => item.attachments!),
        });
      }

      // Add follow-up history entry if assignment was completed
      if (followUpHistoryEntry) {
        historyEntriesToPush.push(followUpHistoryEntry);
      }

      // Push all history entries in a single query
      if (historyEntriesToPush.length > 0) {
        await History?.findOneAndUpdate(
          {
            candidateId: updatedCandidate._id,
            jobId: updatedCandidate.jobId?._id,
          },
          {
            $push: {
              history: {
                $each: historyEntriesToPush,
              },
            },
          },
          { upsert: true, new: true },
        );
      }
      // CRITICAL FIX: Use find() instead of findOne() to get ALL history documents
      // A candidate can have multiple History documents (one per job + batch upload with jobId: null)
      const historyDocuments = await History?.find({
        candidateId: updatedCandidate._id,
      })
        .populate([
          { path: 'history.assignmentBy', select: '_id name email' },
          { path: 'history.currentInterviewer', select: '_id name email' },
          { path: 'history.previousInterviewer', select: '_id name email' },
          { path: 'history.note.userId', select: '_id name email' },
        ])
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

      // Send notifications for various updates
      try {
        const jobInfo = updatedCandidate.jobId as IFJob;

        // Assignment notifications
        if ('assignment' in data) {
          const oldAssignment = existingCandidate.assignment;
          const newAssignment = data.assignment;

          if (newAssignment) {
            if (
              !oldAssignment ||
              JSON.stringify(oldAssignment) !== JSON.stringify(newAssignment)
            ) {
              // Fetch both old and new interviewers in parallel if needed
              const [newInterviewer, oldInterviewer] = await Promise.all([
                User?.findById(newAssignment.interviewerId).select(
                  '_id name email',
                ),
                oldAssignment?.interviewerId &&
                oldAssignment.interviewerId !== newAssignment.interviewerId
                  ? User?.findById(oldAssignment.interviewerId).select(
                      '_id name email',
                    )
                  : Promise.resolve(null),
              ]);

              if (newAssignment && newInterviewer) {
                // Check if interviewer changed
                const interviewerChanged =
                  oldAssignment &&
                  oldAssignment.interviewerId !== newAssignment.interviewerId;

                // Case 1: New assignment without time
                // Notify when:
                // - No old assignment exists (new assignment), OR
                // - Assignment changed from HR (with time) to interviewer (without time), OR
                // - Interviewer changed (reassignment to different interviewer)
                if (
                  !newAssignment.time &&
                  (!oldAssignment || interviewerChanged || oldAssignment?.time)
                ) {
                  await NotificationService.notifyCandidateAssigned({
                    organizationId,
                    candidateId: updatedCandidate._id?.toString() || '',
                    candidateName: updatedCandidate.name,
                    jobId:
                      jobInfo?._id?.toString() ||
                      updatedCandidate.jobId?.toString() ||
                      '',
                    jobTitle: jobInfo?.title || 'Unknown Job',
                    interviewerId: newAssignment.interviewerId,
                    interviewerName: newInterviewer.name,
                    triggerUserId: userData?.id?.toString() || '',
                    triggerUserName: userData?.name || '',
                  });
                }

                if (newAssignment && newAssignment.time) {
                  if (!oldAssignment || !oldAssignment.time) {
                    await NotificationService.notifyMeetingScheduled({
                      organizationId,
                      candidateId: updatedCandidate._id?.toString() || '',
                      candidateName: updatedCandidate.name,
                      jobId:
                        jobInfo?._id?.toString() ||
                        updatedCandidate.jobId?.toString() ||
                        '',
                      jobTitle: jobInfo?.title || 'Unknown Job',
                      interviewerId: newAssignment.interviewerId,
                      interviewerName: newInterviewer.name,
                      meetingDate: new Date(newAssignment.time),
                      triggerUserId: userData?.id?.toString() || '',
                      triggerUserName: userData?.name || '',
                    });
                  } else if (
                    String(oldAssignment.time.toISOString()) !==
                    newAssignment.time
                  ) {
                    await NotificationService.notifyMeetingUpdated({
                      organizationId,
                      candidateId: updatedCandidate._id?.toString() || '',
                      candidateName: updatedCandidate.name,
                      jobId:
                        jobInfo?._id?.toString() ||
                        updatedCandidate.jobId?.toString() ||
                        '',
                      jobTitle: jobInfo?.title || 'Unknown Job',
                      interviewerId: newAssignment.interviewerId,
                      interviewerName: newInterviewer.name,
                      meetingDate: new Date(newAssignment.time),
                      triggerUserId: userData?.id?.toString() || '',
                      triggerUserName: userData?.name || '',
                    });
                  }
                }

                // Handle meeting cancellation: when oldAssignment has time but newAssignment does not
                // If interviewer changed, notify the OLD interviewer; otherwise notify the current one
                if (oldAssignment?.time && !newAssignment.time) {
                  const interviewerToNotify = interviewerChanged
                    ? oldInterviewer
                    : newInterviewer;
                  if (interviewerToNotify) {
                    await NotificationService.notifyMeetingCancelled({
                      organizationId,
                      candidateId: updatedCandidate._id?.toString() || '',
                      candidateName: updatedCandidate.name,
                      jobId:
                        jobInfo?._id?.toString() ||
                        updatedCandidate.jobId?.toString() ||
                        '',
                      jobTitle: jobInfo?.title || 'Unknown Job',
                      interviewerId: interviewerToNotify._id.toString(),
                      interviewerName: interviewerToNotify.name,
                      triggerUserId: userData?.id?.toString() || '',
                      triggerUserName: userData?.name || '',
                    });
                  }
                }
              }
            }
          } else {
            const interviewer = await User?.findById(
              oldAssignment?.interviewerId,
            ).select('_id name email');
            if (
              newAssignment === null &&
              interviewer &&
              interviewer._id.toString() !== userData?.id?.toString()
            ) {
              await NotificationService.notifyCandidateUnassigned({
                organizationId,
                candidateId: updatedCandidate._id?.toString() || '',
                candidateName: updatedCandidate.name,
                jobId:
                  jobInfo?._id?.toString() ||
                  updatedCandidate.jobId?.toString() ||
                  '',
                jobTitle: jobInfo?.title || 'Unknown Job',
                previousInterviewerId: interviewer._id.toString(),
                previousInterviewerName: interviewer.name,
                triggerUserId: userData?.id?.toString() || '',
                triggerUserName: userData?.name || '',
              });
            } else if (newAssignment === null && interviewer) {
              await NotificationService.notifyInterviewCompleted({
                organizationId,
                candidateId: updatedCandidate._id?.toString() || '',
                candidateName: updatedCandidate.name,
                jobId:
                  jobInfo?._id?.toString() ||
                  updatedCandidate.jobId?.toString() ||
                  '',
                jobTitle: jobInfo?.title || 'Unknown Job',
                interviewerName: interviewer?.name || '',
                interviewerId: interviewer?._id?.toString() || '',
                triggerUserId: userData?.id?.toString() || '',
                triggerUserName: userData?.name || '',
              });
            }
          }
        }

        if (updates.length > 0) {
          // Only send if there are significant updates (not just tracking fields)
          const significantUpdates = updates.filter(
            (update) =>
              !update.title.includes('Updated tracking') &&
              !update.title.includes('Updated _id') &&
              !update.title.includes('Updated Status'),
          );

          if (significantUpdates.length > 0) {
            await NotificationService.notifyCandidateDetailsUpdated({
              organizationId,
              candidateId: updatedCandidate._id?.toString() || '',
              candidateName: updatedCandidate.name,
              jobId:
                jobInfo?._id?.toString() ||
                updatedCandidate.jobId?.toString() ||
                '',
              jobTitle: jobInfo?.title || 'Unknown Job',
              triggerUserId: userData?.id?.toString() || '',
              triggerUserName: userData?.name || '',
            });
          }
        }
      } catch (notificationError) {
        logger.error(
          'Failed to send candidate update notifications:',
          notificationError,
        );
        // Don't fail the API call if notification fails
      }
      const duplicateCount = await getDuplicateCountForCandidate(
        updatedCandidate,
        organizationId,
      );

      // Fire-and-forget broadcast - errors handled internally
      broadcastCandidateUpdate({
        ...updatedCandidate,
        history: candidateHistoryPopulated?.history,
      }).catch((error) => {
        logger.error({ error }, 'Failed to broadcast candidate update');
      });

      return NextResponse.json({
        ...updatedCandidate,
        history: candidateHistoryPopulated?.history,
        duplicateCount,
      });
    }

    const duplicateCount = await getDuplicateCountForCandidate(
      existingCandidate,
      organizationId,
    );

    return NextResponse.json({
      ...existingCandidate,
      duplicateCount,
    });
  } catch (error) {
    logger.error(error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Connect to database and authenticate in parallel
    const [{ id }, userData] = await Promise.all([
      params,
      getAuthenticatedUser(_request),
      connectToDatabase(),
    ]);

    if (!userData) {
      return NextResponse.json(
        { message: 'Unauthorised Access' },
        { status: 401 },
      );
    }

    if (!Candidate || !History) {
      return NextResponse.json(
        { error: 'Database models not available' },
        { status: 500 },
      );
    }

    // Validate candidate ID
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid candidate ID' },
        { status: 400 },
      );
    }

    // Optimize projection based on role
    const projection: ProjectionType<ICandidate> =
      userData?.role === 'interviewer'
        ? {
            currentCTC: 0,
            expectedCTC: 0,
          }
        : {};

    // Fetch candidate first to get jobId for history query
    const candidate = await Candidate.findById(id, projection)
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
          path: 'followUp.userId',
          select: 'name email',
        },
        {
          path: 'jobId',
          select: 'title description',
        },
      ])
      .lean()
      .exec();

    if (!candidate) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 },
      );
    }

    if (userData.role === 'candidate') {
      const candidateEmail = candidate.email?.toLowerCase();
      const userEmail = userData.email?.toLowerCase();

      if (candidateEmail !== userEmail) {
        return NextResponse.json(
          { error: "You cannot view other candidate's profile" },
          { status: 403 },
        );
      }
    }

    // Filter private custom fields based on role
    // This ensures candidates only see non-private fields, and interviewers only see non-privateInt fields
    let filteredCandidate = candidate;
    if (userData.role === 'candidate' || userData.role === 'interviewer') {
      const filtered = await getFilterPrivateCFSingle(
        candidate as ICandidate,
        userData.role,
        userData.organizationId,
      );
      if (filtered) {
        filteredCandidate = filtered as typeof candidate;
      }
    }

    // CRITICAL FIX: Use find() instead of findOne() to get ALL history documents
    // A candidate can have multiple History documents (one per job + batch upload with jobId: null)
    const populateFields = [
      { path: 'history.currentInterviewer', select: '_id name email' },
      { path: 'history.previousInterviewer', select: '_id name email' },
      { path: 'history.assignmentBy', select: '_id name email' },
      { path: 'history.note.userId', select: '_id name email' },
    ];

    const historyDocuments = await History.find({
      candidateId: filteredCandidate._id.toString(),
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

    const duplicateCount = await getDuplicateCountForCandidate(
      candidate,
      userData.organizationId,
    );

    return NextResponse.json({
      ...filteredCandidate,
      history: allHistory,
      duplicateCount,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Execute independent operations in parallel
    const [{ id }, { dateTime }, userData] = await Promise.all([
      params,
      _request.json(),
      getAuthenticatedUser(_request, 'admin'),
      connectToDatabase(),
    ]);

    // Validate candidate ID
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid candidate ID' },
        { status: 400 },
      );
    }

    if (!Candidate || !History) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 },
      );
    }

    // Fetch candidate with minimal fields needed for operation
    const candidate = await Candidate.findById(id)
      .select('_id jobId isDeleted')
      .lean()
      .exec();

    if (!candidate) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 },
      );
    }

    const historyEntry = {
      dateTime,
      title: candidate.isDeleted ? 'Unarchived' : 'Archived',
      previousInterviewer: null,
      currentInterviewer: null,
      assignmentBy: userData?.id,
    };

    // Execute history update and candidate update in parallel
    const [updatedHistory, deletedCandidate] = await Promise.all([
      History.findOneAndUpdate(
        { candidateId: candidate._id, jobId: candidate.jobId },
        {
          $push: { history: historyEntry },
        },
        { new: true },
      )
        .populate([
          { path: 'history.currentInterviewer', select: '_id name email' },
          { path: 'history.previousInterviewer', select: '_id name email' },
          { path: 'history.assignmentBy', select: '_id name email' },
          { path: 'history.note.userId', select: '_id name email' },
        ])
        .lean()
        .exec(),
      Candidate.findByIdAndUpdate(
        id,
        { isDeleted: !candidate.isDeleted },
        { new: true },
      )
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
            path: 'followUp.userId',
            select: 'name email',
          },
          {
            path: 'jobId',
            select: 'title description',
          },
        ])
        .lean()
        .exec(),
    ]);

    if (!deletedCandidate) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 },
      );
    }

    // Fire-and-forget broadcast - errors handled internally
    broadcastCandidateUpdate({
      ...deletedCandidate,
      history: updatedHistory?.history,
    }).catch((error) => {
      logger.error({ error }, 'Failed to broadcast candidate deletion');
    });

    return NextResponse.json({ message: 'Candidate deleted successfully' });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 },
    );
  }
}
