import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect, { CandidateAccount } from "@/lib/mongodb";
import { User, Lane } from "@/lib/mongodb";
import mongoose from "mongoose";
import { signupRateLimiter } from "@/lib/rateLimiter";
import { NotificationService } from "@/lib/notifications/notificationService";

const DEFAULT_LANES = [
  "applied",
  "screening",
  "shortlisted",
  "processing",
  "accepted",
  "rejected",
];

async function handleSignup(req: NextRequest) {
  try {
    await dbConnect();
    var {
      email,
      password,
      name,
      role,
      organizationId,
      triggerUserId,
      triggerUserName,
    } = await req.json();

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
    // await Lane.create({
    //   userId: user._id,
    //   lanes: DEFAULT_LANES,
    // });

    // Send user creation notification (only if triggerUser is provided, indicating this is an admin action)
    if (triggerUserId && triggerUserName && role !== "candidate") {
      try {
        await NotificationService.notifyUserAdded({
          organizationId: organizationId.toString(),
          newUserId: user._id.toString(),
          newUserName: user.name,
          newUserEmail: user.email,
          newUserRole: user.role,
          triggerUserId: triggerUserId,
          triggerUserName: triggerUserName,
        });
      } catch (notificationError) {
        console.error(
          "Failed to send user creation notification:",
          notificationError
        );
        // Don't fail the API call if notification fails
      }
    }

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

// Export with rate limiting
export async function POST(req: Request) {
  // SECURITY FIX: Apply rate limiting to prevent signup spam
  return signupRateLimiter(req as NextRequest, handleSignup);
}
