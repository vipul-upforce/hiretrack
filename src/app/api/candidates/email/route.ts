import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, {
  Candidate,
  EmailHistory,
  Settings,
  History,
} from "@/lib/mongodb";
import { verifyAndDecryptJWTToken } from "@/lib/auth";
import { sendMail } from "@/lib/emailUtils";

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const token = request.cookies.get("auth_token");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decryptedResponse = await verifyAndDecryptJWTToken(token.value);
    if (!decryptedResponse.success || !decryptedResponse.user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const user = decryptedResponse.user;

    // Check role - candidates cannot send emails
    if (user.role === "candidate" || user.role === "") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse request body
    const data = await request.json();
    const {
      candidateId,
      subject,
      body,
      cc = [],
      bcc = [],
      replyTo,
      attachments = [],
    } = data;

    // Validate required fields
    if (!candidateId || !subject || !body) {
      return NextResponse.json(
        { error: "Missing required fields: candidateId, subject, body" },
        { status: 400 }
      );
    }

    // Validate email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validateEmails = (emails: string[]) =>
      emails.every((email) => emailRegex.test(email));

    if (cc.length > 0 && !validateEmails(cc)) {
      return NextResponse.json(
        { error: "Invalid CC email addresses" },
        { status: 400 }
      );
    }

    if (bcc.length > 0 && !validateEmails(bcc)) {
      return NextResponse.json(
        { error: "Invalid BCC email addresses" },
        { status: 400 }
      );
    }

    if (replyTo && !emailRegex.test(replyTo)) {
      return NextResponse.json(
        { error: "Invalid reply-to email address" },
        { status: 400 }
      );
    }

    // Connect to database
    await connectToDatabase();

    // Get candidate
    const candidate = await Candidate!.findOne({
      _id: candidateId,
      organizationId: user.organizationId,
    });

    if (!candidate) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }

    // Get organization settings
    const settings = await Settings!.findOne({
      organizationId: user.organizationId,
    });
    if (!settings) {
      return NextResponse.json(
        { error: "Organization settings not found" },
        { status: 404 }
      );
    }

    // Prepare email body with attachments
    let finalBody = body;
    let htmlBody = body.replace(/\n/g, "<br>");

    if (attachments.length > 0) {
      // Plain text version
      finalBody += "\n\nAttachments (click links to download):\n";
      attachments.forEach((attachment: any) => {
        finalBody += `- ${attachment.fileName}: ${attachment.shareUrl}\n`;
      });

      // HTML version with clickable links
      htmlBody += `
        <br><br>
        <p style="margin: 0 0 8px 0; font-weight: bold; color: #374151;">Attachments:</p>
        <ul style="margin: 0; padding-left: 20px; list-style-type: disc;">`;

      attachments.forEach((attachment: any) => {
        htmlBody += `
          <li style="margin: 4px 0;">
            <a href="${attachment.shareUrl}" 
               target="_blank" 
               style="color: #3b82f6; text-decoration: none; font-weight: 500;"
               onmouseover="this.style.textDecoration='underline'"
               onmouseout="this.style.textDecoration='none'">
              ${attachment.fileName}
            </a>
          </li>`;
      });

      htmlBody += "</ul>";
    }

    // Prepare email data
    const candidateEmail =
      typeof candidate.email === "string"
        ? candidate.email
        : (candidate.email as any)?.email || "unknown@email.com";

    const fromEmail =
      settings.mailConfig.smtp_from ||
      settings.mailConfig.resend_from ||
      settings.mailConfig.brevo_from ||
      "noreply@hiretrack.com";

    const emailData = {
      to: candidateEmail,
      subject,
      text: finalBody,
      html: htmlBody,
      cc,
      bcc,
      replyTo: replyTo || user.email,
      from: fromEmail, // Use just the email address instead of formatted string
    };
    console.log("CREATING HISTORY ENTRY...");

    // Determine email provider for history logging
    let provider = "unknown";
    if (settings.mailConfig.mailProvider) {
      provider = settings.mailConfig.mailProvider;
    } else if (settings.mailConfig.resend_from) {
      provider = "resend";
    } else if (settings.mailConfig.brevo_from) {
      provider = "brevo";
    } else if (settings.mailConfig.smtp_from) {
      provider = "smtp";
    }

    // Create email history record first
    const emailHistory = await EmailHistory?.create({
      organizationId: user.organizationId,
      sentBy: user.id,
      sentByEmail: user.email,
      sentByName: user.name || user.email,
      recipientType: "Candidate",
      recipientId: candidate._id,
      recipientEmail: candidateEmail,
      recipientName: candidate.name,
      subject: emailData.subject,
      body: emailData.html,
      cc: emailData.cc,
      bcc: emailData.bcc,
      replyTo: emailData.replyTo,
      attachments: attachments.map((att: any) => ({
        fileName: att.fileName,
        fileSize: att.fileSize,
        shareId: att.shareId,
        shareUrl: att.shareUrl,
      })),
      status: "pending",
      provider,
      metadata: {
        jobId: candidate.jobId,
        candidateId: candidate._id,
      },
    });
    // Send email with context for automatic history tracking
    try {
      const emailResult = await sendMail(
        settings.mailConfig,
        emailData.to,
        emailData.subject,
        emailData.text,
        emailData.html,
        emailData.cc,
        emailData.bcc,
        emailData.replyTo,
        emailData.from,
        {
          emailHistoryId: String(emailHistory._id),
        }
      );

      // Check if email was sent successfully
      if (!emailResult.success) {
        throw new Error(emailResult.error || "Failed to send email");
      }

      // Update email history with success status
      await EmailHistory!.updateOne(
        { _id: emailHistory._id },
        {
          status: "sent",
          sentAt: new Date(),
        }
      );

      // Add to candidate history
      await History!.findOneAndUpdate(
        {
          candidateId: candidate._id.toString(),
          jobId: candidate.jobId,
        },
        {
          $push: {
            history: {
              dateTime: new Date().toISOString(),
              title: !!subject ? subject : "Direct Email Sent",
              previousInterviewer: null,
              currentInterviewer: null,
              assignmentBy: user.id,
              note: {
                description: `Email sent to candidate by ${user.name || user.email}`,
                date: new Date().toISOString(),
                rating: 0,
                userId: user.id,
              },
              attachments: [],
            },
          },
        },
        { upsert: true }
      );

      return NextResponse.json({
        success: true,
        message: "Email sent successfully",
        emailHistoryId: emailHistory._id,
      });
    } catch (emailError: any) {
      // Update email history with failure
      await EmailHistory!.updateOne(
        { _id: emailHistory._id },
        {
          status: "failed",
          error: emailError.message || "Failed to send email",
        }
      );

      return NextResponse.json(
        { error: "Failed to send email", details: emailError.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error in send email to candidate:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process email request" },
      { status: 500 }
    );
  }
}
