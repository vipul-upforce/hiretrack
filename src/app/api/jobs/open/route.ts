import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { Job, Candidate, History } from "@/lib/mongodb";
import { auth } from "@/lib/auth";
import { ICandidateHistory } from "@/lib/models/history";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = await auth(request);
    const organizationId = session?.user.organizationId;
    if (!Job) {
      return NextResponse.json(
        { error: "Job or Candidate not found" },
        { status: 404 }
      );
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID not found" },
        { status: 404 }
      );
    }

    const jobs = await Job.find(
      {
        organizationId: organizationId,
        status: "open",
        $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
      },
      {
        _id: 1,
        title: 1,
      }
    ).sort({
      "tracking.createdAt": -1,
    });
    return NextResponse.json(jobs);
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const session = await auth(req);
    const organizationId = session?.user.organizationId;

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { jobId, candidateId } = body;

    if (!jobId || !candidateId) {
      return NextResponse.json(
        { error: "Job ID and Candidate ID are required" },
        { status: 400 }
      );
    }

    if (!Candidate && !History) {
      return NextResponse.json(
        { error: "Candidate & History not found" },
        { status: 404 }
      );
    }

    // Find the candidate and their current history
    const candidate = await Candidate!.findById(candidateId);

    if (!candidate) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }

    // Check if candidate is already assigned to this job
    if (candidate.jobId?.toString() === jobId) {
      return NextResponse.json(
        { error: "Candidate is already assigned to this job" },
        { status: 400 }
      );
    }

    const existingHistory = await History!.findOne({
      candidateId: candidateId,
      jobId: candidate.jobId,
    });

    // Update candidate with new job assignment and set status to "applied"
    await Candidate!.findByIdAndUpdate(candidateId, {
      jobId: jobId,
      status: "applied",
      $set: {
        "tracking.assignedToJobDate": new Date().toISOString(),
      },
    });

    // If there's existing history, update it with the new jobId
    if (existingHistory) {
      await History!.findOneAndUpdate(
        {
          candidateId: candidateId,
          jobId: candidate.jobId,
        },
        {
          $set: { jobId: jobId },
        }
      );
    }

    // Fetch the job details using jobId
    const job = await Job!.findById(jobId);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Fetch both previous and new job details
    const previousJob = candidate.jobId
      ? await Job!.findById(candidate.jobId)
      : null;
    const nextJob = await Job!.findById(jobId);

    if (!nextJob) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Create a new history entry for the job assignment
    const historyEntry: ICandidateHistory = {
      dateTime: new Date().toLocaleString(),
      title: "Assigned to Job",
      note: {
        description: `Candidate moved from ${previousJob?.title || "No previous job"} to ${nextJob.title}`,
        date: new Date().toISOString(),
        rating: 0,
        userId: session?.user._id || null,
      },
      attachments: [],
      currentInterviewer: null,
      previousInterviewer: null,
      assignmentBy: session?.user._id || null,
    };

    // Add this entry to history collection
    await History!.findOneAndUpdate(
      { jobId, candidateId },
      { $push: { history: historyEntry } },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
}
