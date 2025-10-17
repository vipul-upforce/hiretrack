import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { Job } from "@/lib/mongodb";
import { Candidate } from "@/lib/mongodb";
import { verifyAndDecryptJWTToken } from "@/lib/auth";
import { NotificationService } from "@/lib/notifications/notificationService";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const token = request.headers.get("cookie")?.match(/token=([^;]+)/)?.[1];
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const orgId = request.cookies.get("org_id")?.value;
    const decryptedResponse = await verifyAndDecryptJWTToken(token, orgId);
    if (!decryptedResponse.success || !decryptedResponse.user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const userData = decryptedResponse.user;

    await connectToDatabase();
    const { status } = await request.json();
    const { id } = await params;

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
    // console.log(oldStatus, "Olda status===000000");
    // console.log(status, "neww status===000000");

    // Trigger notification if status actually changed
    if (oldStatus !== status && oldStatus && status) {
      try {
        const jobInfo = updatedCandidate.jobId as any;
        await NotificationService.notifyCandidateStatusUpdated({
          organizationId: userData.organizationId,
          candidateId: updatedCandidate._id.toString(),
          candidateName: updatedCandidate.name,
          jobId:
            jobInfo?._id?.toString() ||
            updatedCandidate.jobId?.toString() ||
            "",
          jobTitle: jobInfo?.title || "Unknown Job",
          oldStatus,
          newStatus: status,
          triggerUserId: userData._id,
          triggerUserName: userData.name,
        });
        // console.log("Status updatesss notifyyy  ===== = ");
      } catch (notificationError) {
        console.error(
          "Failed to send status update notification:",
          notificationError
        );
        // Don't fail the API call if notification fails
      }
    }

    return NextResponse.json(updatedCandidate);
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
}
