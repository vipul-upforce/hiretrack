import { NextRequest, NextResponse } from "next/server";
import { Lane, Job } from "@/lib/mongodb";
import connectToDatabase from "@/lib/mongodb";
import { auth } from "@/lib/auth";
import { Organization } from "@/lib/mongodb";
import { broadcastLaneUpdate } from "@/lib/broadcast/broadCastCandidate";

const DEFAULT_LANES = [
  "applied",
  "screening",
  "shortlisted",
  "processing",
  "accepted",
  "rejected",
];

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const userId = searchParams?.get("userId");
    const jobId = searchParams?.get("jobId"); // NEW: Support job-specific lanes
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

    let organizationLaneOrder;

    // NEW: If jobId is provided, get job-specific lanes
    if (jobId && Job) {
      const job = await Job.findOne({
        _id: jobId,
        organizationId: organizationId,
      }).lean();

      if (job) {
        if (job.useCustomLanes && job.lanes) {
          organizationLaneOrder = job.lanes;
        } else {
          // Fall back to organization default lanes
          const organization = await Organization.findOne({
            _id: organizationId,
          }).lean();
          organizationLaneOrder =
            organization?.defaultLanes || organization?.lanes || DEFAULT_LANES;
        }
      } else {
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }
    } else {
      // LEGACY: Use organization lanes (backward compatibility)
      const organization = (await Organization.findOne({
        _id: organizationId,
      }).lean()) as unknown as {
        _id: string;
        lanes?: string[];
        defaultLanes?: string[];
      };

      if (!organization) {
        return NextResponse.json(
          { error: "Organization not found" },
          { status: 404 }
        );
      }

      // Use defaultLanes if available, fallback to old lanes field, then DEFAULT_LANES
      organizationLaneOrder =
        organization.defaultLanes || organization.lanes || DEFAULT_LANES;
    }

    return NextResponse.json({ lanes: organizationLaneOrder });
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
    const body = await request.json();
    console.log("PUT request body:", body); // Log 1: Capture incoming body
    const { lanes: newLanes, jobId } = body;
    const session = await auth(request);
    const organizationId = session?.user.organizationId;

    console.log("Session user:", { organizationId, role: session?.user?.role }); // Log 2: Verify session details

    if (!organizationId) {
      console.log("Error: Missing organizationId"); // Log 3: Catch missing orgId
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    // Check permissions
    if (!["admin", "hr"].includes(session?.user?.role || "")) {
      console.log(
        "Error: Insufficient permissions for user:",
        session?.user?.role
      ); // Log 4: Permission check failure
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    if (!Lane || !Organization) {
      console.log("Error: Database models not connected", {
        Lane: !!Lane,
        Organization: !!Organization,
      }); // Log 5: Model availability
      return NextResponse.json(
        { error: "Database not connected" },
        { status: 400 }
      );
    }

    // If jobId is provided, update job-specific lanes
    if (jobId && Job) {
      console.log("Processing job-specific update for jobId:", jobId); // Log 6: Confirm jobId received
      const job = await Job.findOne({
        _id: jobId,
        organizationId: organizationId,
      });

      if (!job) {
        console.log("Error: Job not found for jobId:", jobId); // Log 7: Job lookup failure
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }

      console.log("Current job state:", {
        jobId,
        useCustomLanes: job.useCustomLanes,
        lanes: job.lanes,
      }); // Log 8: Job state before update

      // Update job lanes
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

      console.log("Updated job state:", {
        jobId,
        useCustomLanes: updatedJob.useCustomLanes,
        lanes: updatedJob.lanes,
      }); // Log 9: Job state after update

      // Broadcast update for job-specific lanes
      console.log(
        "Broadcasting lane update for jobId:",
        jobId,
        "with lanes:",
        newLanes
      ); // Log 10: Broadcast trigger
      broadcastLaneUpdate(organizationId, newLanes, jobId);

      return NextResponse.json({
        message: "Job lanes updated successfully",
        jobId: updatedJob._id,
        lanes: updatedJob.lanes,
        useCustomLanes: updatedJob.useCustomLanes,
      });
    } else {
      console.log(
        "Processing organization-wide lane update for organizationId:",
        organizationId
      ); // Log 11: Org-level update
      // Update organization default lanes
      const updatedOrganization = await Organization.findByIdAndUpdate(
        organizationId,
        { $set: { defaultLanes: newLanes } },
        { new: true }
      );

      if (!updatedOrganization) {
        console.log(
          "Error: Organization not found for organizationId:",
          organizationId
        ); // Log 12: Org lookup failure
        return NextResponse.json(
          { error: "Organization not found" },
          { status: 404 }
        );
      }

      console.log(
        "Updated organization lanes:",
        updatedOrganization.defaultLanes
      ); // Log 13: Org state after update
      broadcastLaneUpdate(
        organizationId,
        updatedOrganization.defaultLanes || []
      );

      return NextResponse.json({
        message: "Organization lanes updated successfully",
        lanes: updatedOrganization.defaultLanes,
      });
    }
  } catch (err: unknown) {
    const error = err as Error;
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    console.error("PUT error:", { errorMessage, stack: error.stack }); // Log 14: Catch block error
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
