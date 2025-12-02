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
import { verifyAndDecryptToken } from "@/app/actions/auth";
import { v4 as uuidv4 } from "uuid";
import { auth } from "@/lib/auth";
import mongoose, { Types } from "mongoose";
import { broadcastCandidateUpdate } from "@/lib/broadcast/broadCastCandidate";
import { ICandidate } from "@/lib/models/candidate";
import { ICandidateHistory } from "@/lib/models/history";
import {
  filterChecklistResponses,
  getUserRole,
} from "@/lib/utils/checklistVisibility";
import { verifyAndDecryptJWTToken } from "@/lib/auth";
import { NotificationService } from "@/lib/notifications/notificationService";
import { sendRemarkNotificationWithMentions } from "@/lib/unifiedEmailService";
import { getFormattedDate } from "@/components/timezoneFormat/getFormattedTZ";

export async function POST(request: NextRequest) {
  //Getting the history data
  try {
    // Get and verify user authentication
    const token = request.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Get org ID from cookies
    const orgId = request.cookies.get("org_id")?.value;
    const decryptedResponse = await verifyAndDecryptJWTToken(token, orgId);
    if (!decryptedResponse.success || !decryptedResponse.user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const decoded = decryptedResponse.user;
    const userRole = getUserRole(decoded.role);
    if (!userRole) {
      return NextResponse.json({ error: "Invalid user role" }, { status: 403 });
    }

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

    // Get job lane configuration to filter checklist responses based on user role
    const laneConfig = await JobLaneConfig.findOne({ jobId: data.jobId });

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
        userRole
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

// export async function PATCH(request: NextRequest) {
//   //✅ UPDATES REMARK ONLY
//   try {
//     await connectToDatabase();

//     const data = await request.json();
//     const { id, description, isPrivate, rating } = data;
//     const { user } = (await auth(request)) || {};
//     // console.log("USERDATA: ", user);

//     // Validate input
//     if (
//       !id ||
//       typeof isPrivate !== "boolean" ||
//       typeof description !== "string"
//     ) {
//       return NextResponse.json(
//         { error: "Invalid input: id, isPrivate, and description are required" },
//         { status: 400 }
//       );
//     }

//     if (!History) {
//       throw new Error("Database not connected");
//     }

//     // if (
//     //   !user ||
//     //   user?.role !== "admin" ||
//     //   user?.role !== "hr" ||
//     //   user?.role !== "interviewer"
//     // ) {
//     //   return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
//     // }

//     // // Update the remark in the history array
//     // const updatedHistory = await History.findOneAndUpdate(
//     //   {
//     //     "history.remark.id": id,
//     //     // "user.role": { $in: ["admin", "hr", "interviewer"] },
//     //     // $or: [
//     //     //   { "user.role": { $in: ["admin", "hr"] } },
//     //     //   { "history.assignmentBy": new mongoose.Types.ObjectId(user.id) },
//     //     // ],
//     //   },
//     //   {
//     //     $set: {
//     //       "history.$.remark.description": description,
//     //       "history.$.remark.isPrivate": isPrivate,
//     //       "history.$.remark.rating": rating,
//     //       "history.$.remark.updatedAt": new Date(),
//     //       // "history.$.remark.updatedAt": await getFormattedDate(
//     //       //   request,
//     //       //   new Date()
//     //       // ),

//     //       "history.$.assignmentBy": new mongoose.Types.ObjectId(user.id),
//     //       "history.$.title": "Remark Updated",
//     //     },
//     //   },
//     //   { new: true }
//     // );
//     // console.log("id: ", id);
//     // console.log("user: ", user.id, user.name, user.role);
//     // console.log("-=-=-== ", updatedHistory);

//     if (!user || !["admin", "hr", "interviewer"].includes(user.role)) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     // Build query filter
//     const filter: any = {
//       "history.remark.id": id,
//     };

//     // Restrict interviewers to their own remarks
//     if (user.role === "interviewer") {
//       filter["history.assignmentBy"] = new mongoose.Types.ObjectId(user.id);
//     }

//     // Update the remark in the history array
//     const updatedHistory = await History.findOneAndUpdate(
//       filter,
//       {
//         $set: {
//           "history.$.remark.description": description,
//           "history.$.remark.isPrivate": isPrivate,
//           "history.$.remark.rating": rating,
//           "history.$.remark.updatedAt": new Date(),
//           "history.$.assignmentBy": new mongoose.Types.ObjectId(user.id),
//           "history.$.title": "Remark Updated",
//         },
//       },
//       { new: true }
//     );
//     const pupulatedHistory = await updatedHistory?.populate([
//       { path: "history.assignmentBy", select: "_id name email" },
//       { path: "history.currentInterviewer", select: "_id name email" },
//       { path: "history.previousInterviewer", select: "_id name email" },
//       { path: "history.note.userId", select: "_id name email" },
//     ]);
//     if (!updatedHistory) {
//       return NextResponse.json(
//         { error: "Remark not found or unauthorized" },
//         { status: 404 }
//       );
//     }

//     // console.log("🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢 ", updatedHistory);
//     const updatedItem = pupulatedHistory?.history?.find(
//       (item) => item.remark && item.remark.id === id
//     );

//     if (!updatedItem) {
//       return NextResponse.json(
//         { error: "Remark not found in updated document" },
//         { status: 404 }
//       );
//     }
//     const candidateData = await Candidate?.findById(updatedHistory.candidateId)
//       .populate([
//         {
//           path: "assignment.interviewerId",
//           select: "_id name email",
//         },
//         {
//           path: "remarks.userId",
//           select: "name email",
//         },
//         {
//           path: "jobId",
//           select: "title description ",
//         },
//       ])
//       .lean();
//     broadcastCandidateUpdate({
//       ...candidateData,
//       history: pupulatedHistory?.history || [],
//     } as ICandidate & { history?: ICandidateHistory[] });
//     return NextResponse.json(
//       {
//         message: "Successfully updated the remark",
//         data: updatedItem,
//       },
//       { status: 200 }
//     );
//   } catch (error) {
//     console.error("Error updating remark:", error);
//     return NextResponse.json(
//       { error: "Failed to update remark" },
//       { status: 500 }
//     );
//   }
// }
export async function PATCH(request: NextRequest) {
  try {
    await connectToDatabase();

    const data = await request.json();
    const { id, description, isPrivate, rating } = data;
    const { user } = (await auth(request)) || {};

    if (!id || typeof description !== "string") {
      return NextResponse.json(
        { error: "Invalid input: id and description are required" },
        { status: 400 }
      );
    }

    if (!user || !["admin", "hr", "interviewer"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    await connectToDatabase();
    let data = await request.json();
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
    let fileStorage = "local";
    let organizationId;
    let userData;

    const token = request.cookies.get("auth_token");
    const orgId = request.cookies.get("org_id")?.value;
    if (token?.value) {
      const decryptedResponse = await verifyAndDecryptToken(
        String(token?.value),
        orgId
      );
      userData = decryptedResponse.user;
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
    if (data.newEntry.note && !data.newEntry.note.userId) {
      data.newEntry.note.userId = userData.id;
    }

    if (!Candidate) {
      throw new Error("Database not connceted");
    }

    const candidateId = new Types.ObjectId(data.candidateId);
    const candidateData = await Candidate.findById(candidateId)
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
          select: "title description ",
        },
        {
          path: "followUp.userId",
          select: "name _id email",
        },
      ])
      .lean();
    // const candidateDataJSON = candidateData?.toObject();

    const historyEntry = await History?.findOneAndUpdate(
      { jobId: data.jobId, candidateId: data.candidateId },
      { $push: { history: data.newEntry } },
      { upsert: true, new: true, runValidators: true }
    );

    // console.log("🎊🎊🎊 DATA>JOBID: ", data.jobId);
    const jobId = new Types.ObjectId(
      typeof data.jobId === "object" && "_id" in data.jobId
        ? data.jobId._id
        : data.jobId || ""
    );
    const historyData = await History.findOne({
      candidateId: candidateId,
      jobId: jobId,
    })
      .populate("history.currentInterviewer", "_id name email")
      .populate("history.previousInterviewer", "_id name email")
      .populate("history.assignmentBy", "_id name email")
      .populate("history.note.userId", "_id name email")
      .lean();
    // console.log("$⌛⌛⌛⌛⌛ CANDIDATEDATA: ", historyData);
    // const hisotryJSON = historyData?.toObject();
    if (!historyEntry || !historyData) {
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

    const transformedHistory = (historyData.history || []).map(
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
