import { auth } from "@/lib/auth";
import connectToDatabase, { CandidateAccount } from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const jobId = request.nextUrl.searchParams.get("jobid");
    const { user } = (await auth()) || {};

    if (!user) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    if (!CandidateAccount) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    await CandidateAccount.findByIdAndUpdate(user.id, {
      $push: { appliedApplications: jobId },
    }).lean();

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

export async function GET() {
  try {
    await connectToDatabase();
    const { user } = (await auth()) || {};

    if (!user) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    if (!CandidateAccount) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    const candidate = await CandidateAccount.findOne({ _id: user.id }).lean();
    const appliedApplications = (candidate as { appliedApplications: string[] })
      .appliedApplications;

    return NextResponse.json({ appliedApplications }, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
}
