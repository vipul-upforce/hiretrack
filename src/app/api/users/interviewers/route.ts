import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { User } from "@/lib/mongodb";
import { verifyAndDecryptToken } from "@/app/actions/auth";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    let organizationId;
    const token = req.cookies.get("auth_token");
    const orgId = req.cookies.get("org_id")?.value;
    if (token?.value) {
      const decryptedResponse = await verifyAndDecryptToken(
        String(token?.value),
        orgId
      );
      const userData = decryptedResponse.user;
      if (decryptedResponse.success) {
        organizationId = userData.organizationId;
      }
    }
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
