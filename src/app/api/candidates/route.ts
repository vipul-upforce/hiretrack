import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, {
  History,
  Job,
  Organization,
  Candidate,
  DuplicateCandidate,
} from '@/lib/mongodb';
import {
  handleCustomFieldFiles,
  handleSingleFile,
  handleFileAttachments,
} from '@/lib/fileUtils';
import mongoose from 'mongoose';
import { AuthenticatedUser, getAuthenticatedUser } from '@/app/actions/auth';
import { broadcastCandidateUpdate } from '@/lib/broadcast/broadCastCandidate';
// import { NotificationService } from '@/lib/notifications/notificationService';
// import { sendSmartNotification } from '@/lib/services/unifiedEmailService';
// import { getMappedEmailTemplate } from '@/lib/notifications/email/getMappedEmailTemplate';
// import { NotificationType } from '@/lib/services/emailDecisionEngine';
import { logger } from '@/lib/logger/logger.server';

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorised Access' },
        { status: 401 },
      );
    }
    const { searchParams } = new URL(request.url);
    const jobId = searchParams?.get('jobId');

    await connectToDatabase();
    if (!Candidate) {
      return NextResponse.json(
        { error: 'Candidate Model not found' },
        { status: 404 },
      );
    }

    // Filter by organization and jobId if provided
    const query: { organizationId: string; jobId?: string } = {
      organizationId: user?.organizationId || '',
    };
    if (jobId) {
      query.jobId = jobId;
    }

    const candidates = await Candidate.find(query)
      .sort({
        'tracking.createdAt': -1,
      })
      .lean()
      .exec();
    return NextResponse.json(candidates);
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: 'An Unknwon error occured.' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const data = await request.json();
    const userData = await getAuthenticatedUser(request);

    if (userData) {
      const { organizationId, fileStorage } = userData as AuthenticatedUser;

      //  File Size Validation (Resume & Attachments)
      const userRole = userData.role || '';

      // Determine limit: 3MB for Candidates/Guests, 50MB for others
      const maxFileSize =
        userRole === 'candidate' || userRole === ''
          ? 3 * 1024 * 1024 // 3MB
          : 50 * 1024 * 1024; // 50MB

      const limitLabel = maxFileSize === 3 * 1024 * 1024 ? '3MB' : '50MB';

      // Validate Resume
      if (data.resume && data.resume.size) {
        if (data.resume.size > maxFileSize) {
          return NextResponse.json(
            { error: `Resume size exceeds ${limitLabel} limit.` },
            { status: 400 },
          );
        }
      }

      // Validate Attachments
      if (data.attachments && Array.isArray(data.attachments)) {
        for (const attachment of data.attachments) {
          if (attachment.size && attachment.size > maxFileSize) {
            return NextResponse.json(
              {
                error: `File "${attachment.name}" exceeds ${limitLabel} limit.`,
              },
              { status: 400 },
            );
          }
        }
      }

      const organizationInfo = await Organization?.findById(
        new mongoose.Types.ObjectId(organizationId),
      );
      if (!organizationInfo) {
        return NextResponse.json(
          { error: 'Organization not found' },
          { status: 404 },
        );
      }
      const candidateStatus = (
        organizationInfo.defaultLanes || ['applied']
      ).includes('applied')
        ? 'applied'
        : (organizationInfo.defaultLanes || ['applied'])[0];

      if (data.attachments) {
        const images = data.attachments.filter((attachment: Attachment) =>
          attachment.type.startsWith('image'),
        );
        const files = data.attachments.filter(
          (attachment: Attachment) => !attachment.type.startsWith('image'),
        );
        data.attachments = { images, files };
        const { files: f, images: i } = await handleFileAttachments(
          data.attachments,
          fileStorage!,
          organizationId,
        );
        data.attachments = [...f, ...i];
      }

      if (data.resume) {
        data.resume = await handleSingleFile(
          data.resume,
          fileStorage!,
          organizationId,
        );
      }

      if (data.customFields) {
        const cs = await handleCustomFieldFiles(
          data.customFields,
          fileStorage!,
          organizationId,
        );
        data.customFields = cs;
      }
      const isJobExisted = await Job?.exists({ _id: data.jobId });
      if (!isJobExisted) {
        return NextResponse.json({ error: 'JobId not found' }, { status: 404 });
      }

      const candidateData = {
        jobId: data.jobId,
        organizationId,
        name: data.name,
        email: data.email || '',
        contact: data.contact || '',
        location: data.location,
        experience: data.experience,
        relevantExperience: data.relevantExperience,
        skills: data.skills,
        expectedCTC: data.expectedCTC,
        currentCTC: data.currentCTC,
        noticePeriod: data.noticePeriod,
        status: candidateStatus,
        remarks: data.remarks || [],
        tracking: {
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        // Handle assignment data - explicitly set to null if invalid
        assignment:
          data.assignment &&
          data.assignment.interviewerId !== '-1' &&
          data.assignment.interviewerId !== '' &&
          data.assignment.interviewerId
            ? {
                interviewerId: data.assignment.interviewerId,
                googleMeet: null,
                assignedAt: new Date(),
                ...(data.assignment.time && {
                  time: new Date(data.assignment.time),
                }),
              }
            : null,
        // Handle file data
        ...(data.resume
          ? {
              resume: {
                id: data.resume.id,
                name: data.resume.name,
                url: data.resume.url,
                type: data.resume.type,
                size: data.resume.size,
              },
            }
          : null),
        // Handle attachments array
        attachments: data.attachments.map((attachment: Attachment) => ({
          id: attachment.id,
          name: attachment.name,
          url: attachment.url,
          type: attachment.type,
          size: attachment.size,
        })),
        customFields: data.customFields,
      };

      if (!Candidate) {
        return NextResponse.json(
          { error: 'Candidate not found' },
          { status: 404 },
        );
      }
      const candidate = await Candidate.create(candidateData);

      let duplicateCount = 0;
      if (candidate.email && candidate.organizationId) {
        try {
          const updatedDuplicateDoc =
            await DuplicateCandidate?.findOneAndUpdate(
              {
                email: candidate.email.toLowerCase(),
                orgId: candidate.organizationId,
              },
              {
                $addToSet: {
                  duplicates: {
                    candidateId: candidate._id,
                    jobId: candidate.jobId || null,
                  },
                },
              },
              { upsert: true, new: true, lean: true },
            );

          if (updatedDuplicateDoc && updatedDuplicateDoc.duplicates) {
            duplicateCount = updatedDuplicateDoc.duplicates.length;
          }
        } catch (error) {
          logger.error({ error }, 'Failed to update duplicate candidates');
        }
      }

      const candidateCreated = await candidate.populate(
        'assignment.interviewerId',
        'name email',
      );

      const sanitizedCandidate = {
        ...candidateCreated.toObject(),
        duplicateCount,
      };

      let candidateHistory = null;
      if (userData.role === 'candidate' || userData.role === '') {
        candidateHistory = await History?.create({
          candidateId: candidate._id,
          jobId: data.jobId,
          history: [
            {
              dateTime: data.dateTime,
              title: 'Self Applied',
              previousInterviewer: null,
              currentInterviewer: null,
              assignmentBy: userData.id,
            },
          ],
        });
        candidateHistory = await candidateHistory?.populate(
          'history.assignmentBy',
          '_id name email',
        );
      } else {
        candidateHistory = await History?.create({
          candidateId: candidate._id,
          jobId: data.jobId,
          history: [
            {
              dateTime: data.dateTime,
              title: 'Candidate Added',
              previousInterviewer: null,
              currentInterviewer: null,
              assignmentBy: userData.id,
            },
          ],
        });
        candidateHistory = await candidateHistory?.populate(
          'history.assignmentBy',
          '_id name email',
        );
      }

      // Fire-and-forget broadcast - errors handled internally
      broadcastCandidateUpdate({
        ...sanitizedCandidate,
        history: candidateHistory?.history,
      }).catch((error) => {
        logger.error({ error }, 'Failed to broadcast candidate creation');
      });

      return NextResponse.json(sanitizedCandidate, { status: 201 });
    }
    return NextResponse.json(
      { message: 'Unauthorised Access' },
      { status: 401 },
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { error: 'An Unknown error occurred.' },
      { status: 500 },
    );
  }
}
