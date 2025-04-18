import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect, { CandidateAccount, Organization, User } from "@/lib/mongodb";
import { signToken } from "@/lib/jwt";

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { email, password, name, orgName } = await req.json();

    if (!CandidateAccount || !Organization || !User) {
      return NextResponse.json(
        { error: "Database not connected" },
        { status: 400 }
      );
    }

    let organizationInfo;
    let organizationId;

    if (orgName) {
      // If orgName is provided, find the organization by name
      organizationInfo = await Organization.findOne(
        { name: orgName },
        {
          adminId: 0,
          lanes: 0,
        }
      );
      if (!organizationInfo) {
        return NextResponse.json(
          { error: `Organization "${orgName}" not found` },
          { status: 404 }
        );
      }
      organizationId = organizationInfo._id;
    } else {
      // If orgName is not provided, find the first organization
      organizationInfo = await Organization.findOne(
        {},
        {
          adminId: 0,
          lanes: 0,
        }
      );
      if (!organizationInfo) {
        return NextResponse.json(
          { error: "No organizations found in the database" },
          { status: 404 }
        );
      }
      organizationId = organizationInfo._id;
    }

    const existingUser =
      (await CandidateAccount.findOne({ email, organizationId })) ||
      (await User.findOne({ email, organizationId }));

    if (existingUser) {
      if (existingUser.isDeleted) {
        return NextResponse.json(
          { error: "Candidate already exists, but is deactivated." },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "Candidate already exists in this Organization" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await CandidateAccount.create({
      email,
      password: hashedPassword,
      name,
      organizationId,
      organizationInfo,
    });

    // Generate token
    const token = signToken({
      id: user._id,
      email: user.email,
    });

    const response = NextResponse.json(
      {
        message: "Candidate created successfully",
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: "candidate",
          organizationInfo: organizationInfo,
        },
      },
      { status: 201 }
    );

    // Set cookie
    response.cookies.set("token", token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 86400, // 1 day
    });

    return response;
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
}
