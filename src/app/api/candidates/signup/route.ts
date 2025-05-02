import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect, { CandidateAccount, Organization, User } from "@/lib/mongodb";

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
      (await CandidateAccount.findOne({ email })) ||
      (await User.findOne({ email }));

    if (existingUser) {
      if (existingUser.isDeleted) {
        return NextResponse.json(
          { error: "Candidate already exists, but is deactivated." },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "Candidates cant have multiple org accounts" },
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

    return response;
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
}
