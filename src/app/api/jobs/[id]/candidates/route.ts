import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { History, JobLaneConfig } from "@/lib/mongodb";
import { Candidate } from "@/lib/mongodb";
import { verifyAndDecryptToken } from "@/app/actions/auth";
import { ICandidate } from "@/lib/models/candidate";
import { ProjectionType } from "mongoose";
import { filterChecklistResponses, getUserRole } from "@/lib/utils/checklistVisibility";
// import { getFormattedDate } from "@/components/timezoneFormat/getFormattedTZ";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    let role = "";
    const token = _request.cookies.get("token");
    if (token?.value) {
      const decryptedResponse = await verifyAndDecryptToken(
        String(token?.value)
      );
      const userData = decryptedResponse.user;
      if (decryptedResponse.success) {
        role = userData.role;
      }
    }

    if (role === "candidate") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!Candidate) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }
    let candidates = null;
    const projection: ProjectionType<ICandidate> =
      role === "interviewer"
        ? {
            currentCTC: 0,
            expectedCTC: 0,
            customFields: 0,
          }
        : {};

    candidates = await Candidate.find({ jobId: id }, projection)
      .populate("remarks.userId", "name email")
      .populate([
        {
          path: "assignment.interviewerId",
          select: "_id name email",
        },
        {
          path: "remarks.userId",
          select: "name email",
        },
        {
          path: "jobId",
          select: "title description ",
        },
      ])
      .lean();

    if (!History) return;

    // Get user role for checklist filtering
    const userRole = getUserRole(role);
    
    // Get job lane configuration for checklist field filtering
    const laneConfig = await JobLaneConfig?.findOne({ jobId: id });

    const candidatesWithHistory = await Promise.all(
      candidates.map(async (candidate) => {
        const history = await History?.findOne({
          jobId: id,
          candidateId: candidate._id.toString(),
        })
          .populate("history.currentInterviewer", "_id name email")
          .populate("history.previousInterviewer", "_id name email")
          .populate("history.assignmentBy", "_id name email")
          .populate("history.note.userId", "_id name email")
          .lean();

        // Filter history entries and checklist responses based on user role
        const filteredHistory = history?.history
          ? history.history.filter((entry) =>
              role === "admin" || role === "hr"
                ? true
                : !entry.remark?.isPrivate
            ).map((entry: any) => {
              // If this entry has checklist data, filter the responses based on user role
              if (entry.checklistForm && userRole && laneConfig) {
                // Find the checklist configuration to get field visibility settings
                let checklistFields: any[] = [];
                const targetLane = laneConfig.laneConfigs.find((lc: any) => lc.laneId === entry.checklistForm.laneId);
                if (targetLane) {
                  const checklist = entry.checklistForm.checklistType === "incoming" 
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
                    responses: filteredResponses
                  }
                };
              }
              
              return entry;
            })
          : [];

        return {
          ...candidate,
          history: filteredHistory,
        };
      })
    );

    // console.log("Candidate with History: ",candidatesWithHistory)
    return NextResponse.json(candidatesWithHistory);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
}
