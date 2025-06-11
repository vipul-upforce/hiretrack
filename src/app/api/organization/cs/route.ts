import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { Organization } from "@/lib/mongodb";
import { auth } from "@/lib/auth";

// Handle POST request
export async function POST(req: NextRequest) {
  await connectToDatabase();
  const user = await auth(req);
  console.log("USER: ", user);
  if (!user) {
    return NextResponse.json({ error: "Not Authorized" }, { status: 401 });
  }
  try {
    const { orgId, customFields } = await req.json();
    if (!Organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 400 }
      );
    }
    const org = await Organization.findById(orgId);
    if (org) {
      org.customFields = customFields;
      await org.save();
    }
    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      {
        message: "Meta Fields Updated Successfully",
        organization: org,
        _id: org.id,
      },
      { status: 201 }
    );
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
