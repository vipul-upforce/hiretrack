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
  "rejected"
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
        organizationId: organizationId
      }).lean();

      if (job) {
        if (job.useCustomLanes && job.lanes) {
          organizationLaneOrder = job.lanes;
        } else {
          // Fall back to organization default lanes
          const organization = await Organization.findOne({ _id: organizationId }).lean();
          organizationLaneOrder = organization?.defaultLanes || organization?.lanes || DEFAULT_LANES;
        }
      } else {
        return NextResponse.json(
          { error: "Job not found" },
          { status: 404 }
        );
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
      organizationLaneOrder = organization.defaultLanes || organization.lanes || DEFAULT_LANES;
    }

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
    const body = await request.json();
    const { lanes: newLanes, jobId } = body;
    const session = await auth(request);
    const organizationId = session?.user.organizationId;
    
    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    // Check permissions
    if (!["admin", "hr"].includes(session?.user?.role || "")) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    if (!Lane || !Organization) {
      return NextResponse.json({ error: "Database not connected" }, { status: 400 });
    }

    // NEW: If jobId is provided, update job-specific lanes
    if (jobId && Job) {
      const job = await Job.findOne({
        _id: jobId,
        organizationId: organizationId
      });

      if (!job) {
        return NextResponse.json(
          { error: "Job not found" },
          { status: 404 }
        );
      }

      // Update job lanes
      const updatedJob = await Job.findByIdAndUpdate(
        jobId,
        { 
          $set: { 
            lanes: newLanes,
            useCustomLanes: true
          } 
        },
        { new: true }
      );

      // Broadcast update for job-specific lanes
      broadcastLaneUpdate(organizationId, newLanes, jobId);
      
      return NextResponse.json({
        message: "Job lanes updated successfully",
        jobId: updatedJob._id,
        lanes: updatedJob.lanes,
        useCustomLanes: updatedJob.useCustomLanes
      });
    } else {
      // LEGACY: Update organization default lanes (backward compatibility)
      const organization = await Organization.findOne({ _id: organizationId });

      if (!organization) {
        return NextResponse.json(
          { error: "Organization not found" },
          { status: 404 }
        );
      }

      // Update organization default lanes (use new field name)
      const updatedOrganization = await Organization.findOneAndUpdate(
        { _id: organizationId },
        { $set: { defaultLanes: newLanes } },
        { new: true }
      );
      
      broadcastLaneUpdate(organizationId, updatedOrganization?.defaultLanes || []);
      return NextResponse.json(updatedOrganization);
    }
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
