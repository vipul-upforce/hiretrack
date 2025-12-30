import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { User, Candidate, History } from '@/lib/mongodb';
import {
  handleCustomFieldFiles,
  handleFileAttachments,
  handleSingleFile,
} from '@/lib/fileUtils';
import { ICandidate as IExternalCandidate } from '@/lib/models/candidate';
import mongoose, { ProjectionType } from 'mongoose';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { IinfoUpdateLog } from '@/lib/models/history';
import { broadcastCandidateUpdate } from '@/lib/broadcast/broadCastCandidate';
import { ITag } from '@/lib/models/organization';
import { NotificationService } from '@/lib/notifications/notificationService';
import logger from '@/lib/logger';
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

    const updateObj: UpdateObject = {
      $set: {},
      $currentDate: { 'tracking.updatedAt': true },
    };

    let assignmentCompletedFollowUp = null;

    if ('assignment' in data) {
      if (data.assignment === null) {
        updateObj.$unset = { assignment: 1 };

        // Add follow-up entry to highlight assignment complete
        assignmentCompletedFollowUp = {
          note: `${userData?.name || 'Unknown User'} has completed the last step.`,
          date: null, // No specific follow-up date needed for completion note
          userId: userData?.id,
        };
      } else {
        updateObj.$set.assignment = data.assignment;
      }
    }
    const whatWasUpdated: string[] = [];
    if ('attachments' in data) {
      if (data.attachment === null) {
        updateObj.$unset = { attachments: 1 };
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
        updateObj.$unset = { resume: 1 };
      } else {
        updateObj.$set.resume = data.resume;
      }
    }
    if ('customFields' in data) {
      if (data.customFields === null) {
        updateObj.$unset = { customFields: 1 };
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
      console.log(
        '☀️☀️☀️☀️☀️☀️☀️☀️☀️☀️☀️☀️☀️☀️☀️☀️ FOllow Up in here',
        data.followUp,
      );
      updateObj.$set.followUp = data.followUp;
      const oldFollowUp = existingCandidate.followUp;
      const newFollowUp = data?.followUp;
      console.log(oldFollowUp, 'oldFollowUp');
      console.log(newFollowUp, 'newFollowUp');
      try {
        const jobInfo = existingCandidate.jobId as IFJob;

        // Follow-up notifications
        // if ("followUp" in data) {
        // Case 1: Follow-up Added
        if (!oldFollowUp && newFollowUp && newFollowUp.note !== null) {
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
          newFollowUp &&
          newFollowUp.note !== null &&
          newFollowUp.note !== oldFollowUp.note &&
          newFollowUp.date !== oldFollowUp.date
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
    // Assignment completed follow-up notifications
    if (assignmentCompletedFollowUp) {
      const completionNote = `${userData?.name || 'Unknown User'} has completed the last step.`;
      const oldAssignment = existingCandidate.assignment;
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
      } else if (oldAssignment && oldAssignment !== null) {
        updateObj.$set.followUp = {
          note: `${completionNote}`,
          date: null,
          userId: assignmentCompletedFollowUp.userId,
        };
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

      if (updates.length > 0) {
        const historyEntry = {
          dateTime: data.dateTime || new Date(),
          title: `Updated ${whatWasUpdated.join(' & ')}`,
          previousInterviewer: null,
          currentInterviewer: null,
          assignmentBy: userData?.id,
          note: {
            description: updates,
          },
          attachments: [...updates]
            .filter((item) => item.attachments)
            .flatMap((item) => item.attachments!),
        };

        // console.log("USERDATA>ID:", userData.id);

        await History?.findOneAndUpdate(
          {
            candidateId: updatedCandidate._id,
            jobId: updatedCandidate.jobId?._id,
          },
          {
            $push: { history: historyEntry },
          },
          { new: true },
        );
      }
      const candidateHistory = await History?.findOne({
        candidateId: updatedCandidate._id,
        jobId: updatedCandidate.jobId?._id,
      });
      const candidateHistoryPopulated = await candidateHistory?.populate([
        { path: 'history.assignmentBy', select: '_id name email' },
        { path: 'history.currentInterviewer', select: '_id name email' },
        { path: 'history.previousInterviewer', select: '_id name email' },
        { path: 'history.note.userId', select: '_id name email' },
      ]);

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
              const interviewer = await User?.findById(
                newAssignment.interviewerId,
              ).select('_id name email');

              if (newAssignment && interviewer) {
                if (!newAssignment.time && !oldAssignment) {
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
                    interviewerName: interviewer.name,
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
                      interviewerName: interviewer.name,
                      meetingDate: new Date(newAssignment.time),
                      triggerUserId: userData?.id?.toString() || '',
                      triggerUserName: userData?.name || '',
                    });
                  } else if (oldAssignment.time !== newAssignment.time) {
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
                      interviewerName: interviewer.name,
                      meetingDate: new Date(newAssignment.time),
                      triggerUserId: userData?.id?.toString() || '',
                      triggerUserName: userData?.name || '',
                    });
                  }
                }

                // New: Handle case where oldAssignment has time but newAssignment does not
                if (oldAssignment?.time && !newAssignment.time && interviewer) {
                  await NotificationService.notifyMeetingCancelled({
                    organizationId,
                    candidateId: updatedCandidate._id?.toString() || '',
                    candidateName: updatedCandidate.name,
                    jobId:
                      jobInfo?._id?.toString() ||
                      updatedCandidate.jobId?.toString() ||
                      '',
                    jobTitle: jobInfo?.title || 'Unknown Job',
                    interviewerId: interviewer._id.toString(),
                    interviewerName: interviewer.name,
                    triggerUserId: userData?.id?.toString() || '',
                    triggerUserName: userData?.name || '',
                  });
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
            } else {
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
      broadcastCandidateUpdate({
        ...updatedCandidate,
        history: candidateHistoryPopulated?.history,
      });
      return NextResponse.json({
        ...updatedCandidate,
        history: candidateHistoryPopulated?.history,
      });
    }

    return NextResponse.json(existingCandidate);
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

    // Extract jobId for history query
    const jobId =
      typeof candidate.jobId === 'object' &&
      candidate.jobId !== null &&
      '_id' in candidate.jobId
        ? candidate.jobId._id
        : candidate.jobId;

    // Fetch history in parallel (if candidate has jobId)
    const history = jobId
      ? await History.findOne({
          jobId,
          candidateId: candidate._id.toString(),
        })
          .populate([
            { path: 'history.currentInterviewer', select: '_id name email' },
            { path: 'history.previousInterviewer', select: '_id name email' },
            { path: 'history.assignmentBy', select: '_id name email' },
            { path: 'history.note.userId', select: '_id name email' },
          ])
          .lean()
          .exec()
      : null;

    return NextResponse.json({
      ...candidate,
      history: history?.history || [],
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

    broadcastCandidateUpdate({
      ...deletedCandidate,
      history: updatedHistory?.history,
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
