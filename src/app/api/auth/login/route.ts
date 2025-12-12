import { NextResponse, NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import connectToDatabase, { CandidateAccount, Settings,User, Organization  } from "@/lib/mongodb";
import { OneOfMulOrganization } from "@/components/auth/OrganizationDialog";
import { IUser } from "@/lib/models/user";
import { IUCandidateAccount } from "@/lib/models/candidateAccount";
import { setSecureAuthTokens, setSecureOrgId } from "@/lib/secureTokens";
import { emailLoginRateLimiter } from "@/lib/rateLimiter";
import { signAccessToken } from "@/app/actions/auth";
import { generateRefreshToken, hashRefreshToken, storeRefreshToken, cleanupExpiredTokens } from "@/lib/refreshToken";
import crypto from "crypto";
import { UserWithoutCF } from "@/types/login";

async function handleLogin(req: NextRequest) {
  try {
    await connectToDatabase();
    const { email, password, orgId } = await req.json();

    if (!User || !Organization || !Settings || !CandidateAccount) {
      return NextResponse.json(
        { error: "Database not connected" },
        { status: 500 }
      );
    }

    // Find all organizations with the same email
    const users = await User.find({
      email,
      isDeleted: {
        $ne: true,
      },
    });
    const candidates = await CandidateAccount.find({ email }).lean();
    // Log for debugging (remove console.log if using a logger)
    // console.log(users, "users");
    // console.log(candidates, "candidates");

    // Check if email exists in either collection
    if (users.length === 0 && candidates.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (users.length > 0 && candidates.length > 0) {
      return await checkMultipleOrgs(orgId, users, candidates, password, req);
    }

    // Check if user exists in User collection
    if (users.length > 0) {
      return await userLogin(users, orgId, password, req);
    }

    // Check if candidate exists
    if (candidates && candidates.length > 0) {
      return await candidateLogin(candidates, orgId, password, req);
    }

    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  } catch (error) {
    // console.log(error, "Err Of Login ");

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
}

const userLogin = async (users: IUser[], orgId: string, password: string, req: NextRequest) => {
  const user = users[0];
  if (orgId) {
    const userInOrg = users.find(
      (user) => user.organizationId.toString() === orgId
    );
    if (!userInOrg) {
      return NextResponse.json(
        { error: "Invalid organization ID" },
        { status: 401 }
      );
    }

    // Check password for the specified organization
    const isPasswordValid = await bcrypt.compare(password, userInOrg.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const orgInfo = await Organization!
      .findById(userInOrg.organizationId)
      .lean();
    const orgSettings = await Settings!
      .findOne({ organizationId: userInOrg.organizationId }, { _id: 0 })
      .select("fileStorage twoFA")
      .lean();

    if (orgSettings.twoFA.enable2FA) {
      const response = NextResponse.json({
        message: "Continuing to next step for 2fa",
        twofa: true,
        organizationId: orgId,
      });
      response.headers.set("X-Content-Type-Options", "nosniff");
      // response.headers.set("X-Frame-Options", "DENY");
      response.headers.set("X-Frame-Options", "SAMEORIGIN");
      response.headers.set("X-XSS-Protection", "1; mode=block");
      response.headers.set(
        "Referrer-Policy",
        "strict-origin-when-cross-origin"
      );

      return response;
    }

    const user = {
      id: userInOrg._id.toString(),
      name: userInOrg.name,
      email: userInOrg.email,
      role: userInOrg.role,
      tokenVersion: userInOrg.tokenVersion,
      organizationId: userInOrg.organizationId,
      organizationInfo: orgInfo,
      fileStorage: orgSettings?.fileStorage?.storageType,
    };

    const response = await returnTokenBasedResponse(user, req);
    return response;
  }

  // Collect organization info
  const orgs = [];
  for (const user of users) {
    const orgInfo = await Organization!.findById(user.organizationId);
    orgs.push({
      orgId: user.organizationId,
      name: orgInfo?.name,
      isCandidate: false,
    });
  }

  // If user exists in multiple organizations, return the organizations
  if (orgs.length > 1) {
    return NextResponse.json(
      {
        organizations: orgs,
        message:
          "User exists in multiple organizations. Please specify the organization to login.",
      },
      { status: 200 }
    );
  }

  // If user exists in a single organization, proceed to check password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const orgInfo = await Organization!.findById(user.organizationId).lean();
  const fileStorage = await Settings!
    .findOne({ organizationId: user.organizationId }, { _id: 0 })
    .select("fileStorage")
    .lean();

  const tokenObj = {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId,
    tokenVersion: user.tokenVersion,
    organizationInfo: orgInfo,
    fileStorage: fileStorage?.fileStorage?.storageType,
  };
  const response = await returnTokenBasedResponse(tokenObj, req);
  return response;
};

const candidateLogin = async (
  candidates: IUCandidateAccount[],
  orgId: string,
  password: string,
  req: NextRequest
) => {
  const candidate = candidates[0];
  if (orgId) {
    const candidateInOrg = candidates.find(
      (candidate) => candidate.organizationId.toString() === orgId
    );
    if (!candidateInOrg) {
      return NextResponse.json(
        { error: "Invalid organization ID" },
        { status: 401 }
      );
    }
    const fileStorage = await Settings!
      .findOne({ organizationId: candidateInOrg.organizationId }, { _id: 0 })
      .select("fileStorage")
      .lean();

    // Check password for the specified organization
    const isPasswordValid = await bcrypt.compare(
      password,
      candidateInOrg.password
    );
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const orgInfo = await Organization!
      .findById(candidateInOrg.organizationId, {
        adminId: 0,
        lanes: 0,
      })
      .lean();
    const tokenObj = {
      id: candidateInOrg._id.toString(),
      name: candidateInOrg.name,
      email: candidateInOrg.email,
      appliedApplications: candidateInOrg.appliedApplications,
      role: "candidate",
      organizationId: candidateInOrg.organizationId,
      organizationInfo: orgInfo,
      fileStorage: fileStorage?.fileStorage?.storageType,
    };
    const response = await returnTokenBasedResponse(tokenObj, req);
    return response;
  }

  // Collect organization info
  const orgs = [];
  for (const candidate of candidates) {
    const orgInfo = await Organization!.findById(candidate.organizationId);
    orgs.push({
      orgId: candidate.organizationId,
      name: orgInfo?.name,
      isCandidate: true,
    });
  }
  const fileStorage = await Settings!
    .findOne({ organizationId: candidate.organizationId }, { _id: 0 })
    .select("fileStorage")
    .lean();

  // If candidate exists in multiple organizations, return the organizations
  if (orgs.length > 1) {
    return NextResponse.json(
      {
        organizations: orgs,
        message:
          "Candidate exists in multiple organizations. Please specify the organization for login.",
      },
      { status: 200 }
    );
  }

  // If candidate exists in a single organization, proceed to check password
  const isPasswordValid = await bcrypt.compare(password, candidate.password);
  if (!isPasswordValid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const orgInfo = await Organization!
    .findById(candidate.organizationId, {
      adminId: 0,
      lanes: 0,
    })
    .lean();

  const tokenObj = {
    id: candidate._id.toString(),
    name: candidate.name,
    email: candidate.email,
    appliedApplications: candidate.appliedApplications,
    role: "candidate",
    organizationId: candidate.organizationId,
    organizationInfo: orgInfo,
    fileStorage: fileStorage?.fileStorage?.storageType,
  };
  const response = await returnTokenBasedResponse(tokenObj, req);
  return response;
};

const checkMultipleOrgs = async (
  orgId: string,
  users: IUser[],
  candidates: IUCandidateAccount[],
  password: string,
  req: NextRequest
) => {
  if (orgId) {
    // Find user and candidate in the specified organization
    const userInOrg = users.find(
      (user) => user.organizationId.toString() === orgId
    );
    const candidateInOrg = candidates.find(
      (candidate) => candidate.organizationId.toString() === orgId
    );

    // Check if either account exists in the specified org
    if (!userInOrg && !candidateInOrg) {
      return NextResponse.json(
        { error: "Invalid organization ID" },
        { status: 401 }
      );
    }

    // If both user and candidate accounts exist for this organization
    if (userInOrg && candidateInOrg) {
      // Create array with both account types
      const accounts = [];

      // Verify password for user account
      const isUserPasswordValid = await bcrypt.compare(
        password,
        userInOrg.password
      );

      // Verify password for candidate account
      const isCandidatePasswordValid = await bcrypt.compare(
        password,
        candidateInOrg.password
      );

      // Return error if both passwords are invalid
      if (!isUserPasswordValid && !isCandidatePasswordValid) {
        return NextResponse.json(
          { error: "Invalid credentials" },
          { status: 401 }
        );
      }

      // Get organization info
      const orgInfo = await Organization!.findById(orgId);

      // Add user account if password is valid
      if (isUserPasswordValid) {
        const fileStorage = await Settings!
          .findOne({ organizationId: userInOrg.organizationId }, { _id: 0 })
          .select("fileStorage")
          .lean();

        accounts.push({
          id: userInOrg._id.toString(),
          name: userInOrg.name,
          email: userInOrg.email,
          role: userInOrg.role,
          organizationId: userInOrg.organizationId.toString(),
          isCandidate: false,
          organizationInfo: orgInfo,
          fileStorage: fileStorage?.fileStorage?.storageType,
        });
      }

      // Add candidate account if password is valid
      if (isCandidatePasswordValid) {
        accounts.push({
          id: candidateInOrg._id.toString(),
          name: candidateInOrg.email,
          email: candidateInOrg.email,
          role: "candidate",
          organizationId: candidateInOrg.organizationId.toString(),
          isCandidate: true,
          appliedApplications: candidateInOrg.appliedApplications,
          organizationInfo: orgInfo,
        });
      }

      // Return both accounts for the user to choose
      return NextResponse.json(
        {
          accounts,
          message:
            "This email has multiple account types. Please select which account to use.",
        },
        { status: 200 }
      );
    }

    // Handle case where only user account exists
    if (userInOrg) {
      const isPasswordValid = await bcrypt.compare(
        password,
        userInOrg.password
      );

      if (!isPasswordValid) {
        return NextResponse.json(
          { error: "Invalid credentials" },
          { status: 401 }
        );
      }

      const orgInfo = await Organization!
        .findById(userInOrg.organizationId)
        .lean();
      const fileStorage = await Settings!
        .findOne({ organizationId: userInOrg.organizationId }, { _id: 0 })
        .select("fileStorage")
        .lean();

      const tokenObj = {
        id: userInOrg._id.toString(),
        name: userInOrg.name,
        email: userInOrg.email,
        role: userInOrg.role,
        organizationId: userInOrg.organizationId,
        organizationInfo: orgInfo,
        fileStorage: fileStorage?.fileStorage?.storageType,
        tokenVersion: userInOrg.tokenVersion,
      };

      const response = await returnTokenBasedResponse(tokenObj, req);
      return response;
    }

    // Handle case where only candidate account exists
    if (candidateInOrg) {
      const isPasswordValid = await bcrypt.compare(
        password,
        candidateInOrg.password
      );
      const fileStorage = await Settings!
        .findOne({ organizationId: candidateInOrg.organizationId }, { _id: 0 })
        .select("fileStorage")
        .lean();

      if (!isPasswordValid) {
        return NextResponse.json(
          { error: "Invalid credentials" },
          { status: 401 }
        );
      }

      const orgInfo = await Organization!
        .findById(candidateInOrg.organizationId, {
          adminId: 0,
          lanes: 0,
        })
        .lean();

      const tokenObj = {
        id: candidateInOrg._id.toString(),
        name: candidateInOrg.name,
        email: candidateInOrg.email,
        appliedApplications: candidateInOrg.appliedApplications,
        role: "candidate",
        organizationId: candidateInOrg.organizationId,
        organizationInfo: orgInfo,
        fileStorage: fileStorage?.fileStorage?.storageType,
      };

      const response = await returnTokenBasedResponse(tokenObj, req);
      return response;
    }
  }

  // If no orgId provided, collect all organizations from both collections
  const orgs: OneOfMulOrganization[] = [];
  const orgMap = new Map(); // To track unique organizations

  // Add organizations from User collection
  for (const user of users) {
    const orgId = user.organizationId.toString();
    const orgInfo = await Organization!.findById(user.organizationId);

    if (!orgMap.has(orgId)) {
      orgMap.set(orgId, {
        orgId,
        name: orgInfo?.name,
        isCandidate: false,
        accountTypes: ["user"],
      });
    } else {
      const org = orgMap.get(orgId);
      if (!org.accountTypes.includes("user")) {
        org.accountTypes.push("user");
      }
    }
  }

  // Add organizations from CandidateAccount collection
  for (const candidate of candidates) {
    const orgId = candidate.organizationId.toString();
    const orgInfo = await Organization!.findById(candidate.organizationId);

    if (!orgMap.has(orgId)) {
      orgMap.set(orgId, {
        orgId,
        name: orgInfo?.name,
        isCandidate: true,
        accountTypes: ["candidate"],
      });
    } else {
      const org = orgMap.get(orgId);
      if (!org.accountTypes.includes("candidate")) {
        org.accountTypes.push("candidate");
      }
    }
  }

  // Convert map to array
  orgMap.forEach((org) => {
    orgs.push(org);
  });

  // Return the list of organizations with account type information
  return NextResponse.json(
    {
      organizations: orgs,
      message:
        "Account exists in multiple organizations. Please specify the organization for login.",
    },
    { status: 200 }
  );
};

const returnTokenBasedResponse = async (obj: any, req?: NextRequest) => {
  const userWithoutCustomFields: UserWithoutCF = {
    ...obj,
  };
  if (userWithoutCustomFields.organizationInfo) {
    userWithoutCustomFields.organizationInfo = {
      ...userWithoutCustomFields.organizationInfo,
    };
    delete userWithoutCustomFields.organizationInfo.customFields;
  }

  // Generate short-lived access token (15 minutes)
  const accessToken = await signAccessToken(
    userWithoutCustomFields,
    obj.organizationId.toString()
  );

  // Generate device info
  const deviceInfo = req?.headers.get("user-agent") || "Unknown Device";
  const userId = obj.id || obj._id.toString();
  const role = obj.role;
  const isCandidate = role === "candidate";
  const orgId = obj.organizationId.toString();
  
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
    tokenVersion: obj.tokenVersion,
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
  resp = setSecureOrgId(resp, obj.organizationId, {
    expires: 7,
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });

  return resp;
};

// Export with email-based rate limiting
export async function POST(req: Request) {
  // SECURITY FIX: Apply email-based rate limiting to prevent brute force attacks
  return emailLoginRateLimiter(req as NextRequest, handleLogin);
}
