import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { Job } from "@/lib/mongodb";
import { Candidate } from "@/lib/mongodb";
import { auth } from "@/lib/auth";
import { handleCustomFieldFiles, handleFileAttachments } from "@/lib/fileUtils";
import { verifyAndDecryptToken } from "@/app/actions/auth";

export async function GET(request: NextRequest) {
  // console.log("ENV TEST: ",process.env.MONGODB_URI)
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
    const jobs = await Job.find({ organizationId: organizationId }).sort({
      "tracking.createdAt": -1,
    });

    if (!Candidate) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }
    // Add candidate count to each job
    const jobsWithCount = await Promise.all(
      jobs.map(async (job) => {
        const candidateCount = await Candidate!.countDocuments({
          jobId: job._id,
        });
        return { ...job.toObject(), candidateCount }; // Convert job to plain object and add count
      })
    );
    return NextResponse.json(jobsWithCount);
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
}

export async function POST(request: NextRequest) {
  let fileStorage = "local";
  let organizationId;
  try {
    await connectToDatabase();
    const data = await request.json();

    if (!data || !data.title || !data.attachments) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    try {
      const token = request.cookies.get("token");
      if (token?.value) {
        const decryptedResponse = await verifyAndDecryptToken(
          String(token?.value)
        );
        const userData = decryptedResponse.user;
        if (decryptedResponse.success) {
          fileStorage = userData.fileStorage || "local";
          organizationId = userData.organizationId || "";
        }
      }
    } catch {
      throw Error();
    }

    // Handle file uploads
    if (data.attachments) {
      data.attachments = await handleFileAttachments(
        data.attachments,
        fileStorage,
        organizationId
      );
    }

    if (data.customFields) {
      const cs = await handleCustomFieldFiles(
        data.customFields,
        fileStorage,
        organizationId
      );
      data.customFields = cs;
    }

    if (!Job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    delete data._id;
    const newJob = new Job(data);
    await newJob.save();

    return NextResponse.json(newJob, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: "Failed to create job", message: error.message },
        { status: 500 }
      );
    } else {
      return NextResponse.json(
        { error: "Failed to create job", message: "An unknown error occurred" },
        { status: 500 }
      );
    }
  }
}
