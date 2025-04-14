import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { Job } from "@/lib/mongodb";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { status } = await request.json();
    const { id } = await params;
    if (!Job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    const updatedJob = await Job.findByIdAndUpdate(
      id,
      {
        status,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!updatedJob) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json(updatedJob);
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
}
