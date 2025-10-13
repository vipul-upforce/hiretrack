import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { History, JobLaneConfig } from "@/lib/mongodb";
import { verifyAndDecryptToken } from "@/app/actions/auth";
import {
  filterChecklistResponses,
  getUserRole,
} from "@/lib/utils/checklistVisibility";

// Disable static generation for this API route
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();

    // Authenticate user
    let role = "";
    let organizationId = "";
    const token = request.cookies.get("auth_token");
    if (token?.value) {
      const decryptedResponse = await verifyAndDecryptToken(
        String(token?.value)
      );
      const userData = decryptedResponse.user;
      if (decryptedResponse.success) {
        role = userData.role;
        organizationId = userData.organizationId;
      }
    }

    if (role === "candidate") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: candidateId } = await params;

    if (!History) {
      return NextResponse.json(
        { error: "History model not found" },
        { status: 404 }
      );
    }

    // Get candidate history
    const history = await History?.findOne({
      candidateId: candidateId,
    })
      .populate("history.currentInterviewer", "_id name email")
      .populate("history.previousInterviewer", "_id name email")
      .populate("history.assignmentBy", "_id name email")
      .populate("history.note.userId", "_id name email")
      .lean();

    console.log("📌📌📌HISTORY: ", history);

    if (!history) {
      return NextResponse.json({ history: [] });
    }

    // Get user role for checklist filtering
    const userRole = getUserRole(role);

    // Get job lane configuration for checklist field filtering
    const laneConfig = await JobLaneConfig?.findOne({
      jobId: history.jobId,
    });

    // Filter history entries and checklist responses based on user role
    const filteredHistory = history.history
      ? history.history
          .filter((entry) =>
            role === "admin" || role === "hr"
              ? true
              : entry.remark
                ? !entry.remark?.isPrivate
                : true
          )
          .map((entry: any) => {
            // If this entry has checklist data, filter the responses based on user role
            if (entry.checklistForm && userRole && laneConfig) {
              // Find the checklist configuration to get field visibility settings
              let checklistFields: any[] = [];
              const targetLane = laneConfig.laneConfigs.find(
                (lc: any) => lc.laneId === entry.checklistForm.laneId
              );
              if (targetLane) {
                const checklist =
                  entry.checklistForm.checklistType === "incoming"
                    ? targetLane.incomingChecklist
                    : targetLane.outgoingChecklist;

                if (checklist && checklist.fields) {
                  checklistFields = checklist.fields;
                }
              }

              // Filter the responses based on user role and field visibility
              const filteredResponses = filterChecklistResponses(
                entry.checklistForm.responses,
                checklistFields,
                userRole
              );

              return {
                ...entry,
                checklistForm: {
                  ...entry.checklistForm,
                  responses: filteredResponses,
                },
              };
            }

            return entry;
          })
      : [];

    return NextResponse.json({
      history: filteredHistory,
      candidateId: candidateId,
      jobId: history.jobId,
    });
  } catch (error) {
    console.error("Error fetching candidate history:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
