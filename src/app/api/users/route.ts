import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
// import { User } from '@/models/User';
import { User } from "@/lib/mongodb";
import { auth } from "@/lib/auth";
import mongoose from "mongoose";
import { Organization } from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  try {
    const session = await auth(req);

    if (
      !session
      // session.user.role !== "admin" ||
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

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

    const url = new URL(req.url);
    const page = Math.max(parseInt(url.searchParams.get("page") || "1"), 1);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
    const skip = (page - 1) * limit;

    const query = {
      organizationId: session.user.organizationId,
      // isDeleted: { $ne: true }
    } as any;

    const projection = { password: 0 } as any;

    const [users, total] = await Promise.all([
      User.find(query, projection)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    return NextResponse.json({
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
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
  await dbConnect();

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
    const organization = await Organization.findById(organizationId);
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
