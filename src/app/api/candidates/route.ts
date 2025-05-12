import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { History, Organization } from "@/lib/mongodb";
import { Candidate } from "@/lib/mongodb";
import { handleCustomFieldFiles, handleSingleFile } from "@/lib/fileUtils";
import { handleFileAttachments } from "@/lib/fileUtils";
import mongoose from "mongoose";
import { verifyAndDecryptToken } from "@/app/actions/auth";

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
  try {
    await connectToDatabase();
    const data = await request.json();
    const token = request.cookies.get("token");
    if (token?.value) {
      const decryptedResponse = await verifyAndDecryptToken(
        String(token?.value)
      );
      const userData = decryptedResponse.user;
      if (decryptedResponse.success) {
        const { organizationId, fileStorage } = userData;
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
          const { files: f, images: i } = await handleFileAttachments(
            data.attachments,
            fileStorage,
            organizationId
          );
          data.attachments = [...f, ...i];
        }

        if (data.resume) {
          data.resume = await handleSingleFile(
            data.resume,
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
                  ...(data.assignment.time && {
                    time: new Date(data.assignment.time),
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
          email: data.email || "",
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

        // const historyExisting =
        if (userData.role === "candidate") {
          await History?.create({
            candidateId: candidate._id,
            jobId: data.jobId,
            history: [
              {
                dateTime: new Date().toISOString(),
                title: "Self Applied",
                previousInterviewer: null,
                currentInterviewer: null,
                assignmentBy: userData.id,
              },
            ],
          });
        } else {
          await History?.create({
            candidateId: candidate._id,
            jobId: data.jobId,
            history: [
              {
                dateTime: new Date().toISOString(),
                title: "Candidate Added",
                previousInterviewer: null,
                currentInterviewer: null,
                assignmentBy: userData.id,
              },
            ],
          });
        }
        // console.log("⛔⛔ existing history", historyExisting);

        return NextResponse.json(candidate, { status: 201 });
      } else {
        return NextResponse.json(
          { message: "Unauthorised Access" },
          { status: 401 }
        );
      }
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
}
