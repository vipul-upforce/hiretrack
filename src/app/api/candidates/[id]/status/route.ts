import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { Job } from "@/lib/mongodb";
import { Candidate } from "@/lib/mongodb";
import { verifyAndDecryptJWTToken } from "@/lib/auth";

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
    
    return NextResponse.json(updatedCandidate);
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
}
