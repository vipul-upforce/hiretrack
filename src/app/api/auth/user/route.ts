import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/actions/auth";

export async function GET(request: NextRequest) {
  try {
    // const token = getAuthToken(request);
    const token = request.cookies.get("auth_token")?.value;
    const orgId = request.cookies.get("org_id")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userData = await getAuthenticatedUser(request);
    if (!userData) {
      return NextResponse.json(
        { message: "Unauthorised Access" },
        { status: 401 }
      );
    }
    return NextResponse.json(userData);
  } catch (error) {
    console.error("Error fetching user data:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
