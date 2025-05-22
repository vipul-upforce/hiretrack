import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { History } from "@/lib/mongodb";
import {
  Attachments,
  FileAttachment,
  handleFileAttachments,
} from "@/lib/fileUtils";
import { verifyAndDecryptToken } from "@/app/actions/auth";
import { v4 as uuidv4 } from "uuid";
import { auth } from "@/lib/auth";
import mongoose from "mongoose";

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

export async function PATCH(request: NextRequest) {
  //✅ UPDATES REMARK ONLY
  try {
    await connectToDatabase();

    const data = await request.json();
    const { id, description, isPrivate, rating } = data;
    const { user } = (await auth(request)) || {};
    // console.log("USERDATA: ", user);

    // Validate input
    if (
      !id ||
      typeof isPrivate !== "boolean" ||
      typeof description !== "string"
    ) {
      return NextResponse.json(
        { error: "Invalid input: id, isPrivate, and description are required" },
        { status: 400 }
      );
    }

    if (!History) {
      throw new Error("Database not connected");
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    // Update the remark in the history array
    const updatedHistory = await History.findOneAndUpdate(
      {
        "history.remark.id": id,
        $or: [
          { "history.assignmentBy": new mongoose.Types.ObjectId(user.id) },
          { "user.role": { $in: ["admin", "hr"] } },
        ],
      },
      {
        $set: {
          "history.$.remark.description": description,
          "history.$.remark.isPrivate": isPrivate,
          "history.$.remark.rating": rating,
          "history.$.remark.updatedAt": new Date(),

          "history.$.assignmentBy": new mongoose.Types.ObjectId(user.id),
          "history.$.title": "Remark Updated",
        },
      },
      { new: true }
    );

    if (!updatedHistory) {
      return NextResponse.json(
        { error: "Remark not found or unauthorized" },
        { status: 404 }
      );
    }

    const updatedItem = updatedHistory.history.find(
      (item) => item.remark && item.remark.id === id
    );

    if (!updatedItem) {
      return NextResponse.json(
        { error: "Remark not found in updated document" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: "Successfully updated the remark",
        data: updatedItem,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating remark:", error);
    return NextResponse.json(
      { error: "Failed to update remark" },
      { status: 500 }
    );
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
    let data = await request.json();
    // data = { ...data, id: uuidv4() };
    if (data?.newEntry?.remark?.description) {
      data = {
        ...data,
        newEntry: {
          ...data.newEntry,
          remark: {
            ...data.newEntry.remark,
            id: uuidv4(),
          },
        },
      };
    }
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
