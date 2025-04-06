import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect, { CandidateAccount, Settings } from "@/lib/mongodb";
import { signToken } from "@/lib/jwt";
import { User, Organization } from "@/lib/mongodb";

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
    const users = await User.find({ email, isDeleted: { $ne: true } });
    const candidate = await CandidateAccount.findOne({ email });

    // Check if user exists in User collection
    if (users.length > 0) {
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

        const orgInfo = await Organization.findById(userInOrg.organizationId);
        const fileStorage = await Settings.findOne(
          { organizationId: userInOrg.organizationId },
          { _id: 0 }
        )
          .select("fileStorage")
          .lean();

        const token = signToken({
          id: userInOrg._id,
          email: userInOrg.email,
          role: userInOrg.role,
          name: userInOrg.name,
        });

        const response = NextResponse.json({
          user: {
            id: userInOrg._id.toString(),
            name: userInOrg.name,
            email: userInOrg.email,
            role: userInOrg.role,
            organizationId: userInOrg.organizationId,
            organizationInfo: orgInfo,
            fileStorage: fileStorage?.fileStorage?.storageType,
          },
        });

        response.cookies.set("token", token, {
          httpOnly: false,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 30 * 24 * 60 * 60,
        });

        return response;
      }

      // Collect organization info
      const orgs = [];
      for (const user of users) {
        const orgInfo = await Organization.findById(user.organizationId);
        orgs.push({
          orgId: user.organizationId,
          name: orgInfo?.name,
        });
      }

      // If user exists in multiple organizations, return the organizations
      if (orgs.length > 1) {
        return NextResponse.json(
          {
            organizations: orgs,
            message:
              "User exists in multiple organizations. Please specify the organization for login.",
          },
          { status: 200 }
        );
      }

      // If user exists in a single organization, proceed to check password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return NextResponse.json(
          { error: "Invalid credentials" },
          { status: 401 }
        );
      }

      const orgInfo = await Organization.findById(user.organizationId);
      const fileStorage = await Settings.findOne(
        { organizationId: user.organizationId },
        { _id: 0 }
      )
        .select("fileStorage")
        .lean();

      const token = signToken({
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name,
      });

      const response = NextResponse.json({
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId,
          organizationInfo: orgInfo,
          fileStorage: fileStorage?.fileStorage?.storageType,
        },
      });

      response.cookies.set("token", token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });

      return response;
    }

    // Check if candidate exists
    if (candidate) {
      // Check password for candidate
      const isPasswordValid = await bcrypt.compare(
        password,
        candidate.password
      );
      if (!isPasswordValid) {
        return NextResponse.json(
          { error: "Invalid credentials" },
          { status: 401 }
        );
      }

      const token = signToken({
        id: candidate._id,
        email: candidate.email,
        role: "candidate",
        name: candidate.email,
      });
      const orgInfo = await Organization.findById(candidate.organizationId, {
        adminId: 0,
        lanes: 0,
      });
      // console.log("************ ",candidate.organizationInfo)
      const response = NextResponse.json({
        user: {
          id: candidate._id.toString(),
          name: candidate.email,
          email: candidate.email,
          appliedApplications: candidate.appliedApplications,
          role: "candidate",
          organizationId: candidate.organizationId,
          organizationInfo: orgInfo,
        },
      });

      response.cookies.set("token", token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 30 * 24 * 60 * 60,
      });

      return response;
    }

    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
}
