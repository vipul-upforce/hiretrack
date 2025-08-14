import { NextRequest, NextResponse } from "next/server";
import { verifyAndDecryptToken } from "@/app/actions/auth";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("auth_token")?.value;

    // Default candidate user for unauthenticated requests
    const defaultCandidateUser = {
      id: "guest",
      name: "Guest",
      email: "",
      role: "",
      organizationId: "",
      organizationInfo: null as any,
      appliedApplications: [] as string[],
      fileStorage: null as any,
    };

    if (!token) {
      return NextResponse.json({ user: defaultCandidateUser }, { status: 200 });
    }

    const result = await verifyAndDecryptToken(token);

    if (result.success) {
      return NextResponse.json({ user: result.user }, { status: 200 });
    } else {
      // Treat invalid/missing auth as guest candidate
      return NextResponse.json({ user: defaultCandidateUser }, { status: 200 });
    }
  } catch (error) {
    console.error("Error in /api/auth/me:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
