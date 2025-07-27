import { NextRequest, NextResponse } from "next/server";
import { sendMail } from "@/app/api/event-mail";
import { getMappedEmailTemplate } from "@/app/actions/getMappedEmailTemplate";
import { User } from "@/lib/mongodb";
import dbConnect from "@/lib/mongodb";
import { otpRateLimiter } from "@/lib/rateLimiter";

async function handleSendOtp(req: NextRequest) {
  try {
    await dbConnect();
    const { email, organizationId } = await req.json();

    if (!email || !organizationId) {
      return NextResponse.json(
        { message: "Email and organization ID are required" },
        { status: 400 }
      );
    }

    // Check if user has an existing OTP and its generation time
    const user = await User?.findOne({ email, organizationId });

    if (user && user.otp && user.otpExpires) {
      const currentTime = new Date();
      const otpGenerationTime = new Date(
        user.otpExpires.getTime() - 10 * 60 * 1000
      );
      const timeSinceOtpGenerated =
        (currentTime.getTime() - otpGenerationTime.getTime()) / 1000 / 60;

      if (timeSinceOtpGenerated < 1) {
        // Less than 1 minute has passed since OTP was generated
        return NextResponse.json(
          { message: "Please wait before requesting a new OTP" },
          { status: 429 }
        );
      }
    }

    // Generate new OTP and expiration time
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update user with new OTP and expiration
    await User?.updateOne(
      { email, organizationId },
      { $set: { otp, otpExpires } },
      { upsert: true } // Create user if not found
    );

    // Send email with the OTP
    const { emailContent, emailSubject } = await getMappedEmailTemplate(
      "2fa-otp",
      { otp },
      organizationId
    );

    const mailResult = await sendMail(
      organizationId,
      [email],
      emailSubject,
      emailContent
    );

    if (mailResult.status === 200) {
      return NextResponse.json({ message: "OTP sent successfully" });
    } else {
      return NextResponse.json(
        { message: "Failed to send OTP" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error sending OTP:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// Export with rate limiting
export async function POST(req: Request) {
  // SECURITY FIX: Apply rate limiting to prevent OTP spam
  return otpRateLimiter(req as NextRequest, handleSendOtp);
}
