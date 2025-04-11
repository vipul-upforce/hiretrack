import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { History } from "@/lib/mongodb";
import {
  Attachments,
  FileAttachment,
  handleFileAttachments,
} from "@/lib/fileUtils";
import { verifyAndDecryptToken } from "@/app/actions/auth";

export async function POST(request: NextRequest) {
  //Getting the history data
  try {
    await connectToDatabase();
    const data = await request.json();

    if (!History) {
      return NextResponse.json(
        { error: "Database not connected" },
        { status: 400 }
      );
    }

    if (!data || !data.jobId || !data.candidateId) {
      return NextResponse.json(
        { error: "Job ID and Candidate ID are required" },
        { status: 400 }
      );
    }

    const historyEntry = await History.findOne({
      jobId: data.jobId,
      candidateId: data.candidateId,
    })
      .populate("history.currentInterviewer", "_id name email")
      .populate("history.previousInterviewer", "_id name email")
      .populate("history.assignmentBy", "_id name email")
      .populate("history.note.userId", "_id name email")
      .lean();

    if (!historyEntry) {
      return NextResponse.json(
        { error: "No Assignment History Found" },
        { status: 404 }
      );
    }

    return NextResponse.json(historyEntry.history);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
}

export async function PUT(request: NextRequest) {
  if (!History) {
    return NextResponse.json(
      { error: "Database not connected" },
      { status: 400 }
    );
  }
  try {
    await connectToDatabase();
    const data = await request.json();
    let fileStorage = "local";
    let organizationId;

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
    // Extracted history saving feature
    if (!data || !data.jobId || !data.candidateId) {
      return NextResponse.json(
        { error: "Job ID and Candidate ID are required" },
        { status: 400 }
      );
    }

    if (data.newEntry.attachments) {
      const newAttachments: Attachments = {
        files: data.newEntry.attachments.filter(
          (attachment: FileAttachment) => !attachment.type.startsWith("image/")
        ) as FileAttachment[],
        images: data.newEntry.attachments.filter((attachment: FileAttachment) =>
          attachment.type.startsWith("image/")
        ) as FileAttachment[],
      };
      const updatedFiles = await handleFileAttachments(
        newAttachments,
        fileStorage,
        organizationId
      );

      data.newEntry.attachments = [
        ...updatedFiles.files,
        ...updatedFiles.images,
      ];
    }

    const historyEntry = await History.findOneAndUpdate(
      { jobId: data.jobId, candidateId: data.candidateId },
      { $push: { history: data.newEntry } },
      { upsert: true, new: true, runValidators: true }
    );

    if (!historyEntry) {
      return NextResponse.json(
        { error: "No Assignment History Found" },
        { status: 404 }
      );
    }
    return NextResponse.json(historyEntry.history);
    // return NextResponse.json({});
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
}
