import { NextRequest, NextResponse } from 'next/server';
import { sendEventEmailWithHistory } from '@/lib/services/unifiedEmailService';
import { getMappedEmailTemplate } from '@/lib/notifications/email/getMappedEmailTemplate';
import connectToDatabase, {
  CandidateAccount,
  Settings,
  User,
} from '@/lib/mongodb';
import mongoose from 'mongoose';
import { otpRateLimiter } from '@/lib/rateLimiter';
import { logger } from '@/lib/logger/logger.server';

async function handleSendOtp(req: NextRequest) {
  try {
    await connectToDatabase();
    const { email, organizationId, isCandidate = false } = await req.json();

    if (!email || !organizationId) {
      return NextResponse.json(
        { message: 'Email and organization ID are required' },
        { status: 400 },
      );
    }

    const settings = await Settings?.findOne({
      organizationId: new mongoose.Types.ObjectId(organizationId),
    })
      .select('mailConfig')
      .lean()
      .exec();
    if (!settings || !settings.mailConfig) {
      return NextResponse.json(
        { message: 'Mail configuration not found' },
        { status: 500 },
      );
    }

    const fromEmail =
      settings.mailConfig.resend_from ||
      settings.mailConfig.brevo_from ||
      settings.mailConfig.smtp_from ||
      'system@hiretrack.com';
    const user = isCandidate
      ? await CandidateAccount?.findOne({
          email,
          organizationId,
          isDeleted:{$ne: true},
        }).select('name email role organizationId tokenVersion otp otpExpires').populate({
          path: 'organizationId',
          select: 'name', // populate only organization name
        }).lean()
      : await User?.findOne({
          email,
          organizationId,
          isDeleted: { $ne: true },
        }).select('name email role organizationId tokenVersion otp otpExpires').populate({
          path: 'organizationId',
          select: 'name', // populate only organization name
        }).lean();
        console.log("isCandidate",isCandidate,user,"user")
    const organizationName =
      (user?.organizationId as unknown as { name: string })?.name || '';
    // Check if user has an existing OTP and its generation time

    if (user && user.otp && user.otpExpires) {
      const currentTime = new Date();
      const otpGenerationTime = new Date(
        user.otpExpires.getTime() - 10 * 60 * 1000,
      );
      const timeSinceOtpGenerated =
        (currentTime.getTime() - otpGenerationTime.getTime()) / 1000 / 60;

      if (timeSinceOtpGenerated < 1) {
        // Less than 1 minute has passed since OTP was generated
        return NextResponse.json(
          { message: 'Please wait before requesting a new OTP' },
          { status: 429 },
        );
      }
    }

    // Generate new OTP and expiration time
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update user with new OTP and expiration

    if (isCandidate) {
      await CandidateAccount?.updateOne(
        { email, organizationId },
        { $set: { otp, otpExpires } },
        { upsert: true }, // Create user if not found
      );
    } else {
      await User?.updateOne(
        { email, organizationId },
        { $set: { otp, otpExpires } },
        { upsert: true }, // Create user if not found
      );
    }
    // Send email with the OTP
    const { emailContent, emailSubject } = await getMappedEmailTemplate(
      'send-otp',
      {
        otpCode: otp,
        expirationTime: otpExpires.toISOString(),
        organizationName: organizationName || '',
        userName: (user?.name || '') + (user?.role || ''),
      },
      organizationId,
    );

    const systemUser = await User?.findOneAndUpdate(
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

    const mailResult = await sendEventEmailWithHistory(
      organizationId,
      [email],
      emailSubject,
      emailContent,
      {
        sentBy: systemUser!._id.toString(),
        sentByEmail: systemUser!.email,
        sentByName: systemUser!.name,
        metadata: {
          templateUsed: '2fa-otp',
          eventType: '2fa_authentication',
        },
      },
      undefined,
      isCandidate,
    );

    if (mailResult.status === 200) {
      return NextResponse.json({ message: 'OTP sent successfully' });
    }
    // If email service is down, 2FA is not possible.
    // We should also invalidate the current OTP attempt.

    await Settings?.findOneAndUpdate(
      { organizationId },
      { $set: { 'twoFA.enable2FA': false } },
      { new: true },
    );
    return NextResponse.json(
      {
        message: 'Email service is currently unavailable. 2FA disabled',
      },
      { status: 503 }, // Service Unavailable
    );
  } catch (error) {
    logger.error({ error }, ' Error sending OTP.');
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}

// Export with rate limiting
export async function POST(req: Request) {
  // SECURITY FIX: Apply rate limiting to prevent OTP spam
  return otpRateLimiter(req as NextRequest, handleSendOtp);
}
