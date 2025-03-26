import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { Organization } from "@/lib/mongodb";
import { Candidate } from "@/lib/mongodb";
import { handleCustomFieldFiles, handleSingleFile } from "@/lib/fileUtils";
import { handleFileAttachments } from "@/lib/fileUtils";
import mongoose from "mongoose";

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    await connectToDatabase();
    if (!Candidate) {
      return NextResponse.json(
        { error: "Candidate Model not found" },
        { status: 404 }
      );
    }
    const query = jobId ? { jobId } : {};
    const candidates = await Candidate.find(query).sort({
      "tracking.createdAt": -1,
    });
    return NextResponse.json(candidates);
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
}

export async function POST(request: NextRequest) {
  let fileStorage = 'local';
  try {
    const userCookie = request.cookies.get('user')?.value;
    if (userCookie) {
      const userData = JSON.parse(userCookie);
      // console.log("$$$$$$$$$$$$JOBN ",userData)
      fileStorage = userData.fileStorage || 'local';
    }
  } catch (error) {
    console.error("Error parsing user cookie:", error);
  }
  try {
    await connectToDatabase();
    const data = await request.json();
    const user = request.cookies.get("user");
    const { organizationId } = JSON.parse(user?.value || "{}");
    const organizationInfo = await Organization?.findById(
      new mongoose.Types.ObjectId(organizationId)
    );
    if (!organizationInfo) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }
    const candidateStatus = organizationInfo.lanes.includes("applied")
      ? "applied"
      : organizationInfo.lanes[0];
    // resume
    if (data.attachments) {
      const images = data.attachments.filter((attachment: Attachment) =>
        attachment.type.startsWith("image")
      );
      const files = data.attachments.filter(
        (attachment: Attachment) => !attachment.type.startsWith("image")
      );
      data.attachments = { images, files };
      const {files : f, images : i} = await handleFileAttachments(data.attachments, fileStorage,organizationId, request);
      data.attachments = [...f, ...i];
    }

    if (data.resume) {
      data.resume = await handleSingleFile(data.resume, fileStorage, organizationId, request);
    }

    if (data.customFields) {
      const cs = await handleCustomFieldFiles(
        data.customFields,
        fileStorage,
        organizationId,
        request
      );
      data.customFields = cs;
    }

    // Prepare candidate data with assignment if provided
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
      // currentLocation: data.currentLocation,
      status: candidateStatus,
      remarks: data.remarks || [],
      tracking: {
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      // Handle assignment data
      ...(data.assignment && data.assignment.interviewerId !== "-1"
        ? {
            assignment: {
              interviewerId: data.assignment.interviewerId,
              assignedAt: new Date(),
              ...(data.assignment.deadline && {
                deadline: new Date(data.assignment.deadline),
              }),
            },
          }
        : null),
      // Handle file data
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
      // Handle attachments array
      attachments: data.attachments.map((attachment: Attachment) => ({
        id: attachment.id,
        name: attachment.name,
        url: attachment.url,
        type: attachment.type,
        size: attachment.size,
      })),
      customFields: data.customFields,
    };

    if (!Candidate) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }
    const candidate = await Candidate.create(candidateData);

    // Populate the interviewer details before sending response
    await candidate.populate("assignment.interviewerId", "name email");

    return NextResponse.json(candidate, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
}
