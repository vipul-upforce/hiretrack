import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { Job } from "@/lib/mongodb";
import { Candidate } from "@/lib/mongodb";
import { NotificationService } from "@/lib/notifications/notificationService";
import { getAuthenticatedUser } from "@/app/actions/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication

    const [userData, { id }, { status }] = await Promise.all([
      getAuthenticatedUser(request),
      params,
      request.json(),
      connectToDatabase(),
    ]);
    if (!userData) {
      return NextResponse.json(
        { message: "Unauthorised Access" },
        { status: 401 }
      );
    }

    if (!Candidate || !Job) {
      return NextResponse.json({ error: "Models not found" }, { status: 400 });
    }

    // Get current candidate data to access old status and job info
    const currentCandidate = await Candidate.findById(id).populate(
      "jobId",
      "title"
    );
    if (!currentCandidate) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }
    // console.log(currentCandidate, "curenett --00 -         --999d");

    const oldStatus = currentCandidate.status;

    const updatedCandidate = await Candidate.findByIdAndUpdate(
      id,
      {
        status,
        "tracking.updatedAt": new Date(),
      },
      { new: true }
    ).populate("jobId", "title");

    if (!updatedCandidate) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(updatedCandidate);
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
}
