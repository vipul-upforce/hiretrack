import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { Settings, User } from "@/lib/mongodb";
import { Candidate } from "@/lib/mongodb";
import { handleCustomFieldFiles, handleFileAttachments } from "@/lib/fileUtils";
import { handleSingleFile } from "@/lib/fileUtils";
import { History } from "@/lib/mongodb";
import { ICandidate as IExternalCandidate } from "@/lib/models/candidate";
import mongoose, { ProjectionType } from "mongoose";
import { getAuthenticatedUser } from "@/app/actions/auth";
import { sendMail } from "../../event-mail";
import { Attachment } from "../route";
import { IinfoUpdateLog } from "@/lib/models/history";
import { broadcastCandidateUpdate } from "@/lib/broadcast/broadCastCandidate";
import { getMappedEmailTemplate } from "@/app/actions/getMappedEmailTemplate";
import { ITag } from "@/lib/models/organization";
import { NotificationService } from "@/lib/notifications/notificationService";
import { getFormattedDate } from "@/components/timezoneFormat/getFormattedTZ";
import { sendEventEmailWithHistory } from "@/lib/unifiedEmailService";

interface UpdateObject {
  $set: Record<string, unknown>;
  $currentDate: { "tracking.updatedAt": boolean };
  $unset?: Record<string, number>;
}

interface IFJob {
  _id: string | mongoose.Types.ObjectId;
  title: string;
  description: string;
}

type ICandidate = IExternalCandidate & {
  _id?: string | mongoose.Types.ObjectId;
  jobId?: IFJob | mongoose.Types.ObjectId | null;
  [key: string]: unknown;
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let fileStorage = "local";
  let organizationId;

  const updates: IinfoUpdateLog[] = [];

  const fieldsToTrack = [
    "name",
    "email",
    "contact",
    "location",
    "experience",
    "relevantExperience",
    "currentCTC",
    "expectedCTC",
    "atttachments",
    "noticePeriod",
    "customFields",
    "resume",
    "status",
    "tags",
  ];

  try {
    // Connect to database, parse request, and resolve params in parallel
    const [data, { id }, userData] = await Promise.all([
      request.json(),
      params,
      getAuthenticatedUser(request),
      connectToDatabase(),
    ]);

    if(!userData) {
      return NextResponse.json(
        { message: "Unauthorised Access" },
        { status: 401 }
      );
    }
    fileStorage = userData.fileStorage || "local";
    organizationId = userData.organizationId || "";
    // Validate candidate ID
    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Invalid candidate ID" },
        { status: 400 }
      );
    }

    const existingCandidate: ICandidate | null = (await Candidate!
      .findById(id)
      .populate({
        path: "jobId",
        select: "_id title", // Only fetch necessary fields
      })
      .lean()) as ICandidate | null;
    if (!existingCandidate) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }

    if (data.resume) {
      data.resume = await handleSingleFile(
        data.resume,
        fileStorage,
        organizationId
      );
      if (
        JSON.stringify(existingCandidate.resume) !== JSON.stringify(data.resume)
      ) {
        updates.push({
          title: "Updated Resume",
          previousValue: existingCandidate.resume,
          currentValue: data.resume,
          attachments: [data.resume],
        });
      }
    }

    if (data.tags) {
      if (
        JSON.stringify(existingCandidate.tags) !== JSON.stringify(data.tags)
      ) {
        const existingCandidateTagsStr = existingCandidate.tags
          ?.map((tag) => tag.title)
          .join(", ");
        const dataTagsStr = data.tags?.map((tag: ITag) => tag.title).join(", ");
        updates.push({
          title: "Updated Tags",
          previousValue: existingCandidateTagsStr,
          currentValue: dataTagsStr,
        });
      }
    }

    if (data.attachments) {
      const images = data.attachments.filter((attachment: Attachment) =>
        attachment.type.startsWith("image")
      );
      const files = data.attachments.filter(
        (attachment: Attachment) => !attachment.type.startsWith("image")
      );

      data.attachments = {
        images: images || [],
        files: files || [],
      };
      const { files: f, images: i } = await handleFileAttachments(
        data.attachments,
        fileStorage,
        organizationId
      );
      data.attachments = [...f, ...i];
      if (
        JSON.stringify(existingCandidate.attachments) !==
        JSON.stringify(data.attachments)
      ) {
        updates.push({
          title: "Updated Attachments",
          previousValue: existingCandidate.attachments,
          currentValue: data.attachments,
          attachments: data.attachments.filter(
            (file: Attachment) =>
              !existingCandidate.attachments.some(
                (existingFile: Attachment) => existingFile.url === file.url
              )
          ),
        });
      }
    }

    // if (data.customFields) {
    //   const cs = await handleCustomFieldFiles(
    //     data.customFields,
    //     fileStorage,
    //     organizationId
    //   );
    //   data.customFields = cs;
    //   if (
    //     JSON.stringify(existingCandidate.customFields) !==
    //     JSON.stringify(data.customFields)
    //   ) {
    //     const allKeys = Object.keys({
    //       ...existingCandidate.customFields,
    //       ...data.customFields,
    //     });

    //     allKeys.forEach((key) => {
    //       const prev = existingCandidate.customFields[key];
    //       const curr = data.customFields[key];
    //       const csAttachments =
    //         Array(data.customFields) &&
    //         data.customFields.length > 0 &&
    //         "base64" in data.customFields[0]
    //           ? data.customFields[key]
    //           : null;
    //       if (prev !== curr) {
    //         updates.push({
    //           title: `Updated ${key}`,
    //           previousValue: prev || "~",
    //           currentValue: curr || "~",
    //           attachments: csAttachments,
    //         });
    //       }
    //     });
    //   }
    // }
    if (data.customFields) {
      // Process uploaded custom field files
      const cs = await handleCustomFieldFiles(
        data.customFields,
        fileStorage,
        organizationId
      );
      data.customFields = cs;

      // Check for changes
      if (
        JSON.stringify(existingCandidate.customFields) !==
        JSON.stringify(data.customFields)
      ) {
        const allKeys = Object.keys({
          ...existingCandidate.customFields,
          ...data.customFields,
        });

        allKeys.forEach((key) => {
          const prev = existingCandidate.customFields?.[key];
          const curr = data.customFields?.[key];
          if (
            (prev === "" ||
              prev === null ||
              prev === undefined ||
              !((prev as string[]).length > 0)) &&
            (curr === "" ||
              curr === null ||
              curr === undefined ||
              !((curr as string[]).length > 0))
          ) {
            return;
          }
          let attachments = undefined;

          if (typeof curr === "object" && curr !== null) {
            if ("base64" in curr) {
              attachments = [curr];
            } else if (
              Array.isArray(curr) &&
              curr.some((v) => v && typeof v === "object" && "base64" in v)
            ) {
              attachments = curr.filter(
                (v) => v && typeof v === "object" && "base64" in v
              );
            }
          }

          if (JSON.stringify(prev) !== JSON.stringify(curr)) {
            updates.push({
              title: `Updated ${key}`,
              previousValue: prev || "",
              currentValue: curr || "",
              attachments,
            });
          }
        });
      }
    }

    const updateObj: UpdateObject = {
      $set: {},
      $currentDate: { "tracking.updatedAt": true },
    };

    // if ("assignment" in data) {
    //   if (data.assignment === null) {
    //     updateObj.$unset = { assignment: 1 };
    //   } else {
    //     // // const tzFormattedTime = await getFormattedDate(
    //     // //   request,
    //     // //   new Date(data.assignment.time)
    //     // // );
    //     // // const tzFormattedAssignedAt = await getFormattedDate(
    //     // //   request,
    //     // //   new Date(data.assignment.assignedAt)
    //     // // );

    //     // // console.log("~~~~~~~~~ ", tzFormattedAssignedAt, tzFormattedTime);
    //     // const updateAssignment = {
    //     //   ...data.assignment,
    //     //   // "assignment.time": tzFormattedTime,
    //     //   // "assignment.assignedAt": tzFormattedAssignedAt,
    //     // };
    //     updateObj.$set.assignment = data.assignment;
    //   }
    // }

    let assignmentCompletedFollowUp = null;

    if ("assignment" in data) {
      if (data.assignment === null) {
        updateObj.$unset = { assignment: 1 };

        // Add follow-up entry to highlight assignment complete
        assignmentCompletedFollowUp = {
          note: `${userData?.name || "Unknown User"} has completed the last step.`,
          date: null, // No specific follow-up date needed for completion note
          userId: userData?.id,
        };
      } else {
        // // const tzFormattedTime = await getFormattedDate(
        // //   request,
        // //   new Date(data.assignment.time)
        // // );
        // // const tzFormattedAssignedAt = await getFormattedDate(
        // //   request,
        // //   new Date(data.assignment.assignedAt)
        // // );

        // // console.log("~~~~~~~~~ ", tzFormattedAssignedAt, tzFormattedTime);
        // const updateAssignment = {
        //   ...data.assignment,
        //   // "assignment.time": tzFormattedTime,
        //   // "assignment.assignedAt": tzFormattedAssignedAt,
        // };
        updateObj.$set.assignment = data.assignment;
      }
    }
    const whatWasUpdated: string[] = [];
    if ("attachments" in data) {
      if (data.attachment === null) {
        updateObj.$unset = { attachments: 1 };
      } else {
        if (
          JSON.stringify(existingCandidate.attachments) !==
          JSON.stringify(data.attachments)
        ) {
          whatWasUpdated.push("attachments");
        }
        updateObj.$set.attachments = data.attachments;
      }
    }
    if ("resume" in data) {
      if (data.resume === null) {
        updateObj.$unset = { resume: 1 };
      } else {
        updateObj.$set.resume = data.resume;
      }
    }
    if ("customFields" in data) {
      if (data.customFields === null) {
        updateObj.$unset = { customFields: 1 };
      } else {
        updateObj.$set.customFields = data.customFields;
      }
    }

    if ("skills" in data) {
      updateObj.$set.skills = data.skills;
    }
    if ("scores" in data) {
      updateObj.$set.scores = data.scores;
    }
    if ("tags" in data) {
      updateObj.$set.tags = data.tags;
    }
    if ("followUp" in data) {
      console.log(
        "☀️☀️☀️☀️☀️☀️☀️☀️☀️☀️☀️☀️☀️☀️☀️☀️ FOllow Up in here",
        data.followUp
      );
      updateObj.$set.followUp = data.followUp;
    }
    // if ("followUp" in data) {
    //   // Handle new regular notes added with incorrect \n separator
    //   if (data.followUp?.note && data.followUp.note.includes("\n")) {
    //     const notes = data.followUp.note
    //       .split("|||||")
    //       .flatMap((note) => note.split("\n"))
    //       .filter((note) => note);
    //     data.followUp.note = notes.join("|||||");
    //     updateObj.$set.followUp = data.followUp;
    //   } else {
    //     updateObj.$set.followUp = data.followUp;
    //   }
    // }
    // // Handle assignment completion follow-up
    // if (assignmentCompletedFollowUp) {
    //   // Merge with existing followUp if provided, or set new
    //   if ("followUp" in data && data.followUp) {
    //     // Append the completion note to existing followUp note if it exists
    //     data.followUp.note = data.followUp.note
    //       ? `${data.followUp.note}|||||\n${assignmentCompletedFollowUp.note}`
    //       : assignmentCompletedFollowUp.note;
    //     data.followUp.userId =
    //       assignmentCompletedFollowUp.userId || data.followUp.userId;
    //     updateObj.$set.followUp = data.followUp;
    //   } else {
    //     updateObj.$set.followUp = assignmentCompletedFollowUp;
    //   }
    // }

    // if (assignmentCompletedFollowUp) {
    //   const completionNote = `${userData?.name || "Unknown User"} has completed the last step.`;

    //   if ("followUp" in data && data.followUp && data.followUp.note) {
    //     // Split on ||||| and trim each note
    //     let noteArr = data.followUp.note
    //       .split("|||||")
    //       .map((n) => n.trim())
    //       .filter(Boolean);

    //     console.log(noteArr, "split notes");

    //     // 🛠 Look for an existing completion note (from ANY user)
    //     const completionIndex = noteArr.findIndex((n) =>
    //       n.endsWith("has completed the last step.")
    //     );

    //     if (completionIndex !== -1) {
    //       // 🔄 Replace existing completion note
    //       noteArr[completionIndex] = completionNote;
    //     } else {
    //       // ➕ Add new completion note at the end
    //       noteArr.push(completionNote);
    //     }

    //     // Always join with ||||| + newline
    //     data.followUp.note = noteArr.join("|||||\n");

    //     // Ensure userId is updated
    //     data.followUp.userId =
    //       assignmentCompletedFollowUp.userId || data.followUp.userId;

    //     updateObj.$set.followUp = data.followUp;

    //     console.log(data.followUp.note, "updated follow-up note");
    //   } else {
    //     // No existing followUp → set new, wrapped properly
    //     updateObj.$set.followUp = {
    //       note: `${completionNote}`,
    //       date: null,
    //       userId: assignmentCompletedFollowUp.userId,
    //     };
    //   }
    // }
    if (assignmentCompletedFollowUp) {
      const completionNote = `${userData?.name || "Unknown User"} has completed the last step.`;

      if ("followUp" in data && data.followUp && data.followUp.note) {
        // Split on ||||| and trim each note
        let noteArr = data.followUp.note
          .split("|||||")
          .map((n) => n.trim())
          .filter(Boolean);

        console.log(noteArr, "split notes");

        // 🛠 Look for an existing completion note (from ANY user)
        const completionIndex = noteArr.findIndex((n) =>
          n.endsWith("has completed the last step.")
        );
        console.log(completionIndex, "completionIndex");

        if (completionIndex !== -1) {
          // 🗑 Remove existing completion note
          noteArr.splice(completionIndex, 1);
        }
        console.log(noteArr, "noteArr after remove acisting");

        // ➕ Always add new completion note at the end
        noteArr.push(completionNote);

        // Always join with ||||| + newline
        data.followUp.note = noteArr.join("|||||\n");

        // Ensure userId is updated
        data.followUp.userId =
          assignmentCompletedFollowUp.userId || data.followUp.userId;

        updateObj.$set.followUp = data.followUp;

        console.log(data.followUp.note, "updated follow-up note");
      } else {
        // No existing followUp → set new, wrapped properly
        updateObj.$set.followUp = {
          note: `${completionNote}`,
          date: null,
          userId: assignmentCompletedFollowUp.userId,
        };
      }
    }
    // const whatWasUpdated: string[] = [];
    // if ("attachments" in data) {
    //   if (data.attachment === null) {
    //     updateObj.$unset = { attachments: 1 };
    //   } else {
    //     if (
    //       JSON.stringify(existingCandidate.attachments) !==
    //       JSON.stringify(data.attachments)
    //     ) {
    //       whatWasUpdated.push("attachments");
    //     }
    //     updateObj.$set.attachments = data.attachments;
    //   }
    // }
    // if ("resume" in data) {
    //   if (data.resume === null) {
    //     updateObj.$unset = { resume: 1 };
    //   } else {
    //     updateObj.$set.resume = data.resume;
    //   }
    // }
    // if ("customFields" in data) {
    //   if (data.customFields === null) {
    //     updateObj.$unset = { customFields: 1 };
    //   } else {
    //     updateObj.$set.customFields = data.customFields;
    //   }
    // }

    // if ("skills" in data) {
    //   updateObj.$set.skills = data.skills;
    // }
    // if ("scores" in data) {
    //   updateObj.$set.scores = data.scores;
    // }

    if (
      "remarks" in data &&
      Array.isArray(data.remarks) &&
      data.remarks.length > 0
    ) {
      const existingRemarks = existingCandidate.remarks || [];
      if (JSON.stringify(existingRemarks) !== JSON.stringify(data.remarks)) {
        updateObj.$set.remarks = data.remarks;
        if (
          data.remarks.length > existingRemarks.length &&
          organizationId &&
          User
        ) {
          const latestRemark = data.remarks[data.remarks.length - 1];

          if (latestRemark?.description) {
            const users = await User.find({
              organizationId,
              role: { $in: ["hr", "admin"] },
              $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
            }).select("email");

            const organization = await User?.findOne({
              organizationId,
            }).populate({
              path: "organizationId",
              select: "name", // populate only organization name
            });
            // console.log(organization, "remark-organization");

            const emailList = [undefined, ...users.map((user) => user.email)];
            const remark_adder = userData?.name || "user";
            const remark_for = data.name || existingCandidate.name;
            const remark = latestRemark.description.trim();
            const rating = latestRemark.rating || "None";
            const candidateDetails = `${request.headers.get("origin")}/candidate/${data._id}`;
            const remarkDate = (await getFormattedDate(
              request,
              latestRemark.date,
              false,
              organizationId
            )) as string;
            // console.log("⛔⛔⛔ APLPICTION DATE: ", remarkDate);

            const organizationName =
              typeof organization?.organizationId === "object"
                ? organization.organizationId.name
                : "";

            if (emailList.length > 0 && remark !== "") {
              // Use sendRemarkNotificationWithMentions for proper mention detection
              const { sendRemarkNotificationWithMentions } = await import(
                "@/lib/unifiedEmailService"
              );

              await sendRemarkNotificationWithMentions(
                organizationId,
                remark,
                {
                  triggererUserId: userData.id.toString(),
                  triggererEmail: userData.email,
                  triggererName: userData.name,
                  jobId: data?.jobId?._id?.toString(),
                  candidateId: data._id.toString(),
                  candidateName: remark_for,
                  jobTitle: data?.jobId?.title || "Unknown Position", // Assuming jobId has a title field
                  reviewerName: remark_adder,
                  remarkDate: remarkDate,
                  rating: rating,
                  candidateProfileLink: candidateDetails,
                  organizationName: organizationName,
                  recipientName: emailList[0] || "", // Placeholder; see notes for dynamic handling
                },
                emailList as string[]
              );
            }
          }
        }
      }
    }

    // const { emailContent, emailSubject } = await getMappedEmailTemplate(
    //   "new-remark",
    //   {
    //     reviewerName: remark_adder,
    //     candidateName: remark_for,
    //     rating,
    //     jobTitle: data?.jobId?.title,
    //     remarkDate: remarkDate,
    //     remarkText: remark,
    //     candidateProfileLink: candidateDetails,
    //     organizationName: organizationName,
    //     recipientName: emailList[0] || "",
    //   },
    //   organizationId
    // );
    fieldsToTrack.forEach((key) => {
      if (
        key in data &&
        key === "resume" &&
        JSON.stringify(existingCandidate[key]) !== JSON.stringify(data[key])
      ) {
        whatWasUpdated.push(key);
      }
      if (
        key in data &&
        key === "customFields" &&
        JSON.stringify(existingCandidate[key]) !== JSON.stringify(data[key])
      ) {
        const customKeys = Object.keys(data.customFields);
        customKeys.forEach((customKey) => {
          const oldValue = existingCandidate.customFields?.[customKey];
          const newValue = data.customFields[customKey];
          if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
            whatWasUpdated.push(customKey);
          }
        });
      }
      if (
        key in data &&
        key !== "resume" &&
        key !== "customFields" &&
        key !== "tags"
      ) {
        if (
          (key === "currentCTC" || key === "expectedCTC") &&
          userData.role &&
          userData.role === "interviewer"
        ) {
          return;
        }
        if (
          JSON.stringify(existingCandidate[key]) !== JSON.stringify(data[key])
        ) {
          whatWasUpdated.push(key);
          updateObj.$set[key] = data[key];
          updates.push({
            title: `Updated ${key.charAt(0).toUpperCase() + key.slice(1)}`,
            previousValue: existingCandidate[key],
            currentValue: data[key],
          });

          // Check specifically for status update
          if (key === "status") {
            try {
              const jobInfo = existingCandidate.jobId as any;

              // Notify rejection if status is "rejected"
              if (data.status === "rejected") {
                NotificationService.notifyCandidateRejected({
                  organizationId: organizationId,
                  candidateId: existingCandidate._id.toString(),
                  candidateName: existingCandidate.name,
                  jobId:
                    jobInfo?._id?.toString() ||
                    existingCandidate.jobId?.toString() ||
                    "",
                  jobTitle: jobInfo?.title || "Unknown Job",
                  triggerUserId: userData?.id,
                  triggerUserName: userData?.name,
                });
              } else {
                // Notify general status update for non-rejected statuses
                NotificationService.notifyCandidateStatusUpdated({
                  organizationId: organizationId,
                  candidateId: existingCandidate._id.toString(),
                  candidateName: existingCandidate.name,
                  jobId:
                    jobInfo?._id?.toString() ||
                    existingCandidate.jobId?.toString() ||
                    "",
                  jobTitle: jobInfo?.title || "Unknown Job",
                  oldStatus: existingCandidate.status,
                  newStatus: data.status,
                  triggerUserId: userData?.id,
                  triggerUserName: userData?.name,
                });
              }
            } catch (notificationError) {
              console.error(
                "Failed to send candidate status notifications:",
                notificationError
              );
              // Continue execution even if notification fails
            }
          }
        }
      }
    });

    // fieldsToTrack.forEach((key) => {
    //   if (
    //     key in data &&
    //     key == "resume" &&
    //     JSON.stringify(existingCandidate[key]) !== JSON.stringify(data[key])
    //   ) {
    //     whatWasUpdated.push(key);
    //   }
    //   if (
    //     key in data &&
    //     key == "customFields" &&
    //     JSON.stringify(existingCandidate[key]) !== JSON.stringify(data[key])
    //   ) {
    //     // console.log("######### CUSTOM FIELDS: ", data.customFields);
    //     // const customKeys = Object.keys(data.customFields);
    //     // whatWasUpdated.push(...customKeys);
    //     const customKeys = Object.keys(data.customFields);

    //     customKeys.forEach((key) => {
    //       const oldValue = existingCandidate.customFields?.[key];
    //       const newValue = data.customFields[key];
    //       if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
    //         whatWasUpdated.push(key);
    //       }
    //     });
    //   }
    //   if (
    //     key in data &&
    //     key !== "resume" &&
    //     key !== "customFields" &&
    //     key !== "tags"
    //   ) {
    //     if (
    //       (key === "currentCTC" || key === "expectedCTC") &&
    //       userData.role &&
    //       userData.role === "interviewer"
    //     ) {
    //       return;
    //     }
    //     if (
    //       JSON.stringify(existingCandidate[key]) !== JSON.stringify(data[key])
    //     ) {
    //       whatWasUpdated.push(key);
    //       updateObj.$set[key] = data[key];
    //       updates.push({
    //         title: `Updated ${key.charAt(0).toUpperCase() + key.slice(1)}`,
    //         previousValue: existingCandidate[key],
    //         currentValue: data[key],
    //       });
    //     }
    //   }
    // });

    if (!Candidate || !History) {
      return NextResponse.json(
        { error: "Database not connected" },
        { status: 404 }
      );
    }

    // console.log("$$$$$$$ UPDATED OBJ: ", updateObj);

    if (Object.keys(updateObj.$set).length > 0 || updateObj.$unset) {
      const updatedCandidate = (await Candidate.findByIdAndUpdate(
        id,
        updateObj,
        {
          new: true,
          // runValidators: true,
        }
      )
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
            path: "followUp.userId",
            select: "name email",
          },
          {
            path: "jobId",
            select: "_id title description",
          },
        ])
        .lean()
        .exec()) as ICandidate;

      if (!updatedCandidate) {
        return NextResponse.json(
          { error: "Candidate not found" },
          { status: 404 }
        );
      }

      // let candidateHistory = null;

      if (updates.length > 0) {
        // let combined_Description = updates
        //   .map((item) => {
        //     if (item.attachments) return;
        //     const label = item.title?.startsWith("Updated ")
        //       ? item.title.slice("Updated ".length)
        //       : item.title;

        //     return `${label.charAt(0).toUpperCase() + label.slice(1)}: ${JSON.stringify(item.previousValue).replaceAll('"', "")} → ${JSON.stringify(item.currentValue).replaceAll('"', "")}`;
        //   })
        //   .join("\n");
        // let combined_Description = updates
        //   .map((item) => {
        //     if (item.attachments) return;
        //     const label = item.title?.startsWith("Updated ")
        //       ? item.title.slice("Updated ".length)
        //       : item.title;

        //     return `${label.charAt(0).toUpperCase() + label.slice(1)}: ${JSON.stringify(item.previousValue).replaceAll('"', "")} → ${JSON.stringify(item.currentValue).replaceAll('"', "")}`;
        //   })
        //   .join("\n");

        const historyEntry = {
          dateTime: data.dateTime || new Date(),
          title: `Updated ${whatWasUpdated.join(" & ")}`,
          previousInterviewer: null,
          currentInterviewer: null,
          assignmentBy: userData?.id,
          note: {
            description: updates,
          },
          attachments: [...updates]
            .filter((item) => item.attachments)
            .flatMap((item) => item.attachments!),
        };

        // console.log("USERDATA>ID:", userData.id);

        await History?.findOneAndUpdate(
          {
            candidateId: updatedCandidate._id,
            jobId: updatedCandidate.jobId?._id,
          },
          {
            $push: { history: historyEntry },
          },
          { new: true }
        );
      }
      const candidateHistory = await History?.findOne({
        candidateId: updatedCandidate._id,
        jobId: updatedCandidate.jobId?._id,
      });
      const candidateHistoryPopulated = await candidateHistory?.populate([
        { path: "history.assignmentBy", select: "_id name email" },
        { path: "history.currentInterviewer", select: "_id name email" },
        { path: "history.previousInterviewer", select: "_id name email" },
        { path: "history.note.userId", select: "_id name email" },
      ]);

      // Send notifications for various updates
      try {
        const jobInfo = updatedCandidate.jobId as any;

        // Assignment notifications
        // if ("assignment" in data) {
        //   const oldAssignment = existingCandidate.assignment;
        //   const newAssignment = data.assignment;

        //   if (newAssignment && newAssignment.interviewerId) {
        //     // If assignment is new or interviewer changed
        //     if (
        //       !oldAssignment ||
        //       oldAssignment.interviewerId !== newAssignment.interviewerId
        //     ) {
        //       // Get interviewer information
        //       const interviewer = await User?.findById(
        //         newAssignment.interviewerId
        //       ).select("name email");

        //       if (interviewer) {
        //         await NotificationService.notifyCandidateAssigned({
        //           organizationId: organizationId,
        //           candidateId: updatedCandidate._id.toString(),
        //           candidateName: updatedCandidate.name,
        //           jobId:
        //             jobInfo?._id?.toString() ||
        //             updatedCandidate.jobId?.toString() ||
        //             "",
        //           jobTitle: jobInfo?.title || "Unknown Job",
        //           interviewerId: newAssignment.interviewerId,
        //           interviewerName: interviewer.name,
        //           triggerUserId: userData._id,
        //           triggerUserName: userData.name,
        //         });
        //       }

        //       // Meeting scheduled notification if time is provided
        //       if (newAssignment.time) {
        //         await NotificationService.notifyMeetingScheduled({
        //           organizationId: organizationId,
        //           candidateId: updatedCandidate._id.toString(),
        //           candidateName: updatedCandidate.name,
        //           jobId:
        //             jobInfo?._id?.toString() ||
        //             updatedCandidate.jobId?.toString() ||
        //             "",
        //           jobTitle: jobInfo?.title || "Unknown Job",
        //           interviewerId: newAssignment.interviewerId,
        //           interviewerName: interviewer?.name || "Unknown Interviewer",
        //           meetingDate: new Date(newAssignment.time),
        //           triggerUserId: userData._id,
        //           triggerUserName: userData.name,
        //         });
        //       } else if (oldAssignment && !newAssignment) {
        //         // Candidate unassigned
        //         const interviewer = await User?.findById(
        //           oldAssignment.interviewerId
        //         ).select("_id name email");

        //         if (interviewer) {
        //           await NotificationService.notifyCandidateUnassigned({
        //             organizationId: organizationId,
        //             candidateId: updatedCandidate._id.toString(),
        //             candidateName: updatedCandidate.name,
        //             jobId:
        //               jobInfo?._id?.toString() ||
        //               updatedCandidate.jobId?.toString() ||
        //               "",
        //             jobTitle: jobInfo?.title || "Unknown Job",
        //             previousInterviewerId: interviewer._id.toString(), // Fixed: Use _id as string
        //             previousInterviewerName: interviewer.name,
        //             triggerUserId: userData._id,
        //             triggerUserName: userData.name,
        //           });
        //         }
        //       }
        //     }
        //   }
        // }
        // Assignment notifications
        if ("assignment" in data) {
          const oldAssignment = existingCandidate.assignment;
          const newAssignment = data.assignment;

          if (newAssignment) {
            // If assignment is new or interviewer changed
            if (
              !oldAssignment ||
              JSON.stringify(oldAssignment) !== JSON.stringify(newAssignment)
            ) {
              // Get interviewer information
              const interviewer = await User?.findById(
                newAssignment.interviewerId
              ).select("_id name email");

              if (newAssignment && interviewer) {
                if (!newAssignment.time && !oldAssignment) {
                  await NotificationService.notifyCandidateAssigned({
                    organizationId: organizationId,
                    candidateId: updatedCandidate._id.toString(),
                    candidateName: updatedCandidate.name,
                    jobId:
                      jobInfo?._id?.toString() ||
                      updatedCandidate.jobId?.toString() ||
                      "",
                    jobTitle: jobInfo?.title || "Unknown Job",
                    interviewerId: newAssignment.interviewerId,
                    interviewerName: interviewer.name,
                    triggerUserId: userData?.id,
                    triggerUserName: userData?.name,
                  });
                }

                if (newAssignment && newAssignment.time) {
                  if (!oldAssignment || !oldAssignment.time) {
                    await NotificationService.notifyMeetingScheduled({
                      organizationId: organizationId,
                      candidateId: updatedCandidate._id.toString(),
                      candidateName: updatedCandidate.name,
                      jobId:
                        jobInfo?._id?.toString() ||
                        updatedCandidate.jobId?.toString() ||
                        "",
                      jobTitle: jobInfo?.title || "Unknown Job",
                      interviewerId: newAssignment.interviewerId,
                      interviewerName: interviewer.name,
                      meetingDate: new Date(newAssignment.time),
                      triggerUserId: userData?.id,
                      triggerUserName: userData?.name,
                    });
                  } else if (oldAssignment.time !== newAssignment.time) {
                    await NotificationService.notifyMeetingUpdated({
                      organizationId: organizationId,
                      candidateId: updatedCandidate._id.toString(),
                      candidateName: updatedCandidate.name,
                      jobId:
                        jobInfo?._id?.toString() ||
                        updatedCandidate.jobId?.toString() ||
                        "",
                      jobTitle: jobInfo?.title || "Unknown Job",
                      interviewerId: newAssignment.interviewerId,
                      interviewerName: interviewer.name,
                      meetingDate: new Date(newAssignment.time),
                      triggerUserId: userData.id,
                      triggerUserName: userData.name,
                    });
                  }
                }

                // New: Handle case where oldAssignment has time but newAssignment does not
                if (oldAssignment?.time && !newAssignment.time && interviewer) {
                  await NotificationService.notifyMeetingCancelled({
                    organizationId: organizationId,
                    candidateId: updatedCandidate._id.toString(),
                    candidateName: updatedCandidate.name,
                    jobId:
                      jobInfo?._id?.toString() ||
                      updatedCandidate.jobId?.toString() ||
                      "",
                    jobTitle: jobInfo?.title || "Unknown Job",
                    interviewerId: interviewer._id.toString(),
                    interviewerName: interviewer.name,
                    triggerUserId: userData?.id,
                    triggerUserName: userData?.name,
                  });
                }
              }
            }
          } else {
            const interviewer = await User?.findById(
              oldAssignment?.interviewerId
            ).select("_id name email");

            if (newAssignment === null && interviewer) {
              await NotificationService.notifyCandidateUnassigned({
                organizationId: organizationId,
                candidateId: updatedCandidate._id.toString(),
                candidateName: updatedCandidate.name,
                jobId:
                  jobInfo?._id?.toString() ||
                  updatedCandidate.jobId?.toString() ||
                  "",
                jobTitle: jobInfo?.title || "Unknown Job",
                previousInterviewerId: interviewer._id.toString(),
                previousInterviewerName: interviewer.name,
                triggerUserId: userData?.id,
                triggerUserName: userData?.name,
              });
              await NotificationService.notifyInterviewCompleted({
                organizationId: organizationId,
                candidateId: updatedCandidate._id.toString(),
                candidateName: updatedCandidate.name,
                jobId:
                  jobInfo?._id?.toString() ||
                  updatedCandidate.jobId?.toString() ||
                  "",
                jobTitle: jobInfo?.title || "Unknown Job",
                interviewerName: interviewer.name,
                interviewerId: interviewer._id.toString(),
                triggerUserId: userData?.id,
                triggerUserName: userData?.name,
              });
            }
          }
        }

        // Remarks notification
        // if (
        //   "remarks" in data &&
        //   Array.isArray(data.remarks) &&
        //   data.remarks.length > 0
        // ) {
        //   const existingRemarks = existingCandidate.remarks || [];
        //   if (data.remarks.length > existingRemarks.length) {
        //     const latestRemark = data.remarks[data.remarks.length - 1];
        //     if (latestRemark?.description) {
        //       await NotificationService.notifyRemarkAdded({
        //         organizationId: organizationId,
        //         candidateId: updatedCandidate._id.toString(),
        //         candidateName: updatedCandidate.name,
        //         jobId:
        //           jobInfo?._id?.toString() ||
        //           updatedCandidate.jobId?.toString() ||
        //           "",
        //         jobTitle: jobInfo?.title || "Unknown Job",
        //         remarkText: latestRemark.description,
        //         triggerUserId: userData._id,
        //         triggerUserName: userData.name,
        //       });
        //     }
        //   }
        // }

        // // Follow-up notification
        // if ("followUp" in data && data.followUp) {
        //   const oldFollowUp = existingCandidate.followUp;
        //   if (
        //     !oldFollowUp ||
        //     JSON.stringify(oldFollowUp) !== JSON.stringify(data.followUp)
        //   ) {
        //     await NotificationService.notifyFollowUpAdded({
        //       organizationId: organizationId,
        //       candidateId: updatedCandidate._id.toString(),
        //       candidateName: updatedCandidate.name,
        //       jobId:
        //         jobInfo?._id?.toString() ||
        //         updatedCandidate.jobId?.toString() ||
        //         "",
        //       jobTitle: jobInfo?.title || "Unknown Job",
        //       followupNote: data.followUp.note || "",
        //       followupDate: data.followUp.date
        //         ? new Date(data.followUp.date)
        //         : undefined,
        //       triggerUserId: userData._id,
        //       triggerUserName: userData.name,
        //     });
        //   }
        // }
        // if ("followUp" in data && data.followUp) {
        //   const oldFollowUp = existingCandidate.followUp;
        //   console.log("DEBUG: followUp in data", { dataFollowUp: data.followUp, oldFollowUp });

        //   // Check if followUp is being removed (null or "empty" object)
        //   const isFollowUpEmpty =
        //     data.followUp === null ||
        //     (data.followUp &&
        //       data.followUp.note === null);

        //   if (isFollowUpEmpty && oldFollowUp) {
        //     // Follow-up removed
        //     console.log("DEBUG: Triggering notifyFollowupRemoved");
        //     await NotificationService.notifyFollowupRemoved({
        //       organizationId: organizationId,
        //       candidateId: updatedCandidate._id.toString(),
        //       candidateName: updatedCandidate.name,
        //       jobId:
        //         jobInfo?._id?.toString() ||
        //         updatedCandidate.jobId?.toString() ||
        //         "",
        //       jobTitle: jobInfo?.title || "Unknown Job",
        //       triggerUserId: userData._id,
        //       triggerUserName: userData.name,
        //     });
        //   } else if (
        //     data.followUp &&
        //     data.followUp !== null &&
        //     (data.followUp.note !== null) &&
        //     JSON.stringify(oldFollowUp) !== JSON.stringify(data.followUp) &&
        //     !("assignment" in data && data.assignment === null)
        //   ) {
        //     // Follow-up updated or added (but not when unassigning)
        //     console.log("DEBUG: Triggering notifyFollowupUpdated");
        //     await NotificationService.notifyFollowupUpdated({
        //       organizationId: organizationId,
        //       candidateId: updatedCandidate._id.toString(),
        //       candidateName: updatedCandidate.name,
        //       jobId:
        //         jobInfo?._id?.toString() ||
        //         updatedCandidate.jobId?.toString() ||
        //         "",
        //       jobTitle: jobInfo?.title || "Unknown Job",
        //       triggerUserId: userData._id,
        //       triggerUserName: userData.name,
        //     });

        //     if (!oldFollowUp) {
        //       // New follow-up added
        //       console.log("DEBUG: Triggering notifyFollowUpAdded");
        //       await NotificationService.notifyFollowUpAdded({
        //         organizationId: organizationId,
        //         candidateId: updatedCandidate._id.toString(),
        //         candidateName: updatedCandidate.name,
        //         jobId:
        //           jobInfo?._id?.toString() ||
        //           updatedCandidate.jobId?.toString() ||
        //           "",
        //         jobTitle: jobInfo?.title || "Unknown Job",
        //         followupNote: data.followUp.note || "",
        //         followupDate: data.followUp.date
        //           ? new Date(data.followUp.date)
        //           : undefined,
        //         triggerUserId: userData._id,
        //         triggerUserName: userData.name,
        //       });
        //     }
        //   }
        // }

        // Add follow-up notification logic before the Candidate.findByIdAndUpdate

        const oldFollowUp = existingCandidate.followUp;
        const newFollowUp = data?.followUp;
        console.log(oldFollowUp, "oldFollowUp");
        console.log(newFollowUp, "newFollowUp");

        try {
          const jobInfo = existingCandidate.jobId as any;

          // Follow-up notifications
          if ("followUp" in data) {
            // Case 1: Follow-up Added
            if (!oldFollowUp && newFollowUp && newFollowUp.note !== null) {
              await NotificationService.notifyFollowUpAdded({
                organizationId: organizationId,
                candidateId: existingCandidate._id.toString(),
                candidateName: existingCandidate.name,
                jobId:
                  jobInfo?._id?.toString() ||
                  existingCandidate.jobId?.toString() ||
                  "",
                jobTitle: jobInfo?.title || "Unknown Job",
                followupNote: newFollowUp.note || "",
                followupDate: newFollowUp.date
                  ? new Date(newFollowUp.date)
                  : undefined,
                triggerUserId: userData?.id,
                triggerUserName: userData?.name,
              });
            }
            // Case 2: Follow-up Updated
            else if (
              oldFollowUp &&
              newFollowUp &&
              newFollowUp.note !== null &&
              newFollowUp.note !== oldFollowUp.note &&
              newFollowUp.date !== oldFollowUp.date
            ) {
              await NotificationService.notifyFollowupUpdated({
                organizationId: organizationId,
                candidateId: existingCandidate._id.toString(),
                candidateName: existingCandidate.name,
                jobId:
                  jobInfo?._id?.toString() ||
                  existingCandidate.jobId?.toString() ||
                  "",
                jobTitle: jobInfo?.title || "Unknown Job",
                triggerUserId: userData?.id,
                triggerUserName: userData?.name,
              });
            }
            // Case 3: Follow-up Removed
            else if (
              oldFollowUp &&
              oldFollowUp !== undefined &&
              newFollowUp &&
              newFollowUp.note === null &&
              newFollowUp.date === null
            ) {
              await NotificationService.notifyFollowupRemoved({
                organizationId: organizationId,
                candidateId: existingCandidate._id.toString(),
                candidateName: existingCandidate.name,
                jobId:
                  jobInfo?._id?.toString() ||
                  existingCandidate.jobId?.toString() ||
                  "",
                jobTitle: jobInfo?.title || "Unknown Job",
                triggerUserId: userData?.id,
                triggerUserName: userData?.name,
              });
            }
          }
        } catch (notificationError) {
          console.error(
            "Failed to send follow-up notifications:",
            notificationError
          );
          // Continue execution even if notification fails
        }
        // General candidate details update notification
        // if (updates.length > 0) {
        //   // Only send if there are significant updates (not just tracking fields)
        //   const significantUpdates = updates.filter(
        //     (update) =>
        //       !update.title.includes("Updated tracking") &&
        //       !update.title.includes("Updated _id")
        //   );

        //   if (significantUpdates.length > 0) {
        //     // This could be enhanced to send a general "candidate details updated" notification
        //     // For now, we'll rely on the specific update types above
        //   }
        // }
        if (updates.length > 0) {
          // Only send if there are significant updates (not just tracking fields)
          const significantUpdates = updates.filter(
            (update) =>
              !update.title.includes("Updated tracking") &&
              !update.title.includes("Updated _id") &&
              !update.title.includes("Updated Status")
          );

          if (significantUpdates.length > 0) {
            await NotificationService.notifyCandidateDetailsUpdated({
              organizationId: organizationId,
              candidateId: updatedCandidate._id.toString(),
              candidateName: updatedCandidate.name,
              jobId:
                jobInfo?._id?.toString() ||
                updatedCandidate.jobId?.toString() ||
                "",
              jobTitle: jobInfo?.title || "Unknown Job",
              triggerUserId: userData?.id,
              triggerUserName: userData?.name,
            });
          }
        }
      } catch (notificationError) {
        console.error(
          "Failed to send candidate update notifications:",
          notificationError
        );
        // Don't fail the API call if notification fails
      }

      // console.log("UPDATED SCRE: ", updatedCandidate.scores);
      // console.log(
      //   "🔥🔥🔥🔥 In CandidateUpdate: ",
      //   updatedCandidate.remarks.length
      // );
      broadcastCandidateUpdate({
        ...updatedCandidate,
        history: candidateHistoryPopulated?.history,
      });
      return NextResponse.json({
        ...updatedCandidate,
        history: candidateHistoryPopulated?.history,
      });
    }

    return NextResponse.json(existingCandidate);
  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Connect to database and authenticate in parallel
    const [{ id }, userData] = await Promise.all([
      params,
      getAuthenticatedUser(_request),
      connectToDatabase(),
    ]);

    if (!userData) {
      return NextResponse.json(
        { message: "Unauthorised Access" },
        { status: 401 }
      );
    }

    if (!Candidate || !History) {
      return NextResponse.json(
        { error: "Database models not available" },
        { status: 500 }
      );
    }

    // Validate candidate ID
    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Invalid candidate ID" },
        { status: 400 }
      );
    }

    // Optimize projection based on role
    const projection: ProjectionType<ICandidate> =
      userData?.role === "interviewer"
        ? {
            currentCTC: 0,
            expectedCTC: 0,
          }
        : {};

    // Fetch candidate first to get jobId for history query
    const candidate = await Candidate.findById(id, projection)
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
          path: "followUp.userId",
          select: "name email",
        },
        {
          path: "jobId",
          select: "title description",
        },
      ])
      .lean()
      .exec();

    if (!candidate) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }

    // Extract jobId for history query
    const jobId =
      typeof candidate.jobId === "object" &&
      candidate.jobId !== null &&
      "_id" in candidate.jobId
        ? candidate.jobId._id
        : candidate.jobId;

    // Fetch history in parallel (if candidate has jobId)
    const history = jobId
      ? await History.findOne({
          jobId,
          candidateId: candidate._id.toString(),
        })
          .populate([
            { path: "history.currentInterviewer", select: "_id name email" },
            { path: "history.previousInterviewer", select: "_id name email" },
            { path: "history.assignmentBy", select: "_id name email" },
            { path: "history.note.userId", select: "_id name email" },
          ])
          .lean()
          .exec()
      : null;

    return NextResponse.json({
      ...candidate,
      history: history?.history || [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Execute independent operations in parallel
    const [{ id }, { dateTime }, userData] = await Promise.all([
      params,
      _request.json(),
      getAuthenticatedUser(_request,"admin"),
      connectToDatabase(),
    ]);

    // Validate candidate ID
    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Invalid candidate ID" },
        { status: 400 }
      );
    }

    if (!Candidate || !History) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }

    // Fetch candidate with minimal fields needed for operation
    const candidate = await Candidate.findById(id)
      .select("_id jobId isDeleted")
      .lean()
      .exec();

    if (!candidate) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }

    const historyEntry = {
      dateTime: dateTime,
      title: candidate.isDeleted ? "Unarchived" : "Archived",
      previousInterviewer: null,
      currentInterviewer: null,
      assignmentBy: userData?.id
    };

    // Execute history update and candidate update in parallel
    const [updatedHistory, deletedCandidate] = await Promise.all([
      History.findOneAndUpdate(
        { candidateId: candidate._id, jobId: candidate.jobId },
        {
          $push: { history: historyEntry },
        },
        { new: true }
      )
        .populate([
          { path: "history.currentInterviewer", select: "_id name email" },
          { path: "history.previousInterviewer", select: "_id name email" },
          { path: "history.assignmentBy", select: "_id name email" },
          { path: "history.note.userId", select: "_id name email" },
        ])
        .lean()
        .exec(),
      Candidate.findByIdAndUpdate(
        id,
        { isDeleted: !candidate.isDeleted },
        { new: true }
      )
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
            path: "followUp.userId",
            select: "name email",
          },
          {
            path: "jobId",
            select: "title description",
          },
        ])
        .lean()
        .exec(),
    ]);

    if (!deletedCandidate) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }

    broadcastCandidateUpdate({
      ...deletedCandidate,
      history: updatedHistory?.history,
    });

    return NextResponse.json({ message: "Candidate deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
