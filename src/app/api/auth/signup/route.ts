import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect, { CandidateAccount } from "@/lib/mongodb";
import { User, Lane } from "@/lib/mongodb";
import { signToken } from "@/lib/jwt";
import mongoose from "mongoose";

const DEFAULT_LANES = [
  "applied",
  "screening",
  "shortlisted",
  "processing",
  "accepted",
  "rejected",
];

export async function POST(req: Request) {
  try {
    await dbConnect();
    var { email, password, name, role, organizationId } = await req.json();

    if (!(organizationId instanceof mongoose.Types.ObjectId)) {
      organizationId = new mongoose.Types.ObjectId(organizationId);
    }
    if (!User || !Lane) {
      return NextResponse.json(
        { error: "Database not connected" },
        { status: 400 }
      );
    }

    // Check if user already exists in the same organization
    // console.log("EXISTING USER: ",organizationId)
    const existingUser =
      (await User.findOne({ email, organizationId })) ||
      (await CandidateAccount?.findOne({ email, organizationId }));
    // console.log("EXISTING USER: ",existingUser)

    if (existingUser) {
      if (existingUser.isDeleted) {
        return NextResponse.json(
          { error: "User already exists, but is deactivated." },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "User already exists in this organization" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      email,
      password: hashedPassword,
      name,
      role,
      organizationId,
    });

    // Create default lanes for the user
    await Lane.create({
      userId: user._id,
      lanes: DEFAULT_LANES,
    });

    // // Generate token
    // const token = signToken({
    //   id: user._id,
    //   email: user.email,
    //   role: user.role,
    // });

    const response = NextResponse.json(
      {
        message: "User created successfully",
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 }
    );

    // // Set cookie
    // response.cookies.set('token', token, {
    //   httpOnly: false,
    //   secure: process.env.NODE_ENV === 'production',
    //   sameSite: 'strict',
    //   maxAge: 86400, // 1 day
    // });

    return response;
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
}
