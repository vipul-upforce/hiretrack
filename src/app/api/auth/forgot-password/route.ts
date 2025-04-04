import { NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect, { Settings } from '@/lib/mongodb';
import { User } from '@/lib/mongodb';
import { sendMail } from '../../event-mail';

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
      return "We don't have permission to connect to the email service. Please check the SMTP credentials.";
    case -4039:
      return "The email service is temporarily unavailable. Please try again later.";
    default:
      return "We couldn't send the email. Please check the email details and try again.";
  }
};

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { email } = await req.json();

    if (!User || !Settings) throw new Error('Database not connected');

    const user = await User.findOne({ email });
    if (!user) throw new Error('No account found with this email');

    // Generate password reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour expiry
    
    await User.findByIdAndUpdate(user._id, {
      resetToken: resetTokenHash,
      resetTokenExpiry,
    });
    
    const origin = req.headers.get('origin') || 'http://localhost:3000'; 
    const resetUrl = `${origin}/auth/reset-password?token=${resetToken}`;
    const emailStatus = await sendMail(
      user.organizationId.toString(),
      email,
      'Password Reset Request',
      `
        <p>Hello,</p>
        <p>You requested to reset your password.</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
    );

    if (emailStatus.status === 200) {
      return NextResponse.json({ message: "Email sent successfully." });
    } else {
      return NextResponse.json(
        { 
             error: emailStatus.message,
        },
        { status: emailStatus.status }
      );
    }
   
  } catch (error: unknown) {
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
