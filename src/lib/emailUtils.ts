import { createTransport, TransportOptions } from "nodemailer";
import { Resend } from "resend";
import { Ismtp } from "@/lib/models/settings";
import dbConnect, { EmailHistory } from "@/lib/mongodb";
import mongoose from "mongoose";

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  from?: string;
}

interface EmailContextBase {
  // any shared fields between the two can go here (optional)
}

interface EmailHistoryContext extends EmailContextBase {
  emailHistoryId: string;
}

interface EmailMetadataContext extends EmailContextBase {
  organizationId: string;
  sentBy: string;
  sentByEmail: string;
  sentByName: string;
  recipientType: string;
  recipientId: string;
  recipientName: string;
  metadata: {
    jobId?: string;
    candidateId?: string;
    templateUsed?: string;
    eventType?: string;
  };
  attachments: {
    fileName: string;
    fileSize: number;
    shareId: string;
    shareUrl: string;
  }[];
}

type EmailContext = EmailHistoryContext | EmailMetadataContext;

export async function sendMail(
  mailConfig: Ismtp,
  to: string,
  subject: string,
  text?: string,
  html?: string,
  cc?: string[],
  bcc?: string[],
  replyTo?: string,
  from?: string,
  context?: EmailContext
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Validate mail configuration
    if (!mailConfig.mailProvider) {
      return { success: false, error: "Mail provider not configured" };
    }

    // Determine the correct from email based on provider
    let fromEmail: string;
    switch (mailConfig.mailProvider) {
      case "smtp":
        fromEmail = from || mailConfig.smtp_from;
        if (!fromEmail) {
          return { success: false, error: "SMTP from email not configured" };
        }
        break;
      case "resend":
        fromEmail = from || mailConfig.resend_from;
        if (!fromEmail) {
          return { success: false, error: "Resend from email not configured" };
        }
        break;
      case "brevo":
        fromEmail = from || mailConfig.brevo_from;
        if (!fromEmail) {
          return { success: false, error: "Brevo from email not configured" };
        }
        break;
      default:
        return { success: false, error: `Unsupported mail provider: ${mailConfig.mailProvider}` };
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(fromEmail)) {
      return { success: false, error: `Invalid from email format: ${fromEmail}` };
    }
    if (!emailRegex.test(to)) {
      return { success: false, error: `Invalid to email format: ${to}` };
    }

    // Filter and validate CC/BCC arrays
    const validCc = cc?.filter(email => email.trim() !== '') || [];
    const validBcc = bcc?.filter(email => email.trim() !== '') || [];

    const emailOptions: EmailOptions = {
      to,
      subject,
      text,
      html: html || text,
      ...(validCc.length > 0 && { cc: validCc }),
      ...(validBcc.length > 0 && { bcc: validBcc }),
      replyTo,
      from: fromEmail,
    };


    let result: { success: boolean; messageId?: string; error?: string };
    
    switch (mailConfig.mailProvider) {
      case "smtp":
        result = await sendSMTPMail(mailConfig, emailOptions);
        break;
      case "resend":
        result = await sendResendMail(mailConfig, emailOptions);
        break;
      case "brevo":
        result = await sendBrevoMail(mailConfig, emailOptions);
        break;
      default:
        return { success: false, error: "Unsupported mail provider" };
    }

    // If context with emailHistoryId is provided, update the history record
    if (context && "emailHistoryId" in context) {
      try {
        await dbConnect();
        const history = await EmailHistory.findById(context.emailHistoryId);

        if (history) {
          history.status = result.success ? "sent" : "failed";
          history.providerMessageId = result.messageId;
          history.error = result.error;
          history.sentAt = new Date();
          await history.save();
        } else {
          console.warn(`Email history not found for ID: ${context.emailHistoryId}`);
        }
      } catch (historyError) {
        console.error("Failed to update email history:", historyError);
        // Do not fail the email send if history update fails
      }
    }

    return result;
  } catch (error: any) {
    console.error("Error sending email:", error);
    return { success: false, error: error.message || "Failed to send email" };
  }
}

async function sendSMTPMail(config: Ismtp, options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Validate SMTP config
    if (!config.smtp_host || !config.smtp_port || !config.smtp_user || !config.smtp_password) {
      return { success: false, error: "SMTP configuration incomplete" };
    }

    const transporter = createTransport({
      host: config.smtp_host,
      port: parseInt(config.smtp_port),
      secure: parseInt(config.smtp_port) === 465,
      auth: {
        user: config.smtp_user,
        pass: config.smtp_password,
      },
    } as TransportOptions);

    const mailOptions: any = {
      from: options.from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      replyTo: options.replyTo,
    };

    // Only include CC/BCC if they have values
    if (options.cc && options.cc.length > 0) {
      mailOptions.cc = options.cc.join(', ');
    }
    if (options.bcc && options.bcc.length > 0) {
      mailOptions.bcc = options.bcc.join(', ');
    }

    const result = await transporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  } catch (error: any) {
    console.error("SMTP error:", error);
    return { success: false, error: `SMTP error: ${error.message}` };
  }
}

async function sendResendMail(config: Ismtp, options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Validate Resend config
    if (!config.resend_api_key) {
      return { success: false, error: "Resend API key not configured" };
    }

    const resend = new Resend(config.resend_api_key);

    const emailPayload: any = {
      from: options.from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      replyTo: options.replyTo || config.resend_reply_to,
    };

    // Only include CC/BCC if they have values
    if (options.cc && options.cc.length > 0) {
      emailPayload.cc = options.cc;
    }
    if (options.bcc && options.bcc.length > 0) {
      emailPayload.bcc = options.bcc;
    }

    const result = await resend.emails.send(emailPayload);

    if (result.error) {
      console.error("Resend API error:", result.error);
      return { success: false, error: `Resend error: ${result.error.message}` };
    }

    return { success: true, messageId: result.data?.id };
  } catch (error: any) {
    console.error("Resend unexpected error:", error);
    return { success: false, error: `Resend error: ${error.message}` };
  }
}

async function sendBrevoMail(config: Ismtp, options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Validate Brevo config
    if (!config.brevo_api_key) {
      return { success: false, error: "Brevo API key not configured" };
    }

    const emailPayload: any = {
      sender: {
        email: options.from,
      },
      to: [{ email: options.to }],
      subject: options.subject,
      textContent: options.text,
      htmlContent: options.html,
      replyTo: {
        email: options.replyTo || config.brevo_reply_to,
      },
    };

    // Only include CC/BCC if they have values
    if (options.cc && options.cc.length > 0) {
      emailPayload.cc = options.cc.map(email => ({ email }));
    }
    if (options.bcc && options.bcc.length > 0) {
      emailPayload.bcc = options.bcc.map(email => ({ email }));
    }


    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": config.brevo_api_key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Brevo API error:", errorData);
      return { success: false, error: `Brevo error: ${errorData.message || "Failed to send email"}` };
    }

    const result = await response.json();
    return { success: true, messageId: result.messageId };
  } catch (error: any) {
    console.error("Brevo unexpected error:", error);
    return { success: false, error: `Brevo error: ${error.message}` };
  }
}