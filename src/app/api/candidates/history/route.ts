import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, {
  Candidate,
  History,
  JobLaneConfig,
  User,
} from "@/lib/mongodb";
import {
  Attachments,
  FileAttachment,
  handleFileAttachments,
} from "@/lib/fileUtils";
import { getAuthenticatedUser } from "@/app/actions/auth";
import { v4 as uuidv4 } from "uuid";
import mongoose, { Types } from "mongoose";
import { broadcastCandidateUpdate } from "@/lib/broadcast/broadCastCandidate";
import { ICandidate } from "@/lib/models/candidate";
import { ICandidateHistory } from "@/lib/models/history";
import {
  filterChecklistResponses,
} from "@/lib/utils/checklistVisibility";
import { NotificationService } from "@/lib/notifications/notificationService";
import { UserRole } from "@/lib/models/JobLaneConfig";
import { sendRemarkNotificationWithMentions } from "@/lib/unifiedEmailService";
import { getFormattedDate } from "@/components/timezoneFormat/getFormattedTZ";

export async function POST(request: NextRequest) {
  //Getting the history data
  try {
    const [userData, data] = await Promise.all([
      getAuthenticatedUser(request),
      request.json(),
      connectToDatabase(),
    ]);
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    const populateFields = [
      { path: "history.currentInterviewer", select: "_id name email" },
      { path: "history.previousInterviewer", select: "_id name email" },
      { path: "history.assignmentBy", select: "_id name email" },
      { path: "history.note.userId", select: "_id name email" },
    ];
    const [historyEntry, laneConfig] = await Promise.all([
      History.findOne({
        jobId: data.jobId,
        candidateId: data.candidateId,
      })
        .populate(populateFields)
        .lean(),
      JobLaneConfig.findOne({ jobId: data.jobId }).lean().exec(),
    ]);

    if (!historyEntry) {
      return NextResponse.json(
        { error: "No Assignment History Found" },
        { status: 404 }
      );
    }

    // Filter checklist responses in history based on user role visibility
    const filteredHistory = historyEntry.history.map((entry: any) => {
      if (!entry.checklistForm) {
        return entry;
      }

      // Find the checklist configuration to get field visibility settings
      let checklistFields: any[] = [];
      if (laneConfig) {
        const targetLane = laneConfig.laneConfigs.find(
          (lc: any) => lc.laneId === entry.checklistForm.laneId
        );
        if (targetLane) {
          const checklist =
            entry.checklistForm.checklistType === "incoming"
              ? targetLane.incomingChecklist
              : targetLane.outgoingChecklist;

          if (checklist && checklist.fields) {
            checklistFields = checklist.fields;
          }
        }
      }

      // Filter the responses based on user role and field visibility
      const filteredResponses = filterChecklistResponses(
        entry.checklistForm.responses,
        checklistFields,
        userData.role as UserRole
      );

      return {
        ...entry,
        checklistForm: {
          ...entry.checklistForm,
          responses: filteredResponses,
        },
      };
    });

    return NextResponse.json(filteredHistory);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const [userData, data] = await Promise.all([
      getAuthenticatedUser(request),
      request.json(),
      connectToDatabase(),
    ]);
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id, description, isPrivate, rating } = data;
    const user = userData;

    if (!History) {
      throw new Error("Database not connected");
    }

    // Detect type by checking DB, not by UUID format
    const remarkExists = await History.findOne({
      "history.remark.id": id,
    });

    const isRemark = !!remarkExists;

    const filter: any = {};
    const updateFields: any = {};

    if (isRemark) {
      // 🔹 Update remark
      filter["history.remark.id"] = id;
      if (user.role === "interviewer") {
        filter["history.assignmentBy"] = new mongoose.Types.ObjectId(user.id);
      }

      updateFields["history.$.remark.description"] = description;
      updateFields["history.$.remark.isPrivate"] = isPrivate;
      updateFields["history.$.remark.rating"] = rating;
      updateFields["history.$.remark.updatedAt"] = new Date();
      updateFields["history.$.assignmentBy"] = new mongoose.Types.ObjectId(
        user.id
      );
      updateFields["history.$.remark.userId"] = new mongoose.Types.ObjectId(
        user.id
      );
      // updateFields["history.$.title"] = "Remark Updated";
    } else {
      // 🔹 Update note
      filter["history._id"] = new mongoose.Types.ObjectId(id);
      if (user.role === "interviewer") {
        filter["history._id"] = new mongoose.Types.ObjectId(id);
      }

      updateFields["history.$.note.description"] = description;
      updateFields["history.$.note.rating"] = rating;
      updateFields["history.$.assignmentBy"] = new mongoose.Types.ObjectId(
        user.id
      );
    }

    console.log(updateFields, "updateFields");

    console.log(filter, "filter");

    // 🔹 Update doc
    const updatedHistory = await History.findOneAndUpdate(
      filter,
      { $set: updateFields },
      { new: true }
    );

    if (!updatedHistory) {
      return NextResponse.json(
        { error: `${isRemark ? "Remark" : "Note"} not found or unauthorized` },
        { status: 404 }
      );
    }
    console.log(updatedHistory, "updatedHistory");

    // 🔹 Populate refs
    const populatedHistory = await updatedHistory.populate([
      { path: "history.assignmentBy", select: "_id name email" },
      { path: "history.currentInterviewer", select: "_id name email" },
      { path: "history.previousInterviewer", select: "_id name email" },
      { path: "history.note.userId", select: "_id name email" },
    ]);
    console.log(populatedHistory, "populatedHistory");

    // 🔹 Extract updated item
    const updatedItem = populatedHistory.history.find((item) =>
      isRemark
        ? item.remark && item.remark.id === id
        : item.note && item?._id.toString() === id
    );
    console.log(updatedItem, "updatedItem");

    if (!updatedItem) {
      return NextResponse.json(
        {
          error: `${isRemark ? "Remark" : "Note"} not found in updated document`,
        },
        { status: 404 }
      );
    }
    const candidateData = await Candidate?.findById(updatedHistory.candidateId)
      .populate([
        {
          path: "assignment.interviewerId",
          select: "_id name email",
        },
        {
          path: "remarks.userId",
          select: "name email",
        },
        {
          path: "jobId",
          select: "title description",
        },
      ])
      .lean();

    broadcastCandidateUpdate({
      ...candidateData,
      history: populatedHistory?.history || [],
    } as ICandidate & { history?: ICandidateHistory[] });

    return NextResponse.json(
      {
        message: `Successfully updated the ${isRemark ? "remark" : "note"}`,
        data: updatedItem,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating remark/note:", error);
    return NextResponse.json(
      { error: "Failed to update remark/note" },
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
    const [userData] = await Promise.all([
      getAuthenticatedUser(request),
      connectToDatabase(),
    ]);
    let data = await request.json();
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // data = { ...data, id: uuidv4() };
    if (data?.newEntry?.remark?.description) {
      // console.log("⏹️⏹️⏹️⏹️ ", data);
      data = {
        ...data,
        newEntry: {
          ...data.newEntry,
          dateTime: new Date().toISOString(),
          // dateTime: data.dateTime,
          remark: {
            ...data.newEntry.remark,
            id: uuidv4(),
          },
        },
      };
      // console.log("⏭️⏭️⏭️⏭️ ", data);
    }

    const fileStorage = userData.fileStorage || "local";
    const organizationId = userData.organizationId;
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
    if (data.newEntry.note && !data.newEntry.note.userId) {
      data.newEntry.note.userId = userData.id;
    }

    if (!Candidate) {
      throw new Error("Database not connceted");
    }

    const candidateId = new Types.ObjectId(data.candidateId);
    const jobId = new Types.ObjectId(
      typeof data.jobId === "object" && "_id" in data.jobId
        ? data.jobId._id
        : data.jobId || ""
    );

    const populateHistoryFields = [
      { path: "history.currentInterviewer", select: "_id name email" },
      { path: "history.previousInterviewer", select: "_id name email" },
      { path: "history.assignmentBy", select: "_id name email" },
      { path: "history.note.userId", select: "_id name email" },
    ];
    const populateCandidateFields = [
      { path: "assignment.interviewerId", select: "_id name email" },
      { path: "remarks.userId", select: "name email" },
      { path: "jobId", select: "title description" },
      { path: "followUp.userId", select: "name _id email" },
    ];
    const [candidateData, historyEntry] = await Promise.all([
      Candidate.findById(candidateId).populate(populateCandidateFields).lean(),
      History?.findOneAndUpdate(
        { jobId: data.jobId, candidateId: data.candidateId },
        { $push: { history: data.newEntry } },
        { upsert: true, new: true, runValidators: true }
      )
        .populate(populateHistoryFields)
        .lean(),
    ]);
 
    if (!historyEntry) {
      return NextResponse.json(
        { error: "No Assignment History Found" },
        { status: 404 }
      );
    }
    if (!candidateData?.name) {
      return NextResponse.json(
        { error: "Candidate data is incomplete" },
        { status: 400 }
      );
    }

    // Notify users based on isPrivate status
    if (data.newEntry?.remark?.description) {
      const selectedMentionUserIds =
        data.newEntry.remark.selectedMentionUserIds || [];

      await NotificationService.notifyRemarkAdded({
        organizationId: organizationId,
        candidateId: data.candidateId,
        candidateName: candidateData.name,
        jobId:
          typeof data.jobId === "string" && data.jobId !== ""
            ? data.jobId
            : data.jobId._id || null,
        jobTitle: data.jobId?.title || "Unknown Job",
        remarkText: data.newEntry.remark.description,
        triggerUserId: userData.id,
        triggerUserName: userData.name || "Unknown User",
        roles: ["admin", "hr"],
        validMentionUserIds: selectedMentionUserIds,
      });

      // ⭐ INSERTED EMAIL NOTIFICATION BLOCK HERE ⭐
      try {
        const organizationId = userData.organizationId;
        const users = await User.find({
          organizationId: organizationId,
          role: { $in: ["hr", "admin"] },
          $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
        }).select("email");
        const remarkDate = (await getFormattedDate(
          request,
          data.newEntry.remark.date,
          false,
          userData.organizationId
        )) as string;
        const remark = data.newEntry.remark.description || "";
        const remark_for = candidateData?.name || "";
        const remark_adder = userData.name;
        const rating = data.newEntry?.remark?.rating || null;
        const candidateProfileLink = `${process.env.NEXT_PUBLIC_APP_URL}/candidate/${data.candidateId}`;
        const organizationName = userData.organizationInfo?.name || "HireTrack";
        const emailList = users.map((user) => user.email);
        await sendRemarkNotificationWithMentions(
          organizationId,
          remark,
          {
            triggererUserId: userData.id.toString(),
            triggererEmail: userData.email,
            triggererName: userData.name,
            jobId: data?.jobId?._id?.toString?.() || data?.jobId?.toString(),
            candidateId: data.candidateId.toString(),
            candidateName: remark_for,
            jobTitle: data?.jobId?.title || "Unknown Position",
            reviewerName: remark_adder,
            remarkDate,
            rating,
            candidateProfileLink,
            organizationName,
            recipientName: emailList[0] || "",
          },
          emailList as string[]
        );
      } catch (err) {
        console.error("Email remark notification failed:", err);
      }
    }

    const transformedHistory = (historyEntry.history || []).map(
      (historyItem: any) => {
        if (historyItem.checklistForm?.responses) {
          return {
            ...historyItem,
            checklistForm: {
              ...historyItem.checklistForm,
              responses: new Map(
                Object.entries(historyItem.checklistForm.responses)
              ),
            },
          };
        }
        return historyItem;
      }
    );

    broadcastCandidateUpdate({
      ...candidateData,
      history: transformedHistory,
    } as ICandidate & { history?: ICandidateHistory[] });

    return NextResponse.json(transformedHistory);
    // return NextResponse.json({});
  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
      console.error(error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
}
