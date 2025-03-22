import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { Candidate } from "@/lib/mongodb";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const cookie = _request.cookies.get("user")?.value; 
    let userData = null; 
    if (cookie) {
      userData = JSON.parse(cookie);
    }
    const role = userData.role;

    const { id } = await params;
    if (!Candidate) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }
    let candidates = null;
    const projection = role === "interviewer" ? { 
      currentCTC: 0,
      expectedCTC: 0,
      customFields:0
    } : {};
    
    candidates = await Candidate.find({ jobId: id }, projection)
    .populate("remarks.userId", "name email")
    .populate([
      {
          path: "assignment.interviewerId",
          select: "_id name email",
        },
        {
          path: "jobId",
          select: "title description ",
        },
      ]).lean();
      
      return NextResponse.json(candidates);
    } catch (error) {
      if (error instanceof Error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
}
