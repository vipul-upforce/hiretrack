import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { User } from "@/lib/mongodb";
import { getAuthenticatedUser } from "@/app/actions/auth";

export async function GET(req: NextRequest) {
  try {
    const [userData] = await Promise.all([
      getAuthenticatedUser(req, ["admin", "hr"]),
      connectToDatabase(),
    ]);
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const organizationId = userData.organizationId;
    const interviewers = await User.find({
      organizationId,
      role: {
        $ne: "system",
      },
      isDeleted: { $ne: true },
    }).select("_id name email organizationId").lean().exec();

    return NextResponse.json(interviewers);
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
}
