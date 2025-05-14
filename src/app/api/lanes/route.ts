import { NextRequest, NextResponse } from "next/server";
import { Lane } from "@/lib/mongodb";
import connectToDatabase from "@/lib/mongodb";
import { auth } from "@/lib/auth";
import { Organization } from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const userId = searchParams?.get("userId");
    const session = await auth(request);
    const organizationId = session?.user.organizationId;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }
    if (!Organization || !Lane) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }
    const organization = (await Organization.findOne({
      _id: organizationId,
    }).lean()) as unknown as {
      _id: string;
      lanes?: string[];
    };
    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }
    const organizationLaneOrder = organization.lanes || [];

    const lane = await Lane.findOne({ userId }).lean();

    if (lane) {
      const updatedLane = await Lane.findOneAndUpdate(
        { userId },
        { $set: { lanes: organizationLaneOrder } },
        { new: true }
      ).lean();

      return NextResponse.json(updatedLane);
    }

    const newLane = new Lane({
      userId,
      lanes: organizationLaneOrder,
    });

    await newLane.save();
    return NextResponse.json(newLane);
  } catch (err: unknown) {
    const error = err as Error;
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    const { lanes: newLanes } = await request.json();
    const session = await auth(request);
    const organizationId = session?.user.organizationId;
    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    // await Lane.findOneAndUpdate(
    //   { userId },
    //   { $set: { lanes: newLanes } },
    //   { new: true, upsert: true }
    // ).lean();
    if (!Lane || !Organization) {
      return NextResponse.json({ error: "Lane not found" }, { status: 404 });
    }

    const organization = await Organization.findOne({ _id: organizationId });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const updatedOrganization = await Organization.findOneAndUpdate(
      { _id: organizationId },
      { $set: { lanes: newLanes } },
      { new: true }
    );
    return NextResponse.json(updatedOrganization);
  } catch (err: unknown) {
    const error = err as Error;
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const data = await request.json();

    if (!Lane) {
      return NextResponse.json({ error: "Lane not found" }, { status: 404 });
    }

    const lastLane = await Lane.findOne({ userId: data.userId }).sort({
      order: -1,
    });
    const newOrder = lastLane ? lastLane.order + 1 : 0;

    const lane = new Lane({
      ...data,
      order: newOrder,
    });

    await lane.save();
    return NextResponse.json(lane);
  } catch (err: unknown) {
    const error = err as Error;
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
