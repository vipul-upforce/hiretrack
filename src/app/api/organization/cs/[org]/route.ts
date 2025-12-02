import { Organization } from "@/lib/mongodb";
import connectToDatabase from "@/lib/mongodb";
import { NextResponse } from "next/server";

// Handle GET request
export async function GET(
  req: Request,
  { params }: { params: Promise<{ org: string }> }
) {
  await connectToDatabase();

  try {
    const { org } = await params;
    if (!Organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 400 }
      );
    }
    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 400 }
      );
    }
    const orgInfo = await Organization.findById(org).select("customFields").lean().exec();
    return NextResponse.json(orgInfo?.customFields, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Unknown error occurred" },
      { status: 400 }
    );
  }
}
