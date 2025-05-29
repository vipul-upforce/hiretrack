import { NextResponse } from "next/server";
import connectToDatabase, { Candidate } from "@/lib/mongodb";
import { Organization } from "@/lib/mongodb";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ laneId: string }> }
) {
  try {
    await connectToDatabase();
    const { organizationId } = await request.json();
    if (!Organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const org = await Organization.findOne({ _id: organizationId });

    if (!org) {
      return NextResponse.json(
        { error: "Organization Info not found" },
        { status: 404 }
      );
    }
    const { laneId } = await params;
    if (org.lanes.length == 1) {
      return NextResponse.json(
        { error: "Can't delete all lanes" },
        { status: 400 }
      );
    }
    org.lanes = org.lanes.filter((l: string) => {
      return l !== laneId;
    });
    await org.save();
    const newLaneId = org.lanes[0];

    const updated = await Candidate?.updateMany(
      { organizationId, status: laneId },
      {
        $set: {
          status: newLaneId,
        },
      }
    );

    return NextResponse.json({ data: updated });
  } catch (err) {
    const error = err as Error;
    return NextResponse.json({ error: error }, { status: 500 });
  }
}
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ laneId: string }> }
) {
  try {
    await connectToDatabase();
    const { organizationId, newLaneId } = await request.json();
    if (!organizationId || !newLaneId) {
      return NextResponse.json(
        { error: "Missing organizationId or newLaneId" },
        { status: 400 }
      );
    }
    if (!Organization || !Candidate) {
      return NextResponse.json(
        { error: "Database not connected" },
        { status: 500 }
      );
    }

    const { laneId } = await params;
    if (!laneId) {
      return NextResponse.json(
        { error: "Missing laneId in URL parameters" },
        { status: 400 }
      );
    }

    const org = await Organization.findOne({ _id: organizationId });
    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    if (!org.lanes.includes(laneId)) {
      return NextResponse.json(
        { error: `Lane ${laneId} not found in organization` },
        { status: 404 }
      );
    }

    if (laneId === newLaneId) {
      return NextResponse.json(
        { error: "New lane ID must be different from the current lane ID" },
        { status: 400 }
      );
    }

    if (
      org.lanes
        .map((lane) => lane.toLowerCase())
        .includes(newLaneId.toLowerCase())
    ) {
      return NextResponse.json(
        { error: `Lane ${newLaneId} already exists in the organization` },
        { status: 400 }
      );
    }

    if (org.lanes.length === 1) {
      return NextResponse.json(
        { error: "Cannot update the only lane in the organization" },
        { status: 400 }
      );
    }

    const laneIndex = org.lanes.findIndex((lane: string) => lane === laneId);
    if (laneIndex === -1) {
      return NextResponse.json(
        { error: `Lane ${laneId} not found` },
        { status: 404 }
      );
    }
    org.lanes[laneIndex] = newLaneId;
    await org.save();

    const updatedCandidates = await Candidate.updateMany(
      { organizationId, status: laneId },
      { $set: { status: newLaneId } }
    );

    return NextResponse.json({
      message: "Lane updated successfully",
      updatedLanes: org.lanes,
      updatedCandidates,
    });
  } catch (err) {
    console.error("Error updating lane:", err);
    const error = err as Error;
    return NextResponse.json(
      { error: error.message || "An unknown error occurred" },
      { status: 500 }
    );
  }
}
