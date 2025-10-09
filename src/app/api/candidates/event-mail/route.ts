import { NextRequest, NextResponse } from "next/server";
import { sendSmartNotification } from "@/lib/unifiedEmailService"; // Import sendSmartNotificationEmail
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
import { verifyAndDecryptToken } from "@/app/actions/auth";
import { NotificationService } from "@/lib/notifications/notificationService"; // Import if needed
import { NotificationType } from "@/lib/services/emailDecisionEngine";

export async function POST(req: NextRequest) {
  try {
    const { candidateId } = await req.json();

    // Get user information from token
    let senderEmail;
    let senderUserId;
    let senderName;
    const token = req.cookies.get("auth_token");
    if (token?.value) {
      const decryptedResponse = await verifyAndDecryptToken(
        String(token?.value)
      );
      if (decryptedResponse.success && decryptedResponse.user) {
        senderEmail = decryptedResponse.user.email;
        senderUserId = decryptedResponse.user.id;
        senderName = decryptedResponse.user.name;
      }
    }
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
      .select("_id name email")
      .lean();

    const hrEmails: string[] = hrUsers.map((user) => user.email);
    const hrUserIds: string[] = hrUsers.map((user) => user._id.toString());

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
        candidatePhone: contact || "N/A",
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
    const hrHistoryPromises = hrEmails.map(async (hrEmail, index) => {
      try {
        const hrUser = hrUsers.find((user) => user.email === hrEmail);
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
    // console.log(candidateData.jobId._id.toString(), "candidateData==77b");

    // Send email using sendSmartNotificationEmail
    let emailStatus;
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
      const jobId =
        (
          candidateData.jobId as {
            _id: string;
            title: string;
            description: string;
          }
        )._id.toString() || "";
      emailStatus = await sendSmartNotification(
        organizationId,
        NotificationType.NEW_APPLICATIONS,
        {
          triggererUserId: senderUserId || candidateId,
          triggererEmail: senderEmail,
          triggererName: senderName,
          jobId,
          candidateId: candidateId,
          eventType: "job_application",
          templateUsed: "job-application-hr",
        },
        {
          subject: candidateEmailSubject,
          html: candidateEmailContent,
        },
        [...hrUserIds, candidateId]
      );
      console.log("✅ Email notification sent successfully");
    } catch (emailError) {
      console.error("❌ Failed to send email notification:", emailError);
      emailStatus = {
        status: 500,
        message:
          emailError instanceof Error
            ? emailError.message
            : "Failed to send email",
      };
    }
    const updatePromises = [];

    // Update candidate history
    updatePromises.push(
      EmailHistory.findByIdAndUpdate(candidateHistory._id, {
        status: emailStatus.status === 200 ? "sent" : "failed",
        sentAt: emailStatus.status === 200 ? new Date() : undefined,
        error: emailStatus.status !== 200 ? emailStatus.message : undefined,
      })
    );

    // Update HR history records
    updatePromises.push(
      ...validHrHistory.map(async (historyRecord) => {
        if (historyRecord) {
          return EmailHistory.findByIdAndUpdate(historyRecord._id, {
            status: emailStatus.status === 200 ? "sent" : "failed",
            sentAt: emailStatus.status === 200 ? new Date() : undefined,
            error: emailStatus.status !== 200 ? emailStatus.message : undefined,
          });
        }
      })
    );

    await Promise.all(updatePromises);
    console.log("Email Status:", emailStatus);

    // Prepare response
    if (emailStatus.status === 200) {
      return NextResponse.json({ message: "Email sent successfully" });
    } else {
      return NextResponse.json(
        {
          error: emailStatus.message || "Failed to send email",
        },
        { status: emailStatus.status }
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
