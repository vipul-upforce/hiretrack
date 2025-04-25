import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { Organization } from "@/lib/mongodb";
import { Candidate } from "@/lib/mongodb";
import { handleCustomFieldFiles, handleSingleFile } from "@/lib/fileUtils";
import { handleFileAttachments } from "@/lib/fileUtils";
import mongoose from "mongoose";
import { Job } from "@/lib/mongodb"; // Add import for Job model
import { Attachment } from "../route";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const data = await request.json();
    // console.log("&&&&&&&&&&&&&&DATAPAYLOAD: ", data);

    const { jobId } = data;
    if (!Job) {
      throw new Error("Database not connected");
    }
    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    const job = await Job.findById(new mongoose.Types.ObjectId(jobId._id));

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const organizationId = job.organizationId;

    // console.log("ORGID: ", organizationId);

    const organizationInfo = await Organization?.findById(organizationId);

    if (!organizationInfo) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const fileStorage = "local";
    const candidateStatus = organizationInfo.lanes.includes("applied")
      ? "applied"
      : organizationInfo.lanes[0];

    if (data.attachments) {
      const images = data.attachments.filter((attachment: Attachment) =>
        attachment.type.startsWith("image")
      );
      const files = data.attachments.filter(
        (attachment: Attachment) => !attachment.type.startsWith("image")
      );
      data.attachments = { images, files };
      const { files: f, images: i } = await handleFileAttachments(
        data.attachments,
        fileStorage,
        String(organizationId)
      );
      data.attachments = [...f, ...i];
    }

    if (data.resume) {
      data.resume = await handleSingleFile(
        data.resume,
        fileStorage,
        String(organizationId)
      );
    }

    if (data.customFields) {
      const cs = await handleCustomFieldFiles(
        data.customFields,
        fileStorage,
        String(organizationId)
      );
      data.customFields = cs;
    }

    const candidateData = {
      jobId: data.jobId,
      organizationId: organizationId,
      name: data.name,
      location: data.location,
      experience: data.experience,
      skills: data.skills,
      expectedCTC: data.expectedCTC,
      currentCTC: data.currentCTC,
      noticePeriod: data.noticePeriod,
      status: candidateStatus,
      remarks: data.remarks || [],
      tracking: {
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      ...(data.assignment && data.assignment.interviewerId !== "-1"
        ? {
            assignment: {
              interviewerId: data.assignment.interviewerId,
              assignedAt: new Date(),
              ...(data.assignment.time && {
                time: new Date(data.assignment.time),
              }),
            },
          }
        : null),
      ...(data.resume
        ? {
            resume: {
              id: data.resume.id,
              name: data.resume.name,
              url: data.resume.url,
              type: data.resume.type,
              size: data.resume.size,
            },
          }
        : null),
      attachments: (data.attachments || []).map((attachment: Attachment) => ({
        id: attachment.id,
        name: attachment.name,
        url: attachment.url,
        type: attachment.type,
        size: attachment.size,
      })),
      customFields: data.customFields || {},
      email: data.email || "",
      source: "guest-apply",
    };

    if (!Candidate) {
      return NextResponse.json(
        { error: "Candidate model not found" },
        { status: 500 }
      );
    }

    const candidate = await Candidate.create(candidateData);

    // Populate the interviewer details before sending response
    if (candidate.assignment && candidate.assignment.interviewerId) {
      await candidate.populate("assignment.interviewerId", "name email");
    }

    return NextResponse.json(candidate, { status: 201 });
  } catch (error: unknown) {
    console.error("Error in guest apply API:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: "An unknown error occurred" },
      { status: 500 }
    );
  }
}
