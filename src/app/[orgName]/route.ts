import connectToDatabase from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgName: string }> } // ✅ Corrected type
) {
  try {
    await connectToDatabase();
    const { orgName } = await params; // ✅ Directly extract from params object

    if (orgName) {
      return NextResponse.json({ message: `Organization: ${orgName}` });
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
}
