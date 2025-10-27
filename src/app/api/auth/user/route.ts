import { NextRequest, NextResponse } from "next/server";
import { verifyAndDecryptToken } from "@/app/actions/auth";
import { getAuthToken } from "@/lib/secureTokens";

export async function GET(request: NextRequest) {
  try {
    // const token = getAuthToken(request);
    const token = request.cookies.get("auth_token")?.value;
    const orgId = request.cookies.get("org_id")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decryptedUser = await verifyAndDecryptToken(token, orgId);
    return NextResponse.json(decryptedUser);
  } catch (error) {
    console.error("Error fetching user data:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
