import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { User } from "@/lib/mongodb";
import { getAuthenticatedUser } from "@/app/actions/auth";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    
    const userData = await getAuthenticatedUser(req);
    if (!userData) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const organizationId = userData.organizationId;
    if (!User) {
      return NextResponse.json(
        { error: "User Model not found" },
        { status: 400 }
      );
    }
    const interviewers = await User.find({
      organizationId,
      role: {
        $ne: "system",
      },
      isDeleted: { $ne: true },
    }).select("_id name email organizationId");

    return NextResponse.json(interviewers);
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
}
