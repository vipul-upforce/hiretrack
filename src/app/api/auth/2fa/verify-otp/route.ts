import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, {
  CandidateAccount,
  Settings,
  User,
} from '@/lib/mongodb';
import { loginRateLimiter } from '@/lib/rateLimiter';
import { returnTokenBasedResponse } from '@/lib/refreshToken';
import { logger } from '@/lib/logger/logger.server';

async function handleVerifyOtp(req: NextRequest) {
  try {
    await connectToDatabase();

    const { email, otp, isCandidate = false } = await req.json();
    console.log('req.body', email, otp, isCandidate);
    if (!email || !otp) {
      return NextResponse.json(
        { message: 'Email and OTP are required' },
        { status: 400 },
      );
    }

    const user = isCandidate
      ? await CandidateAccount?.findOne({
          email,
          otp: Number(otp),
          otpExpires: { $gt: new Date() },
        })
          .select('name email role organizationId tokenVersion')
          .lean()
      : await User?.findOne({
          email,
          otp: Number(otp),
          otpExpires: { $gt: new Date() },
          isDeleted: { $ne: true },
        })
          .select('name email role organizationId tokenVersion')
          .lean();
    if (!user) {
      return NextResponse.json(
        { message: 'Invalid or expired OTP' },
        { status: 400 },
      );
    }

    // Clear OTP immediately (atomic safety)
    const [_, fileStorageResult] = await Promise.all([
      User!.updateOne({ _id: user._id }, { $unset: { otp: 1, otpExpires: 1 } }),
      Settings!
        .findOne({ organizationId: user.organizationId }, { _id: 0 })
        .select('fileStorage')
        .lean(),
    ]);
    const fileStorage = fileStorageResult?.fileStorage?.storageType as string;

    const response = await returnTokenBasedResponse({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId.toString(),
      tokenVersion: user.tokenVersion,
      fileStorage,
    });

    return response;
  } catch (error) {
    logger.error({ error }, 'Error verifying OTP');
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 },
    );
  }
}

// Export with rate limiting
export async function POST(req: Request) {
  // SECURITY FIX: Apply rate limiting to prevent OTP brute force attacks
  return loginRateLimiter(req as NextRequest, handleVerifyOtp);
}
