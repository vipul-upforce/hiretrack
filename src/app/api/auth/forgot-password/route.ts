import { NextResponse, NextRequest } from "next/server";
import crypto from "crypto";
import dbConnect, { CandidateAccount, Settings } from "@/lib/mongodb";
import { User } from "@/lib/mongodb";
import { sendEventEmailWithHistory } from "@/lib/unifiedEmailService";
import { ObjectId, Types } from "mongoose";
import { Organization } from "@/lib/models/user";
import { getMappedEmailTemplate } from "@/app/actions/getMappedEmailTemplate";
import { passwordResetRateLimiter } from "@/lib/rateLimiter";

type NodemailerError = {
  errno?: number;
  message?: string;
};

// Organization user data to return to frontend
interface OrgUserData {
  id: string;
  organizationId: string | { _id: ObjectId | string; name: string };
  organizationName?: string;
  email: string;
  isCandidate: boolean;
}

const getNodemailerErrorMessage = (error: NodemailerError) => {
  if (!error || typeof error !== "object") return "An unknown error occurred";
  switch (error.errno) {
    case -3008:
      return "We couldn't find the email service. Please check the SMTP settings.";
    case -3001:
      return "The email service is taking too long to respond. Please try again in a few minutes.";
    case -3002:
      return "Your internet connection seems to be unstable. Please check your connection and try again.";
    case -3005:
      return "The email service is rejecting the request. Please verify the SMTP email settings.";
    case -4078:
      return "We don't have permission to connect to the email service. Please check the SMTP credentials.";
    case -4039:
      return "The email service is temporarily unavailable. Please try again later.";
    default:
      return (
        error.message ||
        "We couldn't send the email. Please check the email details and try again."
      );
  }
};

// Initial lookup to find all accounts with the given email
async function handleForgotPassword(req: NextRequest) {
  try {
    await dbConnect();
    const { email, selectedOrgId } = await req.json();

    if (!User || !Settings || !CandidateAccount)
      throw new Error("Database not connected");

    // If selectedOrgId is provided, handle password reset for specific organization
    if (selectedOrgId) {
      return await handlePasswordReset(email, selectedOrgId, req);
    }

    // Otherwise, find all accounts with the email and return them
    const regularUsers = await User.find({ email }).populate(
      "organizationId",
      "name"
    );
    const candidateUsers = await CandidateAccount.find({ email }).populate(
      "organizationId",
      "name"
    );

    // Format results for frontend
    const userAccounts: OrgUserData[] = regularUsers.map((user) => ({
      id: user._id.toString(),
      organizationId:
        user.organizationId &&
          typeof user.organizationId === "object" &&
          "_id" in user.organizationId
          ? (user.organizationId as Organization)._id.toString()
          : "",
      organizationName:
        user.organizationId &&
          typeof user.organizationId === "object" &&
          "name" in user.organizationId
          ? user.organizationId.name
          : "",
      email: user.email,
      isCandidate: false,
    }));

    const candidateAccounts: OrgUserData[] = candidateUsers.map((user) => ({
      id: user._id.toString(),
      organizationId: user.organizationId
        ? typeof user.organizationId === "object" &&
          "_id" in user.organizationId
          ? (user.organizationId as Organization)._id.toString()
          : user.organizationId.toString()
        : "",
      organizationName:
        user.organizationId &&
          typeof user.organizationId === "object" &&
          "name" in user.organizationId
          ? String(user.organizationId.name) // Explicitly cast to string
          : "",
      email: user.email,
      isCandidate: true,
    }));

    const allAccounts = [...userAccounts, ...candidateAccounts];

    if (allAccounts.length === 0) {
      return NextResponse.json(
        { error: "No account found with this email" },
        { status: 404 }
      );
    }

    // If only one account exists, proceed with password reset directly
    if (allAccounts.length === 1) {
      const account = allAccounts[0];
      return await handlePasswordReset(
        email,
        typeof account.organizationId === "object" &&
          "_id" in account.organizationId
          ? account.organizationId._id.toString()
          : account.organizationId,
        req,
        account.isCandidate
      );
    }

    // Return list of accounts for user selection
    return NextResponse.json({
      multipleAccounts: true,
      accounts: allAccounts,
    });
  } catch (error: unknown) {
    let errorMessage = "An unknown error occurred";
    if (typeof error === "object" && error !== null) {
      errorMessage = getNodemailerErrorMessage(error as NodemailerError);
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Function to handle the actual password reset after organization selection
async function handlePasswordReset(
  email: string,
  organizationId: string,
  req: Request,
  isCandidate?: boolean
) {
  try {
    const settings = await Settings.findOne({ organizationId: new Types.ObjectId(organizationId) }).lean();
    if (!settings || !settings.mailConfig) {
      throw new Error("Mail configuration not found");
    }

    const fromEmail = settings.mailConfig.resend_from || settings.mailConfig.brevo_from || settings.mailConfig.smtp_from || "system@hiretrack.com";

    // Find the correct user with both email and organizationId
    let user;
    if (!CandidateAccount || !User) {
      throw new Error("Database not connected");
    }
    if (isCandidate !== undefined) {
      // If we explicitly know if it's a candidate or not
      if (isCandidate) {
        user = await CandidateAccount.findOne({
          email,
          organizationId,
        }).populate(
          "organizationId"
        );
      } else {
        user = await User.findOne({
          email,
          organizationId,
        }).populate(
          "organizationId"
        );
      }
    } else {
      // Try regular user first, then candidate
      user = await User.findOne({ email, organizationId }).populate(
        "organizationId"
      );

      if (!user) {
        user = await CandidateAccount.findOne({ email, organizationId }).populate(
          "organizationId"
        );
        isCandidate = true;
      }
    }
    console.log(user, "User For Reset_link --___ TT ");

    if (!user) {
      throw new Error(
        "No account found with this email in the selected organization"
      );
    }
    // const organization = await CandidateAccount.findById(organizationId);
    // if (!organization) {
    //   throw new Error("Organization not found");
    // }
    // const candidateUsers = await CandidateAccount.find({ email });
    // console.log("Organization Name:", candidateUsers);
    // console.log(user, "reset passwordd.....");

    // Generate password reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    const resetTokenExpiry = new Date(Date.now() + 3600000);

    // Update the user with reset token
    if (isCandidate) {
      await CandidateAccount.findByIdAndUpdate(user._id, {
        resetToken: resetTokenHash,
        resetTokenExpiry,
      });
    } else {
      await User.findByIdAndUpdate(user._id, {
        resetToken: resetTokenHash,
        resetTokenExpiry,
      });
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";
    const resetUrl = `${origin}/auth/reset-password?token=${resetToken}${isCandidate ? "&type=candidate" : ""}`;

    const { emailContent, emailSubject } = await getMappedEmailTemplate(
      "password-reset",
      {
        resetLink: resetUrl,
        organizationName: user?.organizationId.name,
        userName: user?.name,
      },
      organizationId
    );

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

    const emailStatus = await sendEventEmailWithHistory(
      organizationId,
      [email],
      emailSubject,
      emailContent,
      {
        sentBy: systemUser._id.toString(),
        sentByEmail: systemUser.email,
        sentByName: systemUser.name,
        metadata: {
          templateUsed: "reset-password-request",
          eventType: "password_reset",
        },
      }
    );

    if (emailStatus.status === 200) {
      return NextResponse.json({ message: "Email sent successfully." });
    } else {
      return NextResponse.json(
        { error: emailStatus.message },
        { status: emailStatus.status }
      );
    }
  } catch (error: unknown) {
    let errorMessage = "An unknown error occurred";
    if (typeof error === "object" && error !== null) {
      errorMessage = getNodemailerErrorMessage(error as NodemailerError);
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Export with rate limiting
export async function POST(req: Request) {
  // SECURITY FIX: Apply rate limiting to prevent abuse
  return passwordResetRateLimiter(req as NextRequest, handleForgotPassword);
}
