import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, {
  History,
  Organization,
  Job,
  Candidate,
} from '@/lib/mongodb';
import {
  handleCustomFieldFiles,
  handleSingleFile,
  handleFileAttachments,
} from '@/lib/fileUtils';
import mongoose from 'mongoose';
import {
  validateInput,
  VALIDATION_PATTERNS,
  MAX_LENGTHS,
  sanitizeString,
} from '@/lib/inputValidation';
// import { NotificationService } from '@/lib/notifications/notificationService';
// import { sendSmartNotification } from "@/lib/unifiedEmailService";
// import { getMappedEmailTemplate } from '@/lib/notifications/email/getMappedEmailTemplate';
// import { NotificationType } from '@/lib/services/emailDecisionEngine';
// import { sendSmartNotification } from '@/lib/services/unifiedEmailService';
// import { logger } from '@/lib/logger/logger.server';
import { Attachment } from '../route';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const data = await request.json();

    // SECURITY FIX: Validate guest application input
    const validation = validateInput(data, {
      jobId: {
        required: true,
        type: 'object',
        customValidator: (value) =>
          value &&
          typeof value._id === 'string' &&
          /^[0-9a-fA-F]{24}$/.test(value._id),
      },
      name: {
        required: true,
        type: 'string',
        maxLength: MAX_LENGTHS.name,
        pattern: VALIDATION_PATTERNS.safeString,
        sanitize: true,
      },
      email: {
        required: true,
        type: 'email',
        maxLength: MAX_LENGTHS.email,
      },
      contact: {
        required: true,
        type: 'string',
        maxLength: 20,
        pattern: VALIDATION_PATTERNS.contact,
      },
      dateTime: {
        type: 'string',
        maxLength: 50,
      },
      customFields: {
        type: 'object',
      },
    });

    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: 'Invalid application data',
          details: validation.errors,
        },
        { status: 400 },
      );
    }

    // Sanitize string inputs
    if (data.name) data.name = sanitizeString(data.name);
    if (data.customFields) {
      Object.keys(data.customFields).forEach((key) => {
        if (typeof data.customFields[key] === 'string') {
          data.customFields[key] = sanitizeString(data.customFields[key]);
        }
      });
    }

    const { jobId, dateTime } = data;
    if (!Job) {
      throw new Error('Database not connected');
    }
    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 },
      );
    }

    const job = await Job.findById(new mongoose.Types.ObjectId(jobId._id))
      .select('title organizationId')
      .lean()
      .exec();

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const { organizationId } = job;

    const organizationInfo = await Organization?.findById(organizationId)
      .select('defaultLanes')
      .lean()
      .exec();

    if (!organizationInfo) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 },
      );
    }

    const fileStorage = 'local';
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
        fileStorage,
        String(organizationId),
      );
      data.attachments = [...f, ...i];
    }

    if (data.resume) {
      data.resume = await handleSingleFile(
        data.resume,
        fileStorage,
        String(organizationId),
      );
    }

    if (data.customFields) {
      const cs = await handleCustomFieldFiles(
        data.customFields,
        fileStorage,
        String(organizationId),
      );
      data.customFields = cs;
    }

    const candidateData = {
      jobId: data.jobId,
      organizationId,
      name: data.name,
      location: data.location,
      experience: data.experience,
      relevantExperience: data.relevantExperience,
      skills: data.skills,
      expectedCTC: data.expectedCTC,
      currentCTC: data.currentCTC,
      noticePeriod: data.noticePeriod,
      contact: data.contact,
      status: candidateStatus,
      remarks: data.remarks || [],
      tracking: {
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      ...(data.assignment && data.assignment.interviewerId !== '-1'
        ? {
            assignment: {
              interviewerId: data.assignment.interviewerId,
              assignedAt: new Date(),
              ...(data.assignment.time && {
                time: new Date(data.assignment.time),
              }),
            },
          }
        : null),
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
      attachments: (data.attachments || []).map((attachment: Attachment) => ({
        id: attachment.id,
        name: attachment.name,
        url: attachment.url,
        type: attachment.type,
        size: attachment.size,
      })),
      customFields: data.customFields || {},
      email: data.email || '',
      source: 'guest-apply',
    };

    if (!Candidate) {
      return NextResponse.json(
        { error: 'Candidate model not found' },
        { status: 500 },
      );
    }

    const candidate = await Candidate.create(candidateData);

    // Populate the interviewer details before sending response
    if (candidate.assignment && candidate.assignment.interviewerId) {
      await candidate.populate('assignment.interviewerId', 'name email');
    }

    // const historyCreated =
    await History?.create({
      candidateId: candidate?._id,
      jobId,
      history: [
        {
          dateTime,
          title: 'Self Applied',
          previousInterviewer: null,
          currentInterviewer: null,
          assignmentBy: null,
        },
      ],
    });

    // Trigger notification for candidate application (guest apply)
    // try {
    //   await NotificationService.notifyCandidateApplied({
    //     organizationId: organizationId.toString(),
    //     candidateId: candidate._id.toString(),
    //     candidateName: candidateData.name,
    //     candidateEmail: candidateData.email,
    //     jobId: jobId._id,
    //     jobTitle: job.title || 'Unknown Job',
    //     // No trigger user for guest applications
    //   });

    //   // Send email notification to admin and HR users
    //   try {
    //     const { emailContent, emailSubject } = await getMappedEmailTemplate(
    //       'job-application-hr',
    //       {
    //         jobTitle: job.title || 'Unknown Job',
    //         candidateName: candidateData.name,
    //         candidateEmail: candidateData.email,
    //         candidatePhone: candidateData.contact || 'N/A',
    //         applicationDate: new Date().toLocaleDateString(),
    //         dashboardLink: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/jobs/${jobId._id}?candidateId=${candidate._id}`,
    //       },
    //       organizationId.toString(),
    //     );

    //     // Get admin and HR user IDs for email notification
    //     const adminHrIds = await NotificationService.getUsersByRole(
    //       organizationId.toString(),
    //       ['admin', 'hr'],
    //     );

    //     if (adminHrIds.length > 0) {
    //       await sendSmartNotification(
    //         organizationId.toString(),
    //         // "newApplications",
    //         NotificationType.NEW_APPLICATIONS,
    //         {
    //           jobId: jobId._id,
    //           candidateId: candidate._id.toString(),
    //           eventType: 'job_application',
    //           templateUsed: 'job-application-hr',
    //         },
    //         {
    //           subject: emailSubject,
    //           html: emailContent,
    //         },
    //         adminHrIds,
    //       );
    //     }
    //   } catch (emailError) {
    //     logger.error(
    //       { emailError },
    //       'Failed to send guest email notification:',
    //     );
    //   }
    // } catch (notificationError) {
    //   logger.error({ notificationError }, 'Failed to send guest notification');
    // }

    return NextResponse.json(candidate, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: 'An unknown error occurred' },
      { status: 500 },
    );
  }
}
