import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { Candidate } from "@/lib/mongodb";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    if (!Candidate) {
      return NextResponse.json(
        { error: "Candidate Model Not Found" },
        { status: 404 }
      );
    }
    const candidates = await Candidate.find({ jobId: id }).sort({
      "tracking.createdAt": -1,
    });

    return NextResponse.json(candidates);
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
}
