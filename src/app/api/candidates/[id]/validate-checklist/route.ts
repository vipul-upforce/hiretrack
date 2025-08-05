import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { Candidate, JobLaneConfig, Job } from "@/lib/mongodb";
import { verifyAndDecryptJWTToken } from "@/lib/auth";
import { filterChecklistByRole, getUserRole } from "@/lib/utils/checklistVisibility";

// POST - Validate if candidate can move to a new lane based on checklist requirements
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decryptedResponse = await verifyAndDecryptJWTToken(token);
    if (!decryptedResponse.success || !decryptedResponse.user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    
    const decoded = decryptedResponse.user;

    await connectToDatabase();

    // Check if models are initialized
    if (!Candidate || !Job || !JobLaneConfig) {
      console.error("Models not initialized:", { Candidate: !!Candidate, Job: !!Job, JobLaneConfig: !!JobLaneConfig });
      return NextResponse.json(
        { error: "Database models not initialized" },
        { status: 500 }
      );
    }

    const body = await req.json();
    console.log("Validate checklist request:", {
      candidateId: params.id,
      body,
      user: decoded
    });
    
    const { currentLane, targetLane, movementType } = body;

    if (!currentLane || !targetLane || !movementType) {
      return NextResponse.json(
        { error: "Current lane, target lane, and movement type are required" },
        { status: 400 }
      );
    }

    // Get candidate
    const candidate = await Candidate!.findById(params.id);
    console.log("Found candidate:", candidate ? "Yes" : "No", candidate?._id);
    if (!candidate) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }

    // Get job configuration
    const job = await Job!.findById(candidate.jobId);
    console.log("Found job:", job ? "Yes" : "No", job?._id);
    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    // Get job lane configuration
    const laneConfig = await JobLaneConfig!.findOne({ jobId: job._id });
    console.log("Found lane config:", laneConfig ? "Yes" : "No", laneConfig?.laneConfigs?.length);
    if (!laneConfig) {
      // No checklists configured, allow movement
      return NextResponse.json({
        success: true,
        canMove: true,
        requiresChecklist: false
      });
    }

    // Determine which checklist to check based on movement type
    let checklistToValidate = null;
    let laneToCheck = null;

    console.log("Looking for checklist:", {
      movementType,
      currentLane,
      targetLane,
      availableLanes: laneConfig.laneConfigs.map(lc => ({ laneId: lc.laneId, hasIncoming: !!lc.incomingChecklist, hasOutgoing: !!lc.outgoingChecklist }))
    });

    if (movementType === "outgoing") {
      // Moving out of current lane - check outgoing checklist
      laneToCheck = laneConfig.laneConfigs.find(lc => lc.laneId === currentLane);
      console.log("Outgoing - Found lane config:", laneToCheck ? "Yes" : "No", "Has outgoing checklist:", !!laneToCheck?.outgoingChecklist);
      if (laneToCheck?.outgoingChecklist) {
        checklistToValidate = laneToCheck.outgoingChecklist;
      }
    } else {
      // Moving into target lane - check incoming checklist
      laneToCheck = laneConfig.laneConfigs.find(lc => lc.laneId === targetLane);
      console.log("Incoming - Found lane config:", laneToCheck ? "Yes" : "No", "Has incoming checklist:", !!laneToCheck?.incomingChecklist);
      if (laneToCheck?.incomingChecklist) {
        checklistToValidate = laneToCheck.incomingChecklist;
      }
    }

    console.log("Final checklist to validate:", checklistToValidate ? "Found" : "None");

    // If no checklist for this movement, allow
    if (!checklistToValidate) {
      return NextResponse.json({
        success: true,
        canMove: true,
        requiresChecklist: false
      });
    }

    // Filter checklist fields based on user role for form visibility
    const userRole = getUserRole(decoded.role);
    if (!userRole) {
      return NextResponse.json(
        { error: "Invalid user role" },
        { status: 403 }
      );
    }

    const filteredChecklist = filterChecklistByRole(checklistToValidate, userRole, 'form');
    
    // If no fields are visible to this user, skip checklist entirely
    if (!filteredChecklist) {
      return NextResponse.json({
        success: true,
        canMove: true,
        requiresChecklist: false,
        message: "No checklist fields visible to current user role"
      });
    }

    // Check if checklist is mandatory
    if (!checklistToValidate.isMandatory) {
      // Optional checklist - return info but allow movement
      return NextResponse.json({
        success: true,
        canMove: true,
        requiresChecklist: true,
        checklist: filteredChecklist,
        isMandatory: false
      });
    }

    // For mandatory checklist, check if already completed
    let candidateChecklistData = (candidate.checklistData && candidate.checklistData[laneToCheck.laneId]) || {};
    // const candidateChecklistData = candidate.checklistData?.get?.(laneToCheck.laneId);
    const checklistData = movementType === "outgoing" 
      ? candidateChecklistData?.outgoing 
      : candidateChecklistData?.incoming;

    if (checklistData && checklistData.checklistId === checklistToValidate.id) {
      // Checklist already completed
      return NextResponse.json({
        success: true,
        canMove: true,
        requiresChecklist: false,
        checklistCompleted: true
      });
    }

    // Mandatory checklist not completed - block movement
    return NextResponse.json({
      success: true,
      canMove: false,
      requiresChecklist: true,
      checklist: filteredChecklist,
      isMandatory: true,
      message: "This checklist must be completed before moving the candidate"
    });

  } catch (error) {
    console.error("Error validating checklist:", error);
    console.error("Validation error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      candidateId: params.id,
      error: error
    });
    return NextResponse.json(
      { 
        error: "Failed to validate checklist",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}