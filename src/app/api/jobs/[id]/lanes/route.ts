import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { Job, Organization, Candidate } from "@/lib/mongodb";
import { auth } from "@/lib/auth";
import { isValidObjectId } from "mongoose";
const DEFAULT_LANES = [
  "applied",
  "screening",
  "shortlisted",
  "processing",
  "accepted",
  "rejected",
];

// GET /api/jobs/[id]/lanes - Get lanes for a specific job
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();

    // Check authentication
    const session = await auth(request);
    if (!session || !session.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!Job || !Organization) {
      return NextResponse.json(
        { error: "Database not connected" },
        { status: 400 }
      );
    }

    const { id: jobId } = await params;

    // Validate ObjectId
    if (!isValidObjectId(jobId)) {
      return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });
    }
    // Find the job
    const job = await Job.findOne({
      _id: jobId,
      organizationId: session.user.organizationId,
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    let lanes;
    let useCustomLanes = job.useCustomLanes || false;

    if (useCustomLanes && job.lanes) {
      lanes = job.lanes;
    } else {
      // Get organization default lanes
      const organization = await Organization.findById(
        session.user.organizationId
      );
      lanes =
        organization?.lanes || organization?.defaultLanes || DEFAULT_LANES;
    }

    return NextResponse.json({
      jobId: job._id,
      jobTitle: job.title,
      lanes,
      useCustomLanes,
      laneRestrictions: {
        nonEditable: ["applied", "accepted", "rejected"],
        nonDeletable: ["applied", "accepted", "rejected"],
      },
    });
  } catch (error) {
    console.error("Get job lanes error:", error);
    return NextResponse.json(
      { error: "Failed to fetch job lanes" },
      { status: 500 }
    );
  }
}

// PUT /api/jobs/[id]/lanes - Update lanes for a specific job
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();

    // Check authentication and permissions
    const session = await auth(request);
    if (!session || !session.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin and HR can modify job lanes
    if (!["admin", "hr"].includes(session.user.role)) {
      return NextResponse.json(
        {
          error:
            "Insufficient permissions. Only admin and HR can manage job lanes.",
        },
        { status: 403 }
      );
    }

    if (!Job || !Candidate) {
      return NextResponse.json(
        { error: "Database not connected" },
        { status: 400 }
      );
    }

    const { id: jobId } = await params;
    const body = await request.json();
    const { lanes, useCustomLanes } = body;

    // Find the job
    const job = await Job.findOne({
      _id: jobId,
      organizationId: session.user.organizationId,
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Validation
    if (useCustomLanes) {
      if (!Array.isArray(lanes) || lanes.length === 0) {
        return NextResponse.json(
          { error: "Lanes must be a non-empty array when using custom lanes" },
          { status: 400 }
        );
      }

      // Validate lane names
      const validLaneNameRegex = /^[a-zA-Z0-9\s\-_]+$/;
      for (const lane of lanes) {
        if (typeof lane !== "string" || !validLaneNameRegex.test(lane)) {
          return NextResponse.json(
            {
              error: `Invalid lane name: ${lane}. Only alphanumeric characters, spaces, hyphens, and underscores allowed.`,
            },
            { status: 400 }
          );
        }
      }

      // Ensure required lanes are present
      const requiredLanes = ["applied", "accepted", "rejected"];
      for (const requiredLane of requiredLanes) {
        if (!lanes.includes(requiredLane)) {
          return NextResponse.json(
            {
              error: `Required lane '${requiredLane}' must be included in job lanes`,
            },
            { status: 400 }
          );
        }
      }

      // Check for duplicates
      const uniqueLanes = [...new Set(lanes)];
      if (uniqueLanes.length !== lanes.length) {
        return NextResponse.json(
          { error: "Duplicate lane names are not allowed" },
          { status: 400 }
        );
      }

      // Check if any candidates would have invalid statuses after this change
      const candidates = await Candidate.find({
        jobId: jobId,
        organizationId: session.user.organizationId,
      });

      const invalidCandidates = candidates.filter(
        (candidate) => candidate.status && !lanes.includes(candidate.status)
      );

      if (invalidCandidates.length > 0) {
        return NextResponse.json(
          {
            error:
              "Cannot update lanes: some candidates have statuses not in the new lane list",
            details: {
              count: invalidCandidates.length,
              invalidStatuses: [
                ...new Set(invalidCandidates.map((c) => c.status)),
              ],
              suggestion:
                "Move candidates to valid lanes before updating job lanes",
            },
          },
          { status: 400 }
        );
      }
    }

    // Update job
    const updateData: any = {
      useCustomLanes: Boolean(useCustomLanes),
    };

    if (useCustomLanes) {
      updateData.lanes = lanes;
    } else {
      // When switching to default lanes, clear custom lanes
      updateData.$unset = { lanes: 1 };
    }

    const updatedJob = await Job.findByIdAndUpdate(jobId, updateData, {
      new: true,
    });

    // Get effective lanes for response
    let effectiveLanes;
    if (updatedJob.useCustomLanes && updatedJob.lanes) {
      effectiveLanes = updatedJob.lanes;
    } else {
      const organization = await Organization.findById(
        session.user.organizationId
      );
      effectiveLanes =
        organization?.lanes || organization?.defaultLanes || DEFAULT_LANES;
    }

    return NextResponse.json({
      message: "Job lanes updated successfully",
      jobId: updatedJob._id,
      lanes: effectiveLanes,
      useCustomLanes: updatedJob.useCustomLanes,
    });
  } catch (error) {
    console.error("Update job lanes error:", error);
    return NextResponse.json(
      { error: "Failed to update job lanes" },
      { status: 500 }
    );
  }
}

// POST /api/jobs/[id]/lanes - Add a new lane to a specific job
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    if (!Job || !Organization) {
      return NextResponse.json(
        { error: "Database not connected" },
        { status: 400 }
      );
    }

    const { id: jobId } = await params;
    const body = await request.json();
    const { laneName, position } = body;

    // Validation
    if (!laneName || typeof laneName !== "string") {
      return NextResponse.json(
        { error: "Lane name is required and must be a string" },
        { status: 400 }
      );
    }

    const validLaneNameRegex = /^[a-zA-Z0-9\s\-_]+$/;
    if (!validLaneNameRegex.test(laneName)) {
      return NextResponse.json(
        {
          error:
            "Invalid lane name. Only alphanumeric characters, spaces, hyphens, and underscores allowed.",
        },
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
      currentLanes = [
        ...(organization?.lanes || organization?.defaultLanes || DEFAULT_LANES),
      ];
    }

    // Check if lane already exists
    if (currentLanes.includes(laneName)) {
      return NextResponse.json(
        { error: "Lane already exists" },
        { status: 400 }
      );
    }

    // Add lane at specified position
    const newLanes = [...currentLanes];
    if (
      typeof position === "number" &&
      position >= 0 &&
      position <= newLanes.length
    ) {
      newLanes.splice(position, 0, laneName);
    } else {
      newLanes.push(laneName);
    }

    // Update job to use custom lanes
    const updatedJob = await Job.findByIdAndUpdate(
      jobId,
      {
        $set: {
          lanes: newLanes,
          useCustomLanes: true,
        },
      },
      { new: true }
    );

    return NextResponse.json({
      message: "Lane added successfully",
      jobId: updatedJob._id,
      lanes: updatedJob.lanes,
      useCustomLanes: updatedJob.useCustomLanes,
    });
  } catch (error) {
    console.error("Add job lane error:", error);
    return NextResponse.json(
      { error: "Failed to add job lane" },
      { status: 500 }
    );
  }
}
