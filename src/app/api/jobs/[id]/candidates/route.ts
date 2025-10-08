import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { Candidate } from "@/lib/mongodb";
import { verifyAndDecryptToken } from "@/app/actions/auth";
import { ICandidate } from "@/lib/models/candidate";
import { ProjectionType } from "mongoose";
// import { getFormattedDate } from "@/components/timezoneFormat/getFormattedTZ";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    let role = "";
    const token = _request.cookies.get("auth_token");
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
          path: "followUp.userId",
          select: "name email",
        },
        {
          path: "jobId",
          select: "title description ",
        },
      ])
      .lean();

    // /api/candidates/[id]/history for individual candidate history

    return NextResponse.json(candidates);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
}
