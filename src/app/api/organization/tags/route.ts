import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { Organization } from "@/lib/mongodb";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  await connectToDatabase();
  const user = await auth(req);
  const { searchParams } = new URL(req.url);
  const orgId = searchParams?.get("organizationId");

  if (!orgId) {
    return NextResponse.json(
      { error: "organizationId is required" },
      { status: 400 }
    );
  }
  if (!user || (user.user.role !== "admin" && user?.user.role !== "hr")) {
    return NextResponse.json({ error: "Not Authorized" }, { status: 401 });
  }
  try {
    if (!Organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 400 }
      );
    }
    const org = await Organization.findById(orgId);
    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ tags: org.tags });
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
export async function PUT(req: NextRequest) {
  await connectToDatabase();
  const user = await auth(req);
  const { searchParams } = new URL(req.url);
  const orgId = searchParams?.get("organizationId");
  const tags = await req.json();

  if (!orgId) {
    return NextResponse.json(
      { error: "organizationId is required" },
      { status: 400 }
    );
  }
  if (!user || (user.user.role !== "admin" && user?.user.role !== "hr")) {
    return NextResponse.json({ error: "Not Authorized" }, { status: 401 });
  }
  try {
    if (!Organization) {
      return NextResponse.json(
        { error: "database not connected" },
        { status: 400 }
      );
    }
    const org = await Organization.findById(orgId);
    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 400 }
      );
    }
    org.tags = tags;
    await org.save();
    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ tags: org.tags });
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
