import { NextRequest, NextResponse } from "next/server";
import {
  generateRefreshToken,
  hashRefreshToken,
  verifyRefreshToken,
  updateRefreshToken,
  cleanupExpiredTokens,
  verifyAndDecryptRefreshToken,
} from "@/lib/refreshToken";
import { signAccessToken } from "@/app/actions/auth";
import connectToDatabase, {
  User,
  CandidateAccount,
  Settings,
} from "@/lib/mongodb";
import { setSecureAuthTokens } from "@/lib/secureTokens";
import { validateLicense } from "@/lib/licenseUtils";
import { UserRole } from "@/lib/models/JobLaneConfig";
import { IUser } from "@/lib/models/user";
import { setAuthCookies } from "@/lib/authCookies";

async function handleRefreshToken(req: NextRequest) {
  try {
    await connectToDatabase();

    // Read refresh token from httpOnly cookie only
    const refreshToken = req.cookies.get("refresh_token")?.value;
    
    if (!refreshToken) {
      return NextResponse.json(
        { error: "Refresh token is required" },
        { status: 400 }
      );
    }

    // STEP 1: Validate license BEFORE refreshing token (runs every 15 min)
    const licenseValidation = await validateLicense();
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
    let tokenVersion: number | undefined;
    let role: UserRole | undefined;
    // If token is invalid, try to find orgId from database
    if (!tokenVerification.success || !tokenVerification.payload) {
      // Try to find user by hashed token in database to get orgId
      const tokenHash = hashRefreshToken(refreshToken);

      console.log(tokenHash, "tokenHash-65");


      let user = await User.findOne({
        "refreshTokens.token": tokenHash,
        "refreshTokens.expiry": { $gt: new Date() },
      }).select("+refreshTokens organizationId");

      let foundIsCandidate = false;
      if (!user) {
        user = await CandidateAccount.findOne({
          "refreshTokens.token": tokenHash,
          "refreshTokens.expiry": { $gt: new Date() },
        }).select("+refreshTokens");
        foundIsCandidate = true;
      } 
      console.log(user , "user-77");

      if (!user) {
        return NextResponse.json(
          { error: "Invalid or expired refresh token" },
          { status: 401 }
        );
      }

      // Now try to decrypt with correct orgId
      orgId = user.organizationId.toString();
      tokenVerification = verifyAndDecryptRefreshToken(refreshToken, orgId);
      console.log(tokenVerification, "tokenVerification-89");
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
      tokenVersion = payload.tokenVersion;
      role = payload.role as UserRole;
    }

    const payload = tokenVerification.payload!;
    if (!userId) userId = payload.userId;
    if (!orgId) orgId = payload.orgId;
    if (isCandidate === undefined) isCandidate = payload.isCandidate || false;
    if (!deviceId) deviceId = payload.deviceId;
    if (!deviceInfo) deviceInfo = payload.deviceInfo;
    if (!tokenVersion) tokenVersion = payload.tokenVersion;
    if (!role) role = payload.role as UserRole;

    // STEP 3: Verify token exists in database
    await cleanupExpiredTokens(userId, isCandidate);

    const verification = await verifyRefreshToken(
      refreshToken,
      userId,
      orgId,
      isCandidate
    );

    console.log(verification, "verification-129");
    if (!verification.valid) {
      return NextResponse.json(
        { error: "Invalid or expired refresh token" },
        { status: 401 }
      );
    }

    // STEP 4: Get user data
    const user = isCandidate
      ? await CandidateAccount.findById(userId)
          .select("name _id role email organizationId")
          .populate("organizationId")
      : await User.findById(userId)
          .select("tokenVersion name _id role email organizationId")
          .populate("organizationId");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const fileStorage = await Settings.findOne({ organizationId: orgId })
      .select("fileStorage")
      .lean();

    // STEP 5: Generate new access token
    const orgSource = user.organizationId as unknown;
    const orgObject =
      typeof (orgSource as { toObject?: () => unknown })?.toObject === "function"
        ? (orgSource as { toObject: () => unknown }).toObject()
        : orgSource;

    const userPayload = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: orgId,
      organizationInfo: user?.organizationId
        ? { ...(orgObject as Record<string, unknown>) }
        : undefined,
      tokenVersion: !isCandidate
        ? (user as IUser)?.tokenVersion || undefined
        : undefined,
      fileStorage: fileStorage?.fileStorage?.storageType as string,
    };

    // Remove customFields from organizationInfo (same as login route)
    if (userPayload.organizationInfo) {
      const orgInfo = userPayload
        .organizationInfo as Record<string, unknown>;
      if ("customFields" in orgInfo) {
        delete orgInfo.customFields;
      }
    }
    console.log("userPayload-189",userPayload)
    const newAccessToken = await signAccessToken(userPayload, orgId);
    console.log("newAccessToken-191",newAccessToken)
    // STEP 6: Token rotation - Generate new refresh token (JWT)
    const newRefreshTokenPayload = {
      userId: userId,
      orgId: orgId,
      isCandidate: isCandidate,
      deviceId: verification.deviceId || deviceId,
      deviceInfo: deviceInfo || verification.payload?.deviceInfo,
      role: user.role,
      tokenVersion: !isCandidate
        ? (user as IUser)?.tokenVersion || undefined
        : undefined,
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

    // STEP 7: Set new tokens and related cookies using shared utility
    const response = NextResponse.json({
      message: "Token refreshed successfully",
      licenseValid: true,
    });

    const nextDeviceId = verification.deviceId || deviceId!;

    setAuthCookies({
      response,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      deviceId: nextDeviceId,
      orgId,
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Failed to refresh token" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  return await handleRefreshToken(req as NextRequest);
}
