import { getAuthenticatedUser } from "@/app/actions/auth";
import { getFormattedDate } from "@/components/timezoneFormat/getFormattedTZ";
import connectToDatabase, { CandidateAccount, History } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {

    const [user] = await Promise.all([
      getAuthenticatedUser(request),
      connectToDatabase(),
    ]);
    if (!user) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }
    // Give models a moment to initialize if they haven't already
    let retries = 0;
    while (!CandidateAccount && retries < 5) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      retries++;
    }
    const jobId = request.nextUrl.searchParams?.get("jobid");

    if (!CandidateAccount) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }
    const dateTime = await getFormattedDate(request, new Date());

    const [candidate] = await Promise.all([
      CandidateAccount.findByIdAndUpdate(
        user.id,
        { $push: { appliedApplications: jobId } },
        { new: true, lean: true } // Return updated document
      ),
      History?.create({
        candidateId: user?.id,
        jobId,
        history: [
          {
            dateTime: dateTime,
            title: "Self Applied",
            previousInterviewer: null,
            currentInterviewer: null,
            assignmentBy: user.id,
          },
        ],
      }),
    ]);
    if (!candidate) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Application submitted successfully" },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const [user] = await Promise.all([
      getAuthenticatedUser(request),
      connectToDatabase(),
    ]);

    if (!user) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    // Give models a moment to initialize if they haven't already
    let retries = 0;
    while (!CandidateAccount && retries < 5) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      retries++;
    }
    if (!CandidateAccount) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    const candidate = await CandidateAccount.findOne({ _id: user.id })
      .select("appliedApplications")
      .lean();
    if (!candidate) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }
    const appliedApplications = candidate.appliedApplications || [];

    return NextResponse.json({ appliedApplications }, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
}
