import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect, { CandidateAccount, Settings } from "@/lib/mongodb";
import { signToken } from "@/lib/jwt";
import { User, Organization } from "@/lib/mongodb";
import { OneOfMulOrganization } from "@/components/auth/OrganizationDialog";
import { IUser } from "@/lib/models/user";
import { IUCandidateAccount } from "@/lib/models/candidateAccount";

export async function POST(req: Request) {
  try {
    await dbConnect();
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

    if (users.length > 0 && candidates.length > 0) {
      return await checkMultipleOrgs(orgId, users, candidates, password);
    }

    // Check if user exists in User collection
    if (users.length > 0) {
      return await userLogin(users, orgId, password);
    }

    // Check if candidate exists
    if (candidates && candidates.length > 0) {
      return await candidateLogin(candidates, orgId, password);
    }

    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
}

const userLogin = async (users: IUser[], orgId: string, password: string) => {
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

    const orgInfo = await Organization!.findById(userInOrg.organizationId);
    const fileStorage = await Settings!
      .findOne({ organizationId: userInOrg.organizationId }, { _id: 0 })
      .select("fileStorage")
      .lean();

    const user = {
      id: userInOrg._id.toString(),
      name: userInOrg.name,
      email: userInOrg.email,
      role: userInOrg.role,
      organizationId: userInOrg.organizationId,
      organizationInfo: orgInfo,
      fileStorage: fileStorage?.fileStorage?.storageType,
    };

    const response = returnTokenBasedResponse(user);
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

  const orgInfo = await Organization!.findById(user.organizationId);
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
    organizationInfo: orgInfo,
    fileStorage: fileStorage?.fileStorage?.storageType,
  };
  const response = returnTokenBasedResponse(tokenObj);
  return response;
};

const candidateLogin = async (
  candidates: IUCandidateAccount[],
  orgId: string,
  password: string
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

    const orgInfo = await Organization!.findById(
      candidateInOrg.organizationId,
      {
        adminId: 0,
        lanes: 0,
      }
    );
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
    const response = returnTokenBasedResponse(tokenObj);
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

  const orgInfo = await Organization!.findById(candidate.organizationId, {
    adminId: 0,
    lanes: 0,
  });

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
  const response = returnTokenBasedResponse(tokenObj);
  return response;
};

const checkMultipleOrgs = async (
  orgId: string,
  users: IUser[],
  candidates: IUCandidateAccount[],
  password: string
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

      const orgInfo = await Organization!.findById(userInOrg.organizationId);
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
      };

      const response = await returnTokenBasedResponse(tokenObj);
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

      const orgInfo = await Organization!.findById(
        candidateInOrg.organizationId,
        {
          adminId: 0,
          lanes: 0,
        }
      );

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

      const response = await returnTokenBasedResponse(tokenObj);
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

const returnTokenBasedResponse = async (obj: unknown) => {
  const token = signToken(obj);

  const response = NextResponse.json({
    message: "Logged In Successfully",
    user: token,
  });

  response.cookies.set("token", token, {
    httpOnly: false,
    sameSite: "strict",
    // expires: new Date(Date.now() + 2 * 60 * 1000),
    expires: 30,
    // maxAge: 30 * 24 * 60 * 60,
  });

  return response;
};
