import { ISettings } from "@/lib/models/settings";
import connectToDatabase, { Settings } from "@/lib/mongodb";
import { createTransport, TransportOptions } from "nodemailer";
import { Resend } from "resend";

interface ISmtp {
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_password: string;
  smtp_from: string;
  mailProvider: string;
}
interface IResend {
  resend_api_key: string;
  resend_from: string;
  resend_reply_to: string;
  mailProvider: string;
}
interface IResendObj {
  settings: IResend;
  mailTo: string[];
  bcc?: string[];
  htmlContent: string;
  eventTitle: string;
}
interface ISmtpObj {
  settings: ISmtp;
  mailTo: string[];
  bcc?: string[];
  htmlContent: string;
  eventTitle: string;
}

export const sendMail = async (
  orgID: string,
  email: string[],
  eventTitle: string,
  htmlContent: string,
  bcc?: string[]
): Promise<{ status: number; message: string }> => {
  try {
    await connectToDatabase();
    if (!Settings) {
      return { status: 404, message: "Setting Model not found" };
    }
    // const validEmails = email;

    const settingInfo = (await Settings?.find({
      organizationId: orgID,
    })) as ISettings[];

    // Check if settingInfo is not empty
    if (!settingInfo || settingInfo.length === 0) {
      return { status: 404, message: "Settings not found" };
    }

    // Access the first document in the array
    const settings: ISettings = settingInfo[0];

    const { mailConfig } = settings; // Now credentials should be recognized

    // Check if smtpConfig is defined and has the required properties
    if (!mailConfig || !mailConfig.mailProvider) {
      return {
        status: 400,
        message: "SMTP configuration is missing or invalid",
      };
    }
    console.log("⌛ About to send mail to : ", email);
    let mailTo = email;
    if (email[0]) {
      mailTo = [email[0]];
      if (email.length > 1) {
        bcc = [...email].slice(1);
      }
    }
    mailTo = mailTo.filter((mailId) => (mailId ? true : false));
    console.log("⌛ filtered mails: ", email);

    // const allEmails = [...(email || []), ...(bcc || [])];
    console.log("BCC: ", bcc);
    // const users = await User.find(
    //   { email: { $in: allEmails } },
    //   { email: 1, isDeleted: 1 }
    // ).lean();

    // const deletedEmails = new Set(
    //   users.filter((user) => user.isDeleted).map((user) => user.email)
    // );
    // console.log("ISDELETED EMAIL: ", deletedEmails);
    // const validEmails = allEmails.filter((e) => !deletedEmails.has(e));
    // console.log("VALID EMAIL: ", validEmails);

    // if (validEmails.length === 0) {
    //   return { status: 400, message: "No valid recipients found" };
    // }

    if (mailConfig.mailProvider === "smtp") {
      const result = await sendSmtpMail({
        settings: mailConfig,
        mailTo,
        bcc,
        htmlContent,
        eventTitle,
      });
      // console.log("✉️ SMTP Mail sent: ", result);
      return result || { status: 500, message: "Failed to send email" };
    } else if (mailConfig.mailProvider === "resend") {
      const result = await sendReSendMail({
        settings: mailConfig,
        mailTo,
        bcc,
        htmlContent,
        eventTitle,
      });
      // console.log("✉️ ReSend Mail sent: ", result);
      return result || { status: 500, message: "Failed to resend email" };
    }

    // Add a default return statement for unexpected mail types
    return { status: 400, message: "Invalid mail type specified" };
  } catch (err: unknown) {
    return {
      status: 500,
      message: err instanceof Error ? err.message : "Unknown error occurred",
    };
  }
};

const sendSmtpMail = async (smtpObJ: ISmtpObj) => {
  try {
    // Configure email transporter
    const transporter = createTransport({
      host: smtpObJ.settings.smtp_host,
      port: smtpObJ.settings.smtp_port,
      secure: Number(smtpObJ.settings.smtp_port) === 465,
      auth: {
        user: smtpObJ.settings.smtp_user,
        pass: smtpObJ.settings.smtp_password,
      },
    } as TransportOptions);

    // Send email
    const mailOptions = {
      from: smtpObJ.settings.smtp_from,
      to: smtpObJ.mailTo, // Use mailTo instead of email
      bcc: smtpObJ.bcc,
      subject: `${smtpObJ.eventTitle}`,
      html: smtpObJ.htmlContent,
    };

    const result = await transporter
      .sendMail(mailOptions)
      .then(() => {
        return { status: 200, message: "Email Sent Successfully" };
      })
      .catch((err) => {
        return {
          status: 500,
          message:
            err instanceof Error ? err.message : "Unknown error occurred",
        };
      });
    return result;
  } catch (error: unknown) {
    return {
      status: 500,
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

const sendReSendMail = async (mailObj: IResendObj) => {
  try {
    const resend = new Resend(mailObj.settings.resend_api_key);
    console.log(
      "➡️FINAL MAILOBJ just before sending: ",
      mailObj.mailTo,
      mailObj.bcc
    );
    const result = await resend.emails
      .send({
        from: mailObj.settings.resend_from,
        to: mailObj.mailTo,
        bcc: mailObj.bcc,
        subject: mailObj.eventTitle,
        replyTo: mailObj.settings.resend_reply_to,
        html: mailObj.htmlContent,
      })
      .then(() => {
        return { status: 200, message: "Email Sent Successfully" };
      })
      .catch((err) => {
        return {
          status: 500,
          message:
            err instanceof Error ? err.message : "Unknown error occurred",
        };
      });
    return result;
  } catch (error) {
    return {
      status: 500,
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};
