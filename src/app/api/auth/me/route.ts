import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, OrganizationInfo } from "@/app/actions/auth";
import { apiRateLimiter } from "@/lib/rateLimiter";

const handleMeRoute = async(req: NextRequest) => {
   try {
    const token = req.cookies.get("auth_token")?.value;

    // Default candidate user for unauthenticated requests
    const defaultCandidateUser = {
      id: "guest",
      name: "Guest",
      email: "",
      role: "",
      organizationId: "",
      organizationInfo: null as OrganizationInfo | null,
      appliedApplications: [] as string[],
      fileStorage: null as string | null,
    };

    if (!token) {
      return NextResponse.json({ user: defaultCandidateUser }, { status: 200 });
    }

    const result = await getAuthenticatedUser(req)
    if (!result) {
      return NextResponse.json(
        { message: "Unauthorised Access" },
        { status: 401 }
      );
    }
    if (result) {
      return NextResponse.json({ user: result }, { status: 200 });
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

export async function GET(req: NextRequest) {
  return apiRateLimiter(req as NextRequest, handleMeRoute);
}
