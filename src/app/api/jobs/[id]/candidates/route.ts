import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { Candidate } from "@/lib/mongodb";
import { getAuthenticatedUser } from "@/app/actions/auth";
import { ICandidate } from "@/lib/models/candidate";
import { ProjectionType } from "mongoose";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Resolve params and authenticate in parallel
    const [{ id }, userData] = await Promise.all([
      params,
      getAuthenticatedUser(_request, ["interviewer", "admin", "hr"]),
    ]);

    // Handle authentication errors
    if (!userData) {
      return NextResponse.json(
        { message: "Unauthorised Access" },
        { status: 401 }
      );
    }

    // Validate job ID
    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Invalid job ID" },
        { status: 400 }
      );
    }

    // Connect to database
    await connectToDatabase();

    if (!Candidate) {
      return NextResponse.json(
        { error: "Database model not available" },
        { status: 500 }
      );
    }
    const projection: ProjectionType<ICandidate> =
      userData?.role === "interviewer"
        ? {
            currentCTC: 0,
            expectedCTC: 0,
            customFields: 0,
          }
        : {};

    // Optimize populate: combine all into single array, remove duplicates
    // Use lean() for better performance with plain objects
    const candidates = await Candidate.find({ jobId: id }, projection)
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
          select: "title description",
        },
      ])
      .sort({ "tracking.createdAt": -1 }) // Consistent sorting
      .lean()
      .exec();

    return NextResponse.json(candidates);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
