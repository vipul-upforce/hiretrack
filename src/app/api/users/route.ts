import { NextRequest, NextResponse } from "next/server";
// import { User } from '@/models/User';
import connectToDatabase, { User } from "@/lib/mongodb";
import mongoose from "mongoose";
import { Organization } from "@/lib/mongodb";
import { getAuthenticatedUser } from "@/app/actions/auth";

export async function GET(req: NextRequest) {
  try {
    const [session] = await Promise.all([
      getAuthenticatedUser(req, "admin"),
      connectToDatabase(),
    ]);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Give models a moment to initialize if they haven't already
    let retries = 0;
    while (!User && retries < 5) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      retries++;
    }

    if (!User) {
      return NextResponse.json(
        { error: "Database models not initialized" },
        { status: 500 }
      );
    }

    const nonSystemUsers = await User.find(
      {
        role: { $ne: "system" },
        organizationId: session.user.organizationId
      },
      { password: 0 }
    ).sort({ createdAt: -1 });

    // Fetch only the latest system user
    const latestSystemUser = await User.findOne(
      {
        role: "system",
        organizationId: session.user.organizationId
      },
      { password: 0 }
    ).sort({ createdAt: -1 });

    const result = [...nonSystemUsers];
    if (latestSystemUser) result.push(latestSystemUser);

    return NextResponse.json(result);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          "Internal server error" +
          (error instanceof Error ? error.message : "Unknown error"),
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  await connectToDatabase();

  // Give models a moment to initialize if they haven't already
  let retries = 0;
  while ((!User || !Organization) && retries < 5) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    retries++;
  }

  try {
    var { adminId, organizationId } = await req.json();
    organizationId = new mongoose.Types.ObjectId(organizationId);
    if (!adminId || !organizationId) {
      return NextResponse.json(
        { error: "Both adminId and organizationId are required" },
        { status: 400 }
      );
    }
    if (!Organization) {
      return NextResponse.json(
        { error: "Database models not initialized" },
        { status: 500 }
      );
    }
    const organization = await Organization.findById(organizationId).exec();
    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }
    const DEFAULT_LANES = [
      "applied",
      "screening",
      "shortlisted",
      "processing",
      "accepted",
      "rejected",
    ];
    if (!organization.lanes || organization.lanes.length === 0) {
      organization.lanes = DEFAULT_LANES;
      await organization.save();
    }

    if (!User) {
      return NextResponse.json(
        { error: "Database models not initialized" },
        { status: 500 }
      );
    }
    const updatedAdmin = await User.updateOne(
      { _id: adminId },
      { $set: { organizationId: organizationId } }
    );

    if (updatedAdmin.matchedCount === 0) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    if (updatedAdmin.modifiedCount === 0) {
      return NextResponse.json({ error: "No changes made" }, { status: 400 });
    }

    return NextResponse.json(
      {
        message: "Admin updated successfully",
        user: updatedAdmin,
        lanes: organization.lanes,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          "Failed to update admin" +
          (error instanceof Error ? error.message : "Unknown error"),
      },
      { status: 400 }
    );
  }
}
