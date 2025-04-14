import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { Job } from "@/lib/mongodb";
export async function GET() {
  try {
    await connectToDatabase();
    if (!Job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    const jobs = await Job.find({
      assignment: { $exists: true },
    })
      .populate("assignment.interviewerId", "name email")
      .select("title company assignment")
      .lean(); // Use lean() for better performance

    return NextResponse.json(jobs);
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
}
