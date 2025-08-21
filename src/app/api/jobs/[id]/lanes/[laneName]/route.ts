import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { Job, Organization, Candidate } from "@/lib/mongodb";
import { auth } from "@/lib/auth";
import { broadcastLaneUpdate } from "@/lib/broadcast/broadCastCandidate";

const DEFAULT_LANES = [
  "applied",
  "screening",
  "shortlisted",
  "processing",
  "accepted",
  "rejected",
];

const RESTRICTED_LANES = ["applied", "accepted", "rejected"];

// DELETE /api/jobs/[id]/lanes/[laneName] - Remove a lane from a specific job
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; laneName: string } }
) {
  try {
    await connectToDatabase();

    // Check authentication and permissions
    const session = await auth(request);
    if (!session || !session.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["admin", "hr"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    if (!Job || !Organization || !Candidate) {
      return NextResponse.json(
        { error: "Database not connected" },
        { status: 400 }
      );
    }

    const { id: jobId, laneName } = await params;

    // Check if lane is restricted
    if (RESTRICTED_LANES.includes(laneName)) {
      return NextResponse.json(
        { error: `Cannot delete restricted lane: ${laneName}` },
        { status: 400 }
      );
    }

    const job = await Job.findOne({
      _id: jobId,
      organizationId: session.user.organizationId,
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Get current lanes
    let currentLanes;
    if (job.useCustomLanes && job.lanes) {
      currentLanes = [...job.lanes];
    } else {
      const organization = await Organization.findById(
        session.user.organizationId
      );
      currentLanes = [...(organization?.defaultLanes || DEFAULT_LANES)];
    }

    // Check if lane exists
    if (!currentLanes.includes(laneName)) {
      return NextResponse.json({ error: "Lane not found" }, { status: 404 });
    }

    const organizationId = session.user.organizationId;
    // Check if any candidates are currently in this lane
    const candidatesInLane = await Candidate.find({
      jobId: jobId,
      organizationId,
      status: laneName,
    });

    if (candidatesInLane.length > 0) {
      // Get the next available lane (defaulting to 'applied')
      const fallbackLane = currentLanes.includes("applied")
        ? "applied"
        : currentLanes[0];

      return NextResponse.json(
        {
          error: "Cannot delete lane: candidates are currently in this lane",
          details: {
            candidateCount: candidatesInLane.length,
            candidateNames: candidatesInLane.slice(0, 5).map((c) => c.name), // Show first 5 names
            fallbackLane,
            suggestion: `Move ${candidatesInLane.length} candidate(s) to another lane before deleting`,
          },
        },
        { status: 400 }
      );
    }

    // Remove lane from the list
    const newLanes = currentLanes.filter((lane) => lane !== laneName);

    // Update job
    const updatedJob = await Job.findByIdAndUpdate(
      jobId,
      {
        $set: {
          lanes: newLanes,
          useCustomLanes: true, // Ensure we're using custom lanes after modification
        },
      },
      { new: true }
    );
    broadcastLaneUpdate(organizationId, newLanes, jobId);
    return NextResponse.json({
      message: "Lane deleted successfully",
      jobId: updatedJob._id,
      lanes: updatedJob.lanes,
      deletedLane: laneName,
    });
  } catch (error) {
    console.error("Delete job lane error:", error);
    return NextResponse.json(
      { error: "Failed to delete job lane" },
      { status: 500 }
    );
  }
}

// PATCH /api/jobs/[id]/lanes/[laneName] - Rename a lane for a specific job
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; laneName: string } }
) {
  try {
    await connectToDatabase();

    // Check authentication and permissions
    const session = await auth(request);
    if (!session || !session.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["admin", "hr"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    if (!Job || !Organization || !Candidate) {
      return NextResponse.json(
        { error: "Database not connected" },
        { status: 400 }
      );
    }

    const { id: jobId, laneName } = await params;
    const body = await request.json();
    const { newLaneName } = body;

    // Validation
    if (!newLaneName || typeof newLaneName !== "string") {
      return NextResponse.json(
        { error: "New lane name is required and must be a string" },
        { status: 400 }
      );
    }

    const validLaneNameRegex = /^[a-zA-Z0-9\s\-_]+$/;
    if (!validLaneNameRegex.test(newLaneName)) {
      return NextResponse.json(
        {
          error:
            "Invalid lane name. Only alphanumeric characters, spaces, hyphens, and underscores allowed.",
        },
        { status: 400 }
      );
    }

    // Check if lane is restricted from editing
    if (RESTRICTED_LANES.includes(laneName)) {
      return NextResponse.json(
        { error: `Cannot rename restricted lane: ${laneName}` },
        { status: 400 }
      );
    }

    const job = await Job.findOne({
      _id: jobId,
      organizationId: session.user.organizationId,
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Get current lanes
    let currentLanes;
    if (job.useCustomLanes && job.lanes) {
      currentLanes = [...job.lanes];
    } else {
      const organization = await Organization.findById(
        session.user.organizationId
      );
      currentLanes = [...(organization?.defaultLanes || DEFAULT_LANES)];
    }

    // Check if old lane exists
    if (!currentLanes.includes(laneName)) {
      return NextResponse.json({ error: "Lane not found" }, { status: 404 });
    }

    // Check if new lane name already exists
    if (currentLanes.includes(newLaneName)) {
      return NextResponse.json(
        { error: "New lane name already exists" },
        { status: 400 }
      );
    }

    // Update lane name in the array
    const newLanes = currentLanes.map((lane) =>
      lane === laneName ? newLaneName : lane
    );

    // Update job
    const updatedJob = await Job.findByIdAndUpdate(
      jobId,
      {
        $set: {
          lanes: newLanes,
          useCustomLanes: true, // Ensure we're using custom lanes after modification
        },
      },
      { new: true }
    );

    const organizationId = session.user.organizationId;
    // Update all candidates with the old status to the new status
    await Candidate.updateMany(
      {
        jobId: jobId,
        organizationId,
        status: laneName,
      },
      { $set: { status: newLaneName } }
    );
    broadcastLaneUpdate(organizationId, newLanes, jobId);
    return NextResponse.json({
      message: "Lane renamed successfully",
      jobId: updatedJob._id,
      lanes: updatedJob.lanes,
      oldLaneName: laneName,
      newLaneName: newLaneName,
    });
  } catch (error) {
    console.error("Rename job lane error:", error);
    return NextResponse.json(
      { error: "Failed to rename job lane" },
      { status: 500 }
    );
  }
}
