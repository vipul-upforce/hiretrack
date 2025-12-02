import { NextRequest, NextResponse } from "next/server";
import { generateRefreshToken, hashRefreshToken, verifyRefreshToken, updateRefreshToken, cleanupExpiredTokens, verifyAndDecryptRefreshToken } from "@/lib/refreshToken";
import { signAccessToken } from "@/app/actions/auth";
import connectToDatabase, { User, CandidateAccount } from "@/lib/mongodb";
import { passwordResetRateLimiter } from "@/lib/rateLimiter";
import { setSecureAuthTokens } from "@/lib/secureTokens";
import { validateAndUpdateLicense } from "@/lib/licenseUtils";

async function handleRefreshToken(req: NextRequest) {
  try {
    await connectToDatabase();
    const { refreshToken } = await req.json();
    console.log("refreshToken from body 88", refreshToken);
    if (!refreshToken) {
      return NextResponse.json(
        { error: "Refresh token is required" },
        { status: 400 }
      );
    }

    // STEP 1: Validate license BEFORE refreshing token (runs every 15 min)
    const licenseValidation = await validateAndUpdateLicense();
    if (!licenseValidation.valid) {
      // License is invalid - block token refresh
      return NextResponse.json(
        {
          error: "License validation failed",
          licenseError: licenseValidation.error,
          code: "LICENSE_INVALID",
        },
        { status: 403 } // 403 Forbidden - license issue
      );
    }

    // STEP 2: Decrypt and verify refresh token JWT (same method as access token)
    // First, try to decrypt without orgId (will fail, but we'll get error type)
    let tokenVerification = verifyAndDecryptRefreshToken(refreshToken, "");
    let orgId: string;
    let userId: string;
    let isCandidate: boolean;
    let deviceId: string | undefined;
    let deviceInfo: string | undefined;

    // If token is invalid, try to find orgId from database
    if (!tokenVerification.success || !tokenVerification.payload) {
      // Try to find user by hashed token in database to get orgId
      const tokenHash = hashRefreshToken(refreshToken);
      let user = await User.findOne({
        "refreshTokens.token": tokenHash,
        "refreshTokens.expiry": { $gt: new Date() },
      }).select("+refreshTokens");

      let foundIsCandidate = false;
      if (!user) {
        user = await CandidateAccount.findOne({
          "refreshTokens.token": tokenHash,
          "refreshTokens.expiry": { $gt: new Date() },
        }).select("+refreshTokens");
        foundIsCandidate = true;
      }

      if (!user) {
        return NextResponse.json(
          { error: "Invalid or expired refresh token" },
          { status: 401 }
        );
      }

      // Now try to decrypt with correct orgId
      orgId = user.organizationId.toString();
      tokenVerification = verifyAndDecryptRefreshToken(refreshToken, orgId);
      
      if (!tokenVerification.success || !tokenVerification.payload) {
        return NextResponse.json(
          { error: "Invalid or expired refresh token" },
          { status: 401 }
        );
      }

      isCandidate = foundIsCandidate;
    } else {
      // Token was successfully decrypted
      const payload = tokenVerification.payload!;
      orgId = payload.orgId;
      userId = payload.userId;
      isCandidate = payload.isCandidate || false;
      deviceId = payload.deviceId;
      deviceInfo = payload.deviceInfo;
    }

    const payload = tokenVerification.payload!;
    if (!userId) userId = payload.userId;
    if (!orgId) orgId = payload.orgId;
    if (isCandidate === undefined) isCandidate = payload.isCandidate || false;
    if (!deviceId) deviceId = payload.deviceId;
    if (!deviceInfo) deviceInfo = payload.deviceInfo;

    // STEP 3: Verify token exists in database
    await cleanupExpiredTokens(userId, isCandidate);

    const verification = await verifyRefreshToken(
      refreshToken,
      userId,
      orgId,
      isCandidate
    );

    if (!verification.valid) {
      return NextResponse.json(
        { error: "Invalid or expired refresh token" },
        { status: 401 }
      );
    }

    // STEP 4: Get user data
    const user = isCandidate
      ? await CandidateAccount.findById(userId)
      : await User.findById(userId);

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // STEP 5: Generate new access token
    const userPayload = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId.toString(),
      organizationInfo: (user as { organizationInfo?: unknown }).organizationInfo,
    };

    const newAccessToken = await signAccessToken(
      userPayload,
      orgId
    );

    // STEP 6: Token rotation - Generate new refresh token (JWT)
    const newRefreshTokenPayload = {
      userId: userId,
      orgId: orgId,
      isCandidate: isCandidate,
      deviceId: verification.deviceId || deviceId,
      deviceInfo: deviceInfo || verification.payload?.deviceInfo,
      role: user.role,
    };

    const newRefreshToken = generateRefreshToken(newRefreshTokenPayload, orgId);
    const newRefreshTokenHash = hashRefreshToken(newRefreshToken);
    const oldTokenHash = hashRefreshToken(refreshToken);
    
    // Update the specific token entry (token rotation)
    await updateRefreshToken(
      userId,
      oldTokenHash,
      newRefreshTokenHash,
      isCandidate
    );

    // STEP 5: Return new tokens
    const response = NextResponse.json({
      message: "Token refreshed successfully",
      refreshToken: newRefreshToken,
      licenseValid: true,
    });

    setSecureAuthTokens(response, newAccessToken, {
      expires: 0.0104, // ~15 minutes in days
      maxAge: 15 * 60, // 15 minutes in seconds
    });

    return response;
  } catch (error) {
    // Log error for debugging (remove console.error if using a logger)
    console.log("Refresh token error from api/auth/refresh/route.ts 88", error);
    return NextResponse.json(
      { error: "Failed to refresh token" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  return await handleRefreshToken(req as NextRequest);
}

