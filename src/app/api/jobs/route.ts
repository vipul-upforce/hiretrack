import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { Organization } from "@/lib/mongodb";
import { Job } from "@/lib/mongodb";
import { Candidate } from "@/lib/mongodb";
import { auth } from "@/lib/auth";
import { handleCustomFieldFiles, handleFileAttachments } from "@/lib/fileUtils";
import { verifyAndDecryptToken } from "@/app/actions/auth";
import { NotificationService } from "@/lib/notifications/notificationService";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    // Check authentication
    const session = await auth(request);
    if (
      !session ||
      !session.user?.organizationId ||
      session.user.role === "candidate" ||
      session.user.role === ""
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!Organization || !Job || !Candidate) {
      return NextResponse.json(
        { error: "Database not connected" },
        { status: 400 }
      );
    }
    const organizationId = session.user.organizationId;

    // Fetch organization
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const jobs = await Job.find({ organizationId });
    if (!jobs.length) {
      return NextResponse.json([]);
    }

    const openJobCardsOrder = organization.openJobCards || [];
    const openJobIds = new Set(openJobCardsOrder.map((id) => id.toString()));
    const jobsMap = new Map(jobs.map((job) => [job._id.toString(), job]));

    const sortedJobs = openJobCardsOrder
      .map((id) => jobsMap.get(id.toString()))
      .filter((job): job is NonNullable<typeof job> => !!job);
    const otherJobs = jobs.filter((job) => !openJobIds.has(job._id.toString()));

    const candidateCounts = await Candidate.aggregate([
      { $match: { jobId: { $in: jobs.map((job) => job._id) } } },
      { $group: { _id: "$jobId", count: { $sum: 1 } } },
    ]);
    const candidateCountMap = new Map(
      candidateCounts.map((item) => [item._id.toString(), item.count])
    );

    const jobsWithCount = [...sortedJobs, ...otherJobs].map((job) => ({
      ...job.toObject(),
      candidateCount: candidateCountMap.get(job._id.toString()) || 0,
    }));

    return NextResponse.json(jobsWithCount);
  } catch (error: unknown) {
    console.error("Error fetching jobs:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let fileStorage = "local";
  let organizationId;
  let userData: any;
  try {
    await connectToDatabase();
    const data = await request.json();

    if (!data || !data.title || !data.attachments) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    try {
      const token = request.cookies.get("auth_token");
      if (token?.value) {
        const decryptedResponse = await verifyAndDecryptToken(
          String(token?.value)
        );
        userData = decryptedResponse.user;
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

    // Send job creation notification
    if (userData && organizationId) {
      try {
        await NotificationService.notifyJobCreated({
          organizationId: organizationId,
          jobId: newJob._id.toString(),
          jobTitle: newJob.title,
          triggerUserId: userData?.id,
          triggerUserName: userData?.name,
        });
      } catch (notificationError) {
        console.error(
          "Failed to send job creation notification:",
          notificationError
        );
        // Don't fail the API call if notification fails
      }
    }

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
