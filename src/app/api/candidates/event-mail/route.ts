import { NextRequest, NextResponse } from "next/server";
import { sendMail } from "@/app/api/event-mail";
import {
  Candidate,
  Organization,
  Settings,
  User,
  EmailHistory,
} from "@/lib/mongodb";
import { ICandidate } from "@/lib/models/candidate";
import mongoose from "mongoose";
import { getFormattedDate } from "@/components/timezoneFormat/getFormattedTZ";
import { getMappedEmailTemplate } from "@/app/actions/getMappedEmailTemplate";

export async function POST(req: NextRequest) {
  try {
    const { candidateId } = await req.json();
    if (!Candidate || !User) {
      throw new Error("Database not connected");
    }

    // Get candidate data
    const candidateData = await Candidate.findOne({
      _id: candidateId,
    }).populate({
      path: "jobId",
      select: "title",
    });

    // console.log("############# candidateData: ", candidateData);

    if (!candidateData || !Organization) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }

    const { name, email, contact } = candidateData as ICandidate;
    const organizationId = candidateData.organizationId;

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is missing." },
        { status: 400 }
      );
    }
    const orgData = await Organization.findById(organizationId);
    let orgName = "";
    if (orgData) {
      orgName = orgData.name;
    }

    // Get job information
    const jobName =
      (typeof candidateData.jobId === "object" &&
        "title" in candidateData.jobId &&
        (candidateData.jobId?.title as string)) ||
      "Not specified";
    const candidateName = name;
    const status = "Applied";

    // Prepare candidate email content
    const eventTitle = "Application Successful";

    if (!email || !eventTitle) {
      return NextResponse.json(
        { error: "Email and event title are required." },
        { status: 400 }
      );
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format." },
        { status: 400 }
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
    const hrUsers = await User.find({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      role: { $in: ["hr", "admin"] },
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
    })
      .select("email")
      .lean();

    const hrEmails: string[] = [];
    hrUsers?.map((user) => {
      hrEmails.push(user.email);
    });

    const applicationDate = (await getFormattedDate(
      req,
      new Date(),
      false,
      organizationId
    )) as string;

    console.log("⛔⛔⛔ EMAILS: ", email);

    // Prepare candidate confirmation email
    const {
      emailContent: candidateEmailContent,
      emailSubject: candidateEmailSubject,
    } = await getMappedEmailTemplate(
      "job-application-hr",
      {
        orgName,
        hrNotificationTitle: `${candidateName} applied for ${jobName}`,
        status,
        candidateEmail: email,
        candidateName,
        jobTitle: jobName,
        applicationDate,
        candidatePhone: contact,
        dashboardLink: `${req.headers.get("Origin")}/candidate/${candidateId}`,
      },
      organizationId
    );

    const settings = await Settings.findOne({
      organizationId: new mongoose.Types.ObjectId(organizationId),
    }).lean();
    if (!settings || !settings.mailConfig) {
      return NextResponse.json(
        { error: "Mail configuration not found" },
        { status: 500 }
      );
    }

    const fromEmail =
      settings.mailConfig.resend_from ||
      settings.mailConfig.brevo_from ||
      settings.mailConfig.smtp_from ||
      "system@hiretrack.com";

    const systemUser = await User.findOneAndUpdate(
      { email: fromEmail, organizationId },
      {
        $setOnInsert: {
          name: "HireTrack System",
          email: fromEmail,
          role: "system",
          organizationId,
        },
      },
      { upsert: true, new: true }
    );

    // Create history record for candidate
    const candidateHistory = await EmailHistory.create({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      sentBy: systemUser._id,
      sentByEmail: systemUser.email,
      sentByName: systemUser.name,
      recipientType: "Candidate",
      recipientId: new mongoose.Types.ObjectId(candidateId),
      recipientEmail: email,
      recipientName: candidateName,
      subject: candidateEmailSubject,
      body: candidateEmailContent,
      cc: [],
      bcc: hrEmails,
      replyTo: systemUser.email,
      attachments: [],
      status: "pending",
      provider: settings.mailConfig.mailProvider || "unknown",
      metadata: {
        candidateId: new mongoose.Types.ObjectId(candidateId),
        templateUsed: "job-application-hr",
        eventType: "job_application",
      },
    });

    // Create history records for BCC recipients (HR/Admins)
    const hrHistoryPromises = hrEmails.map(async (hrEmail) => {
      try {
        const hrUser = await User.findOne({
          email: hrEmail,
          organizationId: new mongoose.Types.ObjectId(organizationId),
        })
          .select("_id name")
          .lean();

        return await EmailHistory.create({
          organizationId: new mongoose.Types.ObjectId(organizationId),
          sentBy: systemUser._id,
          sentByEmail: systemUser.email,
          sentByName: systemUser.name,
          recipientType: "user",
          recipientId: hrUser?._id || new mongoose.Types.ObjectId(),
          recipientEmail: hrEmail,
          recipientName: hrUser?.name || hrEmail,
          subject: candidateEmailSubject,
          body: candidateEmailContent,
          cc: [],
          bcc: [],
          replyTo: systemUser.email,
          attachments: [],
          status: "pending",
          provider: settings.mailConfig.mailProvider || "unknown",
          metadata: {
            candidateId: new mongoose.Types.ObjectId(candidateId),
            templateUsed: "job-application-hr",
            eventType: "job_application",
          },
        });
      } catch (error) {
        console.error(`Failed to create history for ${hrEmail}:`, error);
        return null;
      }
    });

    const hrHistoryRecords = await Promise.all(hrHistoryPromises);
    const validHrHistory = hrHistoryRecords.filter((record) => record !== null);

    // Use the legacy sendMail function which properly handles BCC
    // First email in array becomes TO, rest become BCC
    const candidateEmailStatus = await sendMail(
      organizationId,
      [email, ...hrEmails], // First email is TO, rest are BCC
      candidateEmailSubject,
      candidateEmailContent
    );

    // Update all history records based on the result
    const updatePromises = [];

    // Update candidate history
    updatePromises.push(
      EmailHistory.findByIdAndUpdate(candidateHistory._id, {
        status: candidateEmailStatus.status === 200 ? "sent" : "failed",
        sentAt: candidateEmailStatus.status === 200 ? new Date() : undefined,
        error:
          candidateEmailStatus.status !== 200
            ? candidateEmailStatus.message
            : undefined,
      })
    );

    // Update HR history records
    updatePromises.push(
      ...validHrHistory.map(async (historyRecord) => {
        if (historyRecord) {
          return EmailHistory.findByIdAndUpdate(historyRecord._id, {
            status: candidateEmailStatus.status === 200 ? "sent" : "failed",
            sentAt:
              candidateEmailStatus.status === 200 ? new Date() : undefined,
            error:
              candidateEmailStatus.status !== 200
                ? candidateEmailStatus.message
                : undefined,
          });
        }
      })
    );

    await Promise.all(updatePromises);
    console.log("candidateEmailStatus", candidateEmailStatus);

    // Prepare response
    if (candidateEmailStatus.status === 200) {
      return NextResponse.json({ message: "Email sent successfully" });
    } else {
      return NextResponse.json(
        {
          error: candidateEmailStatus.message || "Failed to send email",
        },
        { status: candidateEmailStatus.status }
      );
    }
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unknown Error Occurred",
      },
      { status: 500 }
    );
  }
}
