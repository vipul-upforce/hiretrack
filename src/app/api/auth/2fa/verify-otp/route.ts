import { NextRequest, NextResponse } from "next/server";
import { User } from "@/lib/mongodb";
import dbConnect from "@/lib/mongodb";
import { signToken } from "@/app/actions/auth";
import { setSecureAuthTokens } from "@/lib/secureTokens";
import { loginRateLimiter } from "@/lib/rateLimiter";

async function handleVerifyOtp(req: NextRequest) {
  try {
    await dbConnect();
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json(
        { message: "Email and OTP are required" },
        { status: 400 }
      );
    }

    const userData = await User?.aggregate([
      {
        $match: {
          email,
          otp: Number(otp),
          otpExpires: { $gt: new Date() },
        },
      },
      {
        $lookup: {
          from: "organizations",
          localField: "organizationId",
          foreignField: "_id",
          as: "organizationInfo",
        },
      },
      {
        $unwind: {
          path: "$organizationInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "settings",
          localField: "organizationId",
          foreignField: "organizationId",
          as: "settings",
        },
      },
      {
        $unwind: {
          path: "$settings",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          id: { $toString: "$_id" },
          name: 1,
          email: 1,
          role: 1,
          organizationId: { $toString: "$organizationId" },
          organizationInfo: {
            _id: { $toString: "$organizationInfo._id" },
            name: "$organizationInfo.name",
            adminId: "$organizationInfo.adminId",
            lanes: "$organizationInfo.lanes",
            openJobCards: "$organizationInfo.openJobCards",
            appliedApplications: "$organizationInfo.appliedApplications",
            tags: "$organizationInfo.tags",
          },
          fileStorage: "$settings.fileStorage.storageType",
          _id: 0,
        },
      },
    ]);

    if (userData) {
      // Remove OTP and otpExpires
      await User?.updateOne(
        { email, otp },
        { $unset: { otp: 1, otpExpires: 1 } }
      );

      const response = await returnTokenBasedResponse(
        userData,
        userData[0].organizationId
      );
      return response;
    } else {
      return NextResponse.json(
        { message: "Invalid or expired OTP" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

const returnTokenBasedResponse = async (obj: any, orgId: string) => {
  const token = await signToken(obj[0], orgId);

  const response = NextResponse.json({
    message: "Logged In Successfully",
    user: token,
  });

  // SECURITY FIX: Use secure token system with improved security
  setSecureAuthTokens(response, token, {
    expires: 30, // 30 days
    maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
  });

  return response;
};

// Export with rate limiting
export async function POST(req: Request) {
  // SECURITY FIX: Apply rate limiting to prevent OTP brute force attacks
  return loginRateLimiter(req as NextRequest, handleVerifyOtp);
}
