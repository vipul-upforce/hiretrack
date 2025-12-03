import { NextRequest, NextResponse } from "next/server";
import connectToDatabase ,{ User } from "@/lib/mongodb";
import { signAccessToken } from "@/app/actions/auth";
import { setSecureAuthTokens, setSecureOrgId } from "@/lib/secureTokens";
import { loginRateLimiter } from "@/lib/rateLimiter";
import { generateRefreshToken, hashRefreshToken, storeRefreshToken, cleanupExpiredTokens } from "@/lib/refreshToken";
import crypto from "crypto";

async function handleVerifyOtp(req: NextRequest) {
  try {
    await connectToDatabase();
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
        userData[0].organizationId,
        req
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

const returnTokenBasedResponse = async (obj: any, orgId: string, req?: NextRequest) => {
  // Generate short-lived access token (15 minutes)
  const accessToken = await signAccessToken(obj[0], orgId);

  // Generate device info
  const deviceInfo = req?.headers.get("user-agent") || "Unknown Device";
  const userId = obj[0].id;
  const role = obj[0].role;
  const isCandidate = role === "candidate";
  
  // Cleanup expired tokens before storing new one (keeps array clean)
  await cleanupExpiredTokens(userId, isCandidate);
  
  // Generate deviceId
  const deviceId = crypto.randomUUID();
  
  // Generate refresh token using JWT (same method as access token)
  const refreshTokenPayload = {
    userId: userId,
    role: role,
    orgId: orgId,
    isCandidate: isCandidate,
    deviceId: deviceId,
    deviceInfo: deviceInfo,
  };
  
  const refreshToken = generateRefreshToken(refreshTokenPayload, orgId);
  const refreshTokenHash = hashRefreshToken(refreshToken);
  
  // Store hashed refresh token in database
  await storeRefreshToken(
    userId,
    refreshTokenHash,
    isCandidate,
    deviceId,
    deviceInfo,
    7 // 7 days
  );

  const response = NextResponse.json({
    message: "Logged In Successfully",
    user: accessToken,
    refreshToken: refreshToken, // Return JWT refresh token to client
    deviceId: deviceId,
  });

  // Set short-lived access token in cookie
  let resp = setSecureAuthTokens(response, accessToken, {
    expires: 0.0104, // ~15 minutes in days
    maxAge: 15 * 60, // 15 minutes in seconds
  });

  // Set refresh token in httpOnly cookie
  resp.cookies.set("refresh_token", refreshToken, {
    httpOnly: true,
    secure: process.env.ENVIRONMENT === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: "/",
  });
  
  // Set device_id cookie
  resp.cookies.set("device_id", deviceId, {
    httpOnly: true,
    secure: process.env.ENVIRONMENT === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: "/",
  });

  // Set secure organization ID
  resp = setSecureOrgId(resp, orgId, {
    expires: 7,
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });

  return resp;
};

// Export with rate limiting
export async function POST(req: Request) {
  // SECURITY FIX: Apply rate limiting to prevent OTP brute force attacks
  return loginRateLimiter(req as NextRequest, handleVerifyOtp);
}
