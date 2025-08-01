import { NextRequest, NextResponse } from "next/server";
import { verifyAndDecryptToken } from "@/app/actions/auth";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ message: "No authentication token found" }, { status: 401 });
    }

    const result = await verifyAndDecryptToken(token);

    if (result.success) {
      return NextResponse.json({ user: result.user }, { status: 200 });
    } else {
      return NextResponse.json({ message: result.error || "Invalid token" }, { status: 401 });
    }
  } catch (error) {
    console.error("Error in /api/auth/me:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
