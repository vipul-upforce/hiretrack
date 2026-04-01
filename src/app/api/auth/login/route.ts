import { NextResponse, NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import connectToDatabase, {
  CandidateAccount,
  Settings,
  User,
  Organization,
} from '@/lib/mongodb';
import { OneOfMulOrganization } from '@/components/auth/OrganizationDialog';
import { IUser } from '@/lib/models/user';
import { IUCandidateAccount } from '@/lib/models/candidateAccount';
import { loginRateLimiter } from '@/lib/rateLimiter';
import { logger } from '@/lib/logger/logger.server';
import { returnTokenBasedResponse } from '@/lib/refreshToken';

const userLogin = async (
  users: IUser[],
  orgId: string,
  password: string,
  req: NextRequest,
) => {
  const user = users[0];
  if (orgId) {
    const userInOrg = users.find((u) => u.organizationId.toString() === orgId);
    if (!userInOrg) {
      return NextResponse.json(
        { error: 'Invalid organization ID' },
        { status: 401 },
      );
    }

    // Check password for the specified organization
    const isPasswordValid = await bcrypt.compare(password, userInOrg.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 },
      );
    }

    const orgSettings = await Settings!
      .findOne({ organizationId: userInOrg.organizationId }, { _id: 0 })
      .select('fileStorage twoFA')
      .lean();

    if (orgSettings && orgSettings.twoFA && orgSettings.twoFA.enable2FA) {
      const response = NextResponse.json({
        message: 'Continuing to next step for 2fa',
        twofa: true,
        organizationId: orgId,
        isCandidate: false,
      });
      response.headers.set('X-Content-Type-Options', 'nosniff');
      // response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('X-Frame-Options', 'SAMEORIGIN');
      response.headers.set('X-XSS-Protection', '1; mode=block');
      response.headers.set(
        'Referrer-Policy',
        'strict-origin-when-cross-origin',
      );

      return response;
    }

    const userTokenObj = {
      id: userInOrg._id.toString(),
      name: userInOrg.name,
      email: userInOrg.email,
      role: userInOrg.role,
      tokenVersion: userInOrg.tokenVersion,
      organizationId: userInOrg.organizationId.toString(),
      fileStorage: orgSettings?.fileStorage?.storageType,
    };

    const response = await returnTokenBasedResponse(userTokenObj);
    return response;
  }

  // Collect organization info
  const orgs = [];
  for (const user1 of users) {
    const orgInfo = await Organization!
      .findById(user1.organizationId)
      .select('name _id')
      .lean();
    orgs.push({
      orgId: user1.organizationId,
      name: orgInfo?.name,
      isCandidate: false,
    });
  }

  // If user exists in multiple organizations, return the organizations
  if (orgs.length > 1) {
    return NextResponse.json(
      {
        organizations: orgs,
        loggedIn: false,
        message:
          'User exists in multiple organizations. Please specify the organization to login.',
      },
      { status: 200 },
    );
  }
  if (orgs.length === 1 && users.length === 1) {
    return userLogin(users, orgs[0].orgId.toString(), password, req);
  }

  // If user exists in a single organization, proceed to check password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const fileStorage = await Settings!
    .findOne({ organizationId: user.organizationId }, { _id: 0 })
    .select('fileStorage')
    .lean();

  const tokenObj = {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId.toString(),
    tokenVersion: user.tokenVersion,

    fileStorage: fileStorage?.fileStorage?.storageType,
  };
  const response = await returnTokenBasedResponse(tokenObj);
  return response;
};

const candidateLogin = async (
  candidates: IUCandidateAccount[],
  orgId: string,
  password: string,
  req: NextRequest,
) => {
  const candidate = candidates[0];
  if (orgId) {
    const candidateInOrg = candidates.find(
      (c) => c.organizationId.toString() === orgId,
    );
    if (!candidateInOrg) {
      return NextResponse.json(
        { error: 'Invalid organization ID' },
        { status: 401 },
      );
    }

    // Check password for the specified organization
    const isPasswordValid = await bcrypt.compare(
      password,
      candidateInOrg.password,
    );
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 },
      );
    }
    const fileStorageResult = await Settings!
      .findOne({ organizationId: candidateInOrg.organizationId }, { _id: 0 })
      .select('fileStorage twoFA')
      .lean();
    const fileStorage = fileStorageResult?.fileStorage?.storageType as string;
    const twoFA = fileStorageResult?.twoFA?.enable2FA as boolean;

    if (twoFA) {
      const response = NextResponse.json({
        message: 'Continuing to next step for 2fa',
        twofa: true,
        organizationId: orgId,
        isCandidate: true,
      });
      response.headers.set('X-Content-Type-Options', 'nosniff');
      // response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('X-Frame-Options', 'SAMEORIGIN');
      response.headers.set('X-XSS-Protection', '1; mode=block');
      response.headers.set(
        'Referrer-Policy',
        'strict-origin-when-cross-origin',
      );

      return response;
    }

    const tokenObj = {
      id: candidateInOrg._id.toString(),
      name: candidateInOrg.name,
      email: candidateInOrg.email,
      appliedApplications: candidateInOrg.appliedApplications,
      role: 'candidate',
      organizationId: candidateInOrg.organizationId.toString(),
      fileStorage,
      tokenVersion: undefined,
    };
    const response = await returnTokenBasedResponse(tokenObj);
    return response;
  }

  // Collect organization info
  const orgs = [];
  for (const c of candidates) {
    const orgInfo = await Organization!
      .findById(c.organizationId)
      ?.select('name _id')
      .lean();
    orgs.push({
      orgId: c.organizationId.toString(),
      name: orgInfo?.name,
      isCandidate: true,
    });
  }

  // If candidate exists in multiple organizations, return the organizations
  if (orgs.length > 1) {
    return NextResponse.json(
      {
        organizations: orgs,
        message:
          'Candidate exists in multiple organizations. Please specify the organization for login.',
      },
      { status: 200 },
    );
  }

  if (orgs.length === 1 && candidates.length === 1) {
    return candidateLogin(candidates, orgs[0].orgId.toString(), password, req);
  }

  const [fileStorageResult, isPasswordValid] = await Promise.all([
    Settings!
      .findOne({ organizationId: candidate.organizationId }, { _id: 0 })
      .select('fileStorage')
      .lean(),
    bcrypt.compare(password, candidate.password),
  ]);
  const fileStorage = fileStorageResult?.fileStorage?.storageType as string;
  if (!isPasswordValid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const tokenObj = {
    id: candidate._id.toString(),
    name: candidate.name,
    email: candidate.email,
    appliedApplications: candidate.appliedApplications,
    role: 'candidate',
    organizationId: candidate.organizationId.toString(),
    fileStorage,
    tokenVersion: undefined,
  };
  const response = await returnTokenBasedResponse(tokenObj);
  return response;
};

const checkMultipleOrgs = async (
  orgId: string,
  users: IUser[],
  candidates: IUCandidateAccount[],
  password: string,
) => {
  if (orgId) {
    // Find user and candidate in the specified organization
    const userInOrg = users.find(
      (user) => user.organizationId.toString() === orgId,
    );
    const candidateInOrg = candidates.find(
      (candidate) => candidate.organizationId.toString() === orgId,
    );

    // Check if either account exists in the specified org
    if (!userInOrg && !candidateInOrg) {
      return NextResponse.json(
        { error: 'Invalid organization ID' },
        { status: 401 },
      );
    }

    // If both user and candidate accounts exist for this organization
    if (userInOrg && candidateInOrg) {
      // Create array with both account types
      const accounts = [];

      // Verify password for user account
      const isUserPasswordValid = await bcrypt.compare(
        password,
        userInOrg.password,
      );

      // Verify password for candidate account
      const isCandidatePasswordValid = await bcrypt.compare(
        password,
        candidateInOrg.password,
      );

      // Return error if both passwords are invalid
      if (!isUserPasswordValid && !isCandidatePasswordValid) {
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 },
        );
      }

      // Add user account if password is valid
      if (isUserPasswordValid) {
        const fileStorage = await Settings!
          .findOne({ organizationId: userInOrg.organizationId }, { _id: 0 })
          .select('fileStorage')
          .lean();

        accounts.push({
          id: userInOrg._id.toString(),
          name: userInOrg.name,
          email: userInOrg.email,
          role: userInOrg.role,
          organizationId: userInOrg.organizationId.toString(),
          isCandidate: false,

          fileStorage: fileStorage?.fileStorage?.storageType,
        });
      }

      // Add candidate account if password is valid
      if (isCandidatePasswordValid) {
        accounts.push({
          id: candidateInOrg._id.toString(),
          name: candidateInOrg.email,
          email: candidateInOrg.email,
          role: 'candidate',
          organizationId: candidateInOrg.organizationId.toString(),
          isCandidate: true,
          appliedApplications: candidateInOrg.appliedApplications,
          tokenVersion: undefined,
        });
      }

      // Return both accounts for the user to choose
      return NextResponse.json(
        {
          accounts,
          message:
            'This email has multiple account types. Please select which account to use.',
        },
        { status: 200 },
      );
    }

    // Handle case where only user account exists
    if (userInOrg) {
      const isPasswordValid = await bcrypt.compare(
        password,
        userInOrg.password,
      );

      if (!isPasswordValid) {
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 },
        );
      }

      const fileStorageResult = await Settings!
        .findOne({ organizationId: userInOrg.organizationId }, { _id: 0 })
        .select('fileStorage twoFA')
        .lean();
      const fileStorage = fileStorageResult?.fileStorage?.storageType as string;
      const twoFA = fileStorageResult?.twoFA?.enable2FA as boolean;

      if (twoFA) {
        return NextResponse.json({
          message: 'Continuing to next step for 2fa',
          twofa: true,
          organizationId: userInOrg.organizationId.toString(),
          isCandidate: false,
        });
      }
      const tokenObj = {
        id: userInOrg._id.toString(),
        name: userInOrg.name,
        email: userInOrg.email,
        role: userInOrg.role,
        organizationId: userInOrg.organizationId.toString(),
        fileStorage: fileStorage as string,
        tokenVersion: userInOrg.tokenVersion,
      };

      const response = await returnTokenBasedResponse(tokenObj);
      return response;
    }

    // Handle case where only candidate account exists
    if (candidateInOrg) {
      const isPasswordValid = await bcrypt.compare(
        password,
        candidateInOrg.password,
      );
      if (!isPasswordValid) {
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 },
        );
      }

      const fileStorageResult = await Settings!
        .findOne({ organizationId: candidateInOrg.organizationId }, { _id: 0 })
        .select('fileStorage twoFA')
        .lean();

      const twoFA = fileStorageResult?.twoFA?.enable2FA as boolean;
      if (twoFA) {
        return NextResponse.json({
          message: 'Continuing to next step for 2fa',
          twofa: true,
          organizationId: candidateInOrg.organizationId.toString(),
          isCandidate: true,
        });
      }
      const tokenObj = {
        id: candidateInOrg._id.toString(),
        name: candidateInOrg.name,
        email: candidateInOrg.email,
        appliedApplications: candidateInOrg.appliedApplications,
        role: 'candidate',
        organizationId: candidateInOrg.organizationId.toString(),
        fileStorage: fileStorageResult?.fileStorage?.storageType,
        tokenVersion: undefined,
      };

      const response = await returnTokenBasedResponse(tokenObj);
      return response;
    }
  }

  // If no orgId provided, collect all organizations from both collections
  const orgs: OneOfMulOrganization[] = [];
  const orgMap = new Map(); // To track unique organizations

  // Add organizations from User collection
  for (const user of users) {
    const userOrgId = user.organizationId.toString();
    const orgInfo = await Organization!
      .findById(user.organizationId)
      .select('name _id');

    if (!orgMap.has(userOrgId)) {
      orgMap.set(userOrgId, {
        orgId: userOrgId.toString(),
        name: orgInfo?.name,
        isCandidate: false,
        accountTypes: ['user'],
      });
    } else {
      const org = orgMap.get(userOrgId);
      if (!org.accountTypes.includes('user')) {
        org.accountTypes.push('user');
      }
    }
  }

  // Add organizations from CandidateAccount collection
  for (const candidate of candidates) {
    const candidateOrgId = candidate.organizationId.toString();
    const orgInfo = await Organization!
      .findById(candidate.organizationId)
      .select('name _id');

    if (!orgMap.has(candidateOrgId)) {
      orgMap.set(candidateOrgId, {
        orgId: candidateOrgId.toString(),
        name: orgInfo?.name,
        isCandidate: true,
        accountTypes: ['candidate'],
      });
    } else {
      const org = orgMap.get(candidateOrgId);
      if (!org.accountTypes.includes('candidate')) {
        org.accountTypes.push('candidate');
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
        'Account exists in multiple organizations. Please specify the organization for login.',
    },
    { status: 200 },
  );
};
async function handleLogin(req: NextRequest) {
  try {
    await connectToDatabase();
    const { email, password, orgId } = await req.json();

    if (!User || !Organization || !Settings || !CandidateAccount) {
      return NextResponse.json(
        { error: 'Database not connected' },
        { status: 500 },
      );
    }

    // Find all organizations with the same email
    const users = await User.find({
      email,
      isDeleted: {
        $ne: true,
      },
    });
    const candidates = await CandidateAccount.find({
      email,
      isDeleted: {
        $ne: true,
      },
    }).lean();
    // Check if email exists in either collection
    if (users.length === 0 && candidates.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (users.length > 0 && candidates.length > 0) {
      return await checkMultipleOrgs(orgId, users, candidates, password);
    }

    // Check if user exists in User collection
    if (users.length > 0) {
      return await userLogin(users, orgId, password, req);
    }

    // Check if candidate exists
    if (candidates && candidates.length > 0) {
      return await candidateLogin(candidates, orgId, password, req);
    }

    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  } catch (error) {
    logger.error({ error }, 'Error during login');

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Return a default error response if error is not an Error instance
    return NextResponse.json(
      { error: 'An unexpected error occurred during login' },
      { status: 500 },
    );
  }
}
// Export with email-based rate limiting
export async function POST(req: NextRequest) {
  // SECURITY FIX: Apply cookie + IP rate limiting to prevent brute force attacks
  return loginRateLimiter(req, handleLogin);
}
