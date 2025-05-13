import { Organization } from "@/lib/mongodb";
import connectToDatabase from "@/lib/mongodb";
import { NextResponse } from "next/server";

// Handle GET request
export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgName: string }> }
) {
  await connectToDatabase();
  try {
    const { orgName } = await params;

    if (!Organization) {
      return NextResponse.json(
        { error: "Database not connected" },
        { status: 400 }
      );
    }
    const orgInfo = await Organization.findOne({ name: orgName }).lean();

    if (!orgInfo) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const customFields = orgInfo.customFields
      ? JSON.parse(JSON.stringify(orgInfo.customFields))
      : null;

    return NextResponse.json(customFields || {}, { status: 200 });
  } catch (error: unknown) {
    console.error("Error in GET organization:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Unknown error occurred" },
      { status: 400 }
    );
  }
}
