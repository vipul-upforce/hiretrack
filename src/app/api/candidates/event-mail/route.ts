import { NextRequest, NextResponse } from 'next/server';
import { sendSmartNotification } from '@/lib/unifiedEmailService'; // Import sendSmartNotificationEmail
import connectToDatabase, {
  Candidate,
  Organization,
  Settings,
  User,
  EmailHistory,
} from '@/lib/mongodb';
import { ICandidate } from '@/lib/models/candidate';
import mongoose from 'mongoose';
import { getFormattedDate } from '@/components/timezoneFormat/getFormattedTZ';
import { getMappedEmailTemplate } from '@/app/actions/getMappedEmailTemplate';
import { getAuthenticatedUser } from '@/app/actions/auth';
import { NotificationType } from '@/lib/services/emailDecisionEngine';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const { candidateId } = await req.json();

    // Get user information from token

    const user = await getAuthenticatedUser(req);
    const senderEmail = user?.email;
    const senderUserId = user?.id;
    const senderName = user?.name;
    if (!Candidate || !User) {
      throw new Error('Database not connected');
    }

    // Get candidate data
    const candidateData = await Candidate.findById(candidateId)
      .select('name email contact organizationId jobId')
      .populate({
        path: 'jobId',
        select: 'title description',
      })
      .lean();

    // console.log("############# candidateData: ", candidateData);

    if (!candidateData || !Organization) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 },
      );
    }

    const { name, email, contact } = candidateData as ICandidate;
    const { organizationId } = candidateData;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is missing.' },
        { status: 400 },
      );
    }
    const candidateObjectId = new mongoose.Types.ObjectId(candidateId);
    const organizationObjectId = new mongoose.Types.ObjectId(
      organizationId.toString(),
    );

    const [orgData, hrUsers, settings] = await Promise.all([
      Organization.findById(organizationObjectId).select('name').lean().exec(),
      User.find({
        organizationId: organizationObjectId,
        role: { $in: ['hr', 'admin'] },
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      })
        .select('_id name email')
        .lean(),
      Settings.findOne({
        organizationId: organizationObjectId,
      })
        .select('mailConfig')
        .lean(),
    ]);

    const orgName = orgData?.name || '';

    // Get job information
    const jobName = (typeof candidateData.jobId === 'object'
        && 'title' in candidateData.jobId
        && (candidateData.jobId?.title as string))
      || 'Not specified';
    const candidateName = name;
    const status = 'Applied';

    // Prepare candidate email content
    const eventTitle = 'Application Successful';

    if (!email || !eventTitle) {
      return NextResponse.json(
        { error: 'Email and event title are required.' },
        { status: 400 },
      );
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format.' },
        { status: 400 },
      );
    }

    // const candidateHtmlContent = loadTemplate("job-application-(candidate)", {
    //   orgName,
    //   eventTitle,
    //   name,
    //   jobName,
    //   candidateName,
    //   status,
    // });

    // Find all HR users in the organization
    const hrEmails: string[] = hrUsers.map((user) => user.email);
    const hrUserIds: string[] = hrUsers.map((user) => user._id.toString());

    const applicationDate = (await getFormattedDate(
      req,
      new Date(),
      false,
      organizationId,
    )) as string;

    const {
      emailContent: candidateEmailContent,
      emailSubject: candidateEmailSubject,
    } = await getMappedEmailTemplate(
      'job-application-hr',
      {
        orgName,
        hrNotificationTitle: `${candidateName} applied for ${jobName}`,
        status,
        candidateEmail: email,
        candidateName,
        jobTitle: jobName,
        applicationDate,
        candidatePhone: contact || 'N/A',
        dashboardLink: `${req.headers.get('Origin')}/candidate/${candidateId}`,
      },
      organizationId,
    );

    if (!settings || !settings.mailConfig) {
      return NextResponse.json(
        { error: 'Mail configuration not found' },
        { status: 500 },
      );
    }

    const fromEmail = settings.mailConfig.resend_from
      || settings.mailConfig.brevo_from
      || settings.mailConfig.smtp_from
      || 'system@hiretrack.com';

    const systemUser = await User.findOneAndUpdate(
      { email: fromEmail, organizationId },
      {
        $setOnInsert: {
          name: 'HireTrack System',
          email: fromEmail,
          role: 'system',
          organizationId,
        },
      },
      { upsert: true, new: true },
    );

    // Create history record for candidate
    const candidateHistory = await EmailHistory.create({
      organizationId: organizationObjectId,
      sentBy: systemUser._id,
      sentByEmail: systemUser.email,
      sentByName: systemUser.name,
      recipientType: 'Candidate',
      recipientId: candidateObjectId,
      recipientEmail: email,
      recipientName: candidateName,
      subject: candidateEmailSubject,
      body: candidateEmailContent,
      cc: [],
      bcc: hrEmails,
      replyTo: systemUser.email,
      attachments: [],
      status: 'pending',
      provider: settings.mailConfig.mailProvider || 'unknown',
      metadata: {
        candidateId: candidateObjectId,
        templateUsed: 'job-application-hr',
        eventType: 'job_application',
      },
    });

    const hrHistoryPayload = hrEmails.map((hrEmail) => {
      const hrUser = hrUsers.find((user) => user.email === hrEmail);
      return {
        organizationId: organizationObjectId,
        sentBy: systemUser._id,
        sentByEmail: systemUser.email,
        sentByName: systemUser.name,
        recipientType: 'user',
        recipientId: hrUser?._id || new mongoose.Types.ObjectId(),
        recipientEmail: hrEmail,
        recipientName: hrUser?.name || hrEmail,
        subject: candidateEmailSubject,
        body: candidateEmailContent,
        cc: [],
        bcc: [],
        replyTo: systemUser.email,
        attachments: [],
        status: 'pending',
        provider: settings.mailConfig.mailProvider || 'unknown',
        metadata: {
          candidateId: candidateObjectId,
          templateUsed: 'job-application-hr',
          eventType: 'job_application',
        },
      };
    });

    const hrHistoryRecords = hrHistoryPayload.length
      ? await EmailHistory.insertMany(hrHistoryPayload, { ordered: false })
      : [];
    // console.log(candidateData.jobId._id.toString(), "candidateData==77b");

    type EmailDispatchResult = {
      status: number;
      message?: string;
    };

    let emailStatus: EmailDispatchResult = {
      status: 202,
      message: 'Pending notification dispatch',
    };
    // try {
    //   emailStatus = await sendSmartNotificationEmail(
    //     organizationId,
    //     "newApplications",
    //     {
    //       triggererUserId: senderUserId,
    //       triggererEmail: senderEmail,
    //       triggererName: senderName,
    //       jobId: candidateData.jobId._id.toString() || "",
    //       candidateId: candidateId,
    //       eventType: "job_application",
    //       templateUsed: "job-application-hr",
    //     },
    //     {
    //       subject: candidateEmailSubject,
    //       html: candidateEmailContent,
    //     },
    //     [...hrUserIds, candidateId] // Include candidate and HR/admin user IDs
    //   );
    //   console.log("✅ Email notification sent successfully");
    // } catch (emailError) {
    //   console.error("❌ Failed to send email notification:", emailError);
    //   emailStatus = {
    //     status: 500,
    //     message:
    //       emailError instanceof Error
    //         ? emailError.message
    //         : "Failed to send email",
    //   };
    // }

    // Update all history records based on the result

    // Inside the try block where sendSmartNotificationEmail is called
    try {
      const jobId = (
          candidateData.jobId as {
            _id: string;
            title: string;
            description: string;
          }
      )._id.toString() || '';
      emailStatus = await sendSmartNotification(
        organizationId,
        NotificationType.NEW_APPLICATIONS,
        {
          triggererUserId: senderUserId || candidateId,
          triggererEmail: senderEmail,
          triggererName: senderName,
          jobId,
          candidateId,
          eventType: 'job_application',
          templateUsed: 'job-application-hr',
        },
        {
          subject: candidateEmailSubject,
          html: candidateEmailContent,
        },
        [...hrUserIds, candidateId],
      );
    } catch (emailError) {
      console.error('❌ Failed to send email notification:', emailError);
      emailStatus = {
        status: 500,
        message:
          emailError instanceof Error
            ? emailError.message
            : 'Failed to send email',
      };
    }
    const historyUpdatePayload = {
      status: emailStatus.status === 200 ? 'sent' : 'failed',
      sentAt: emailStatus.status === 200 ? new Date() : undefined,
      error: emailStatus.status !== 200 ? emailStatus.message : undefined,
    };

    await Promise.all([
      EmailHistory.findByIdAndUpdate(candidateHistory._id, historyUpdatePayload),
      hrHistoryRecords.length
        ? EmailHistory.updateMany(
          { _id: { $in: hrHistoryRecords.map((record) => record._id) } },
          historyUpdatePayload,
        )
        : Promise.resolve(),
    ]);

    // Prepare response
    if (emailStatus.status === 200) {
      return NextResponse.json({ message: 'Email sent successfully' });
    }
    return NextResponse.json(
      {
        error: emailStatus.message || 'Failed to send email',
      },
      { status: emailStatus.status },
    );
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Unknown Error Occurred',
      },
      { status: 500 },
    );
  }
}
