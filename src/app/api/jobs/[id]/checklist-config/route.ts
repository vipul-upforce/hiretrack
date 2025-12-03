import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { JobLaneConfig, Job } from "@/lib/mongodb";
import { getAuthenticatedUser } from "@/app/actions/auth";

// GET - Get job lane configuration with checklists
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const [user, { id }] = await Promise.all([
      getAuthenticatedUser(req, ["admin", "hr"]),
      params,
      connectToDatabase(),
    ]);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get job lane configuration

    const [job, config] = await Promise.all([
      Job!
        .findOne({ _id: id, organizationId: user.organizationId })
        .select("_id organizationId")
        .lean()
        .exec(),
      JobLaneConfig!.findOne({ jobId: id }).lean().exec(),
    ]);
    // Verify job exists and user has access
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      data: config || { jobId: id, laneConfigs: [] },
    });
  } catch (error) {
    console.error("Error fetching job lane config:", error);
    return NextResponse.json(
      { error: "Failed to fetch configuration" },
      { status: 500 }
    );
  }
}

// POST - Create or update job lane configuration
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const [user, { id }, { laneConfigs }] = await Promise.all([
      getAuthenticatedUser(req, ["admin", "hr"]),
      params,
      req.json(),
      connectToDatabase(),
    ]);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Verify job exists and user has access
    const job = await Job!
      .findOne({ _id: id, organizationId: user?.organizationId })
      .select("_id organizationId")
      .lean()
      .exec();
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Validate lane configs
    if (!Array.isArray(laneConfigs)) {
      return NextResponse.json(
        { error: "Invalid configuration format" },
        { status: 400 }
      );
    }

    // Process lane configs to set createdBy for checklists
    const processedLaneConfigs = laneConfigs.map((laneConfig) => {
      const processed = { ...laneConfig };

      if (processed.incomingChecklist) {
        processed.incomingChecklist.createdBy = user.id;
      }

      if (processed.outgoingChecklist) {
        processed.outgoingChecklist.createdBy = user.id;
      }

      return processed;
    });

    // Update or create configuration
    const config = await JobLaneConfig!.findOneAndUpdate(
      { jobId: id },
      {
        jobId: id,
        organizationId: job.organizationId,
        laneConfigs: processedLaneConfigs,
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error("Error updating job lane config:", error);
    return NextResponse.json(
      { error: "Failed to update configuration" },
      { status: 500 }
    );
  }
}

// PATCH - Update specific lane configuration
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const [user, { laneId, laneConfig }, { id }] = await Promise.all([
      getAuthenticatedUser(req, ["admin", "hr"]),
      req.json(),
      params,
      connectToDatabase(),
    ]);

    if (!laneId || !laneConfig) {
      return NextResponse.json(
        { error: "Lane ID and configuration are required" },
        { status: 400 }
      );
    }
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;

    // Verify job exists and user has access
    const job = await Job!.findById(id);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.organizationId.toString() !== user.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get existing config or create new one
    let config = await JobLaneConfig!.findOne({ jobId: id });

    if (!config) {
      config = new JobLaneConfig!({
        jobId: id,
        organizationId: job.organizationId,
        laneConfigs: [],
      });
    }

    // Process the lane config to set createdBy for checklists
    const processedLaneConfig = { ...laneConfig, laneId };

    // Set createdBy for incoming checklist if it exists
    if (processedLaneConfig.incomingChecklist) {
      processedLaneConfig.incomingChecklist.createdBy = userId;
    }

    // Set createdBy for outgoing checklist if it exists
    if (processedLaneConfig.outgoingChecklist) {
      processedLaneConfig.outgoingChecklist.createdBy = userId;
    }

    // Update specific lane config
    const laneIndex = config.laneConfigs.findIndex(
      (lc) => lc.laneId === laneId
    );
    if (laneIndex >= 0) {
      config.laneConfigs[laneIndex] = processedLaneConfig;
    } else {
      config.laneConfigs.push(processedLaneConfig);
    }

    config.updatedAt = new Date();
    await config.save();

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error("Error updating lane config:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      error: error,
    });
    return NextResponse.json(
      {
        error: "Failed to update lane configuration",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE - Remove checklist from a specific lane
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    
    const [user,{id}] = await Promise.all([
      getAuthenticatedUser(req, ["admin", "hr"]),
      params,
      connectToDatabase(),
    ]);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const laneId = searchParams.get("laneId");
    const checklistType = searchParams.get("type") as "incoming" | "outgoing";

    if (!laneId || !checklistType) {
      return NextResponse.json(
        { error: "Lane ID and checklist type are required" },
        { status: 400 }
      );
    }

    // Verify job exists and user has access
    const job = await Job!.findById(id);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.organizationId.toString() !== user.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get existing config
    const config = await JobLaneConfig!.findOne({ jobId: id });
    if (!config) {
      return NextResponse.json(
        { error: "No configuration found" },
        { status: 404 }
      );
    }

    // Find and update lane config
    const laneConfig = config.laneConfigs.find((lc) => lc.laneId === laneId);
    if (!laneConfig) {
      return NextResponse.json(
        { error: "Lane configuration not found" },
        { status: 404 }
      );
    }

    // Remove the specific checklist
    if (checklistType === "incoming") {
      laneConfig.incomingChecklist = undefined;
    } else {
      laneConfig.outgoingChecklist = undefined;
    }

    config.updatedAt = new Date();
    await config.save();

    return NextResponse.json({
      success: true,
      message: `${checklistType} checklist removed successfully`,
    });
  } catch (error) {
    console.error("Error deleting checklist:", error);
    return NextResponse.json(
      { error: "Failed to delete checklist" },
      { status: 500 }
    );
  }
}
