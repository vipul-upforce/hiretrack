import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createTransport } from 'nodemailer';
import dbConnect, { Settings } from '@/lib/mongodb';
import { User } from '@/lib/mongodb';

type NodemailerError = {
  errno?: number;
  message?: string;
};

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
      return "We don’t have permission to connect to the email service. Please check the SMTP credentials.";
    case -4039:
      return "The email service is temporarily unavailable. Please try again later.";
    default:
      return "We couldn’t send the email. Please check the email details and try again.";
  }
};

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { email } = await req.json();

    if (!User || !Settings) throw new Error('Database not connected');

    const user = await User.findOne({ email });
    if (!user) throw new Error('No account found with this email');

    const { organizationId } = user;
    const settings = await Settings.findOne({ organizationId }).select('smtpConfig');
    if (!settings || !settings.smtpConfig) throw new Error('SMTP Settings Not Found');

    const smtpConfig = settings.smtpConfig;

    // Generate password reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour expiry

    await User.findByIdAndUpdate(user._id, {
      resetToken: resetTokenHash,
      resetTokenExpiry,
    });

    // Create reset URL
    const origin = req.headers.get('origin') || 'http://localhost:3000'; 
    const resetUrl = `${origin}/auth/reset-password?token=${resetToken}`;

    // Configure Nodemailer
    const transporter = createTransport({
      host: smtpConfig.SMTP_HOST,
      port: Number(smtpConfig.SMTP_PORT),
      secure: Number(smtpConfig.SMTP_PORT) === 465,
      auth: {
        user: smtpConfig.SMTP_USER,
        pass: smtpConfig.SMTP_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    await transporter.sendMail({
      from: smtpConfig.SMTP_FROM,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <p>Hello,</p>
        <p>You requested to reset your password.</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    });

    return NextResponse.json(
      { message: 'Password reset email sent successfully' },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Password reset error:', error);

    let errorMessage = "An unknown error occurred";

    if (typeof error === "object" && error !== null) {
      errorMessage = getNodemailerErrorMessage(error as NodemailerError);
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
