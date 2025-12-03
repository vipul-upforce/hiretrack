import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { History, JobLaneConfig } from "@/lib/mongodb";
import { getAuthenticatedUser } from "@/app/actions/auth";
import { filterChecklistResponses } from "@/lib/utils/checklistVisibility";
import type { UserRole } from "@/lib/models/JobLaneConfig";
// Disable static generation for this API route
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const [{ id }, userData] = await Promise.all([
      params,
      getAuthenticatedUser(request, ["admin", "hr", "interviewer"]),
      connectToDatabase(),
    ]);

    if (!userData) {
      return NextResponse.json(
        { message: "Unauthorised Access" },
        { status: 401 }
      );
    }

    const role = userData?.role;
    const candidateId = id;

    if (!History) {
      return NextResponse.json(
        { error: "History model not found" },
        { status: 404 }
      );
    }
    const populateFields = [
      { path: "history.currentInterviewer", select: "_id name email" },
      { path: "history.previousInterviewer", select: "_id name email" },
      { path: "history.assignmentBy", select: "_id name email" },
      { path: "history.note.userId", select: "_id name email" },
    ];
    // Get candidate history
    const history = await History?.findOne({
      candidateId: candidateId,
    })
      .populate(populateFields)
      .lean();

    if (!history) {
      return NextResponse.json({ history: [] });
    }

    // Get job lane configuration for checklist field filtering
    const laneConfig = await JobLaneConfig?.findOne({
      jobId: history.jobId,
    }).lean().exec();

    // Filter history entries and checklist responses based on user role
    const filteredHistory = history.history
      ? history.history
          .filter((entry) =>
            role === "admin" || role === "hr"
              ? true
              : entry.remark.id
                ? !entry.remark?.isPrivate
                : true
          )
          .map((entry: any) => {
            // If this entry has checklist data, filter the responses based on user role
            if (entry.checklistForm && userData?.role && laneConfig) {
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
                userData?.role as UserRole
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
