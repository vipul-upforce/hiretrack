import { NextResponse } from "next/server";
import { verifyAndDecryptToken } from "@/app/actions/auth";
import { getAuthToken } from "@/lib/secureTokens";

export async function GET(request: Request) {
  try {
    const token = getAuthToken(request);

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decryptedUser = await verifyAndDecryptToken(token);
    return NextResponse.json(decryptedUser);
  } catch (error) {
    console.error("Error fetching user data:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
