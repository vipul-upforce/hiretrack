import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { JobLaneConfig, Job } from "@/lib/mongodb";
import { verifyAndDecryptJWTToken } from "@/lib/auth";
import {
  IJobLaneConfig,
  ILaneConfig,
  IChecklist,
} from "@/lib/models/JobLaneConfig";

// GET - Get job lane configuration with checklists
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = req.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decryptedResponse = await verifyAndDecryptJWTToken(token);
    if (!decryptedResponse.success || !decryptedResponse.user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const decoded = decryptedResponse.user;

    // Get the user ID from the decoded token (could be _id, id, or userId)
    const userId = decoded._id || decoded.id || decoded.userId;
    if (!userId) {
      console.error("No user ID found in decoded token:", decoded);
      return NextResponse.json(
        { error: "Invalid user ID in token" },
        { status: 401 }
      );
    }

    // Check if user is admin or HR
    if (!["admin", "hr"].includes(decoded.role)) {
      return NextResponse.json(
        { error: "Only admin and HR can configure checklists" },
        { status: 403 }
      );
    }

    await connectToDatabase();
    const { id } = await params;
    // Verify job exists and user has access
    const job = await Job!.findById(id);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.organizationId.toString() !== decoded.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get job lane configuration
    const config = await JobLaneConfig!.findOne({ jobId: id });

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
    const token = req.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decryptedResponse = await verifyAndDecryptJWTToken(token);
    if (!decryptedResponse.success || !decryptedResponse.user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const decoded = decryptedResponse.user;

    // Get the user ID from the decoded token (could be _id, id, or userId)
    const userId = decoded._id || decoded.id || decoded.userId;
    if (!userId) {
      console.error("No user ID found in decoded token:", decoded);
      return NextResponse.json(
        { error: "Invalid user ID in token" },
        { status: 401 }
      );
    }

    // Check if user is admin or HR
    if (!["admin", "hr"].includes(decoded.role)) {
      return NextResponse.json(
        { error: "Only admin and HR can configure checklists" },
        { status: 403 }
      );
    }

    await connectToDatabase();

    const { id } = await params;
    // Verify job exists and user has access
    const job = await Job!.findById(id);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.organizationId.toString() !== decoded.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await req.json();
    const { laneConfigs } = body;

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
        processed.incomingChecklist.createdBy = userId;
      }

      if (processed.outgoingChecklist) {
        processed.outgoingChecklist.createdBy = userId;
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
    const token = req.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decryptedResponse = await verifyAndDecryptJWTToken(token);
    if (!decryptedResponse.success || !decryptedResponse.user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const decoded = decryptedResponse.user;

    // Get the user ID from the decoded token (could be _id, id, or userId)
    const userId = decoded._id || decoded.id || decoded.userId;
    if (!userId) {
      console.error("No user ID found in decoded token:", decoded);
      return NextResponse.json(
        { error: "Invalid user ID in token" },
        { status: 401 }
      );
    }

    // Check if user is admin or HR
    if (!["admin", "hr"].includes(decoded.role)) {
      return NextResponse.json(
        { error: "Only admin and HR can configure checklists" },
        { status: 403 }
      );
    }

    await connectToDatabase();

    const body = await req.json();
    const { laneId, laneConfig } = body;

    if (!laneId || !laneConfig) {
      return NextResponse.json(
        { error: "Lane ID and configuration are required" },
        { status: 400 }
      );
    }

    const { id } = await params;

    // Verify job exists and user has access
    const job = await Job!.findById(id);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.organizationId.toString() !== decoded.organizationId) {
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
    const token = req.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decryptedResponse = await verifyAndDecryptJWTToken(token);
    if (!decryptedResponse.success || !decryptedResponse.user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const decoded = decryptedResponse.user;

    // Get the user ID from the decoded token (could be _id, id, or userId)
    const userId = decoded._id || decoded.id || decoded.userId;
    if (!userId) {
      console.error("No user ID found in decoded token:", decoded);
      return NextResponse.json(
        { error: "Invalid user ID in token" },
        { status: 401 }
      );
    }

    // Check if user is admin or HR
    if (!["admin", "hr"].includes(decoded.role)) {
      return NextResponse.json(
        { error: "Only admin and HR can configure checklists" },
        { status: 403 }
      );
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const laneId = searchParams.get("laneId");
    const checklistType = searchParams.get("type") as "incoming" | "outgoing";

    if (!laneId || !checklistType) {
      return NextResponse.json(
        { error: "Lane ID and checklist type are required" },
        { status: 400 }
      );
    }

    const { id } = await params;
    // Verify job exists and user has access
    const job = await Job!.findById(id);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.organizationId.toString() !== decoded.organizationId) {
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
