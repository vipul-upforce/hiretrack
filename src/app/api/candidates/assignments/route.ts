// @ts-nocheck

import { NextResponse, NextRequest } from "next/server";
import connectToDatabase, { History } from "@/lib/mongodb";
import { Candidate } from "@/lib/mongodb";
import { User } from "@/lib/mongodb";
import { Job } from "@/lib/mongodb";
import { verifyAndDecryptToken } from "@/app/actions/auth";
import { Types } from "mongoose";

// export async function GET(req: NextRequest) {
//   try {
//     await connectToDatabase();

//     const token = req.cookies.get("token");
//     if (token?.value) {
//       const decryptedResponse = await verifyAndDecryptToken(
//         String(token?.value)
//       );
//       const userData = decryptedResponse.user;
//       if (decryptedResponse.success) {
//         const openJobs = await Job!.find({ status: "open" }).lean();
//         const jobIds = openJobs.map((job) => job._id.toString());
//         const query = {
//           "assignment.interviewerId":
//             userData?.role === "interviewer" ? userData?.id : { $exists: true },
//           $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
//           jobId: { $in: jobIds },
//         };
//         if (!Candidate || !User || !Job) {
//           return NextResponse.json(
//             { error: "Candidate, User, or Job not found" },
//             { status: 400 }
//           );
//         }
//         const projection =
//           userData?.role === "interviewer"
//             ? {
//                 currentCTC: 0,
//                 expectedCTC: 0,
//                 customFields: 0,
//               }
//             : {};
//         const candidates = await Candidate.find(query, projection).populate([
//           {
//             path: "assignment.interviewerId",
//             model: User,
//             select: "_id name email",
//           },
//           {
//             path: "remarks.userId",
//             model: User,
//             select: "_id name email",
//           },
//           {
//             path: "jobId",
//             model: Job,
//             select: "_id title skills description organizationId",
//           },
//         ]);
//         const filteredCandidates = candidates.filter(
//           (candidate) =>
//             candidate.jobId?.organizationId?.toString() ===
//               userData.organizationId && candidate.status !== "rejected"
//         );

//         if (!History) return;

//         const candidatesWithHistory = await Promise.all(
//           filteredCandidates.map(async (candidate) => {
//             const history = await History?.findOne({
//               jobId: candidate.jobId._id,
//               candidateId: candidate._id.toString(),
//             })
//               .populate("history.currentInterviewer", "_id name email")
//               .populate("history.previousInterviewer", "_id name email")
//               .populate("history.assignmentBy", "_id name email")
//               .populate("history.note.userId", "_id name email")
//               .lean();

//             return {
//               ...candidate._doc,
//               history: history
//                 ? history.history.filter((entry) =>
//                     userData?.role === "admin" || userData?.role === "hr"
//                       ? true
//                       : !entry.remark?.isPrivate
//                   )
//                 : [],
//             };
//           })
//         );
//         return NextResponse.json(candidatesWithHistory);
//       } else {
//         return NextResponse.json(
//           { message: "Unauthorised Access" },
//           { status: 401 }
//         );
//       }
//     } else {
//       return NextResponse.json(
//         { message: "Unauthorised Access" },
//         { status: 401 }
//       );
//     }
//   } catch (error) {
//     if (error instanceof Error) {
//       return NextResponse.json({ error: error.message }, { status: 500 });
//     }
//   }
// }

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const searchParams = req.nextUrl.searchParams;
    const token = req.cookies.get("token");
    if (token?.value) {
      const decryptedResponse = await verifyAndDecryptToken(
        String(token?.value)
      );
      const userData = decryptedResponse.user;
      if (decryptedResponse.success) {
        if (!Candidate || !User || !Job) {
          return NextResponse.json(
            { error: "Candidate, User, or Job not found" },
            { status: 400 }
          );
        }
        const assignedTo = searchParams.get("assignedTo");
        const filterValue = searchParams.get("filterValue");
        const isInterviewer = userData?.role === "interviewer";
        let interviewerFilter;
        if (isInterviewer) {
          interviewerFilter = {
            $match: {
              "assignment.interviewerId": new Types.ObjectId(userData.id),
            },
          };
        } else if (assignedTo === "all") {
          interviewerFilter = {
            $match: {
              "assignment.interviewerId": { $exists: true },
            },
          };
        } else if (assignedTo) {
          interviewerFilter = {
            $match: {
              "assignment.interviewerId": new Types.ObjectId(assignedTo),
            },
          };
        } else {
          interviewerFilter = {
            $match: {},
          };
        }

        const isPagination = searchParams.get("isPagination") || false;
        const page = parseInt(searchParams.get("page") || "1", 10);
        const limit = parseInt(searchParams.get("limit") || "12", 10);
        const skip = (page - 1) * limit;

        const pipeline = [
          {
            $match: { status: "open" },
          },
          {
            $lookup: {
              from: "candidates",
              let: { jobId: "$_id" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ["$jobId", "$$jobId"],
                    },
                  },
                },
                interviewerFilter,
              ],
              as: "candidates",
            },
          },
          {
            $unwind: {
              path: "$candidates",
              // preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "histories",
              let: { candidateId: "$candidates._id" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ["$candidateId", { $toString: "$$candidateId" }],
                    },
                  },
                },
                { $unwind: "$history" },
                {
                  $lookup: {
                    from: "users",
                    let: { uid: "$history.assignmentBy" },
                    pipeline: [
                      {
                        $match: {
                          $expr: {
                            $and: [
                              { $eq: ["$_id", "$$uid"] },
                              {
                                $or: [
                                  { $eq: ["$isDeleted", false] },
                                  { $not: { $ifNull: ["$isDeleted", false] } },
                                ],
                              },
                            ],
                          },
                        },
                      },
                      { $project: { _id: 1, name: 1, email: 1 } },
                    ],
                    as: "assignmentByUser",
                  },
                },
                {
                  $set: {
                    "history.assignmentBy": { $first: "$assignmentByUser" },
                  },
                },
                {
                  $lookup: {
                    from: "users",
                    let: { uid: "$history.currentInterviewer" },
                    pipeline: [
                      {
                        $match: {
                          $expr: { $eq: ["$_id", "$$uid"] },
                        },
                      },
                      { $project: { _id: 1, name: 1, email: 1 } },
                    ],
                    as: "currentInterviewerUser",
                  },
                },
                {
                  $set: {
                    "history.currentInterviewer": {
                      $first: "$currentInterviewerUser",
                    },
                  },
                },
                {
                  $lookup: {
                    from: "users",
                    let: { uid: "$history.previousInterviewer" },
                    pipeline: [
                      {
                        $match: {
                          $expr: { $eq: ["$_id", "$$uid"] },
                        },
                      },
                      { $project: { _id: 1, name: 1, email: 1 } },
                    ],
                    as: "previousInterviewerUser",
                  },
                },
                {
                  $set: {
                    "history.previousInterviewer": {
                      $first: "$previousInterviewerUser",
                    },
                  },
                },
                {
                  $lookup: {
                    from: "users",
                    let: { uid: "$history.note.userId" },
                    pipeline: [
                      {
                        $match: {
                          $expr: { $eq: ["$_id", "$$uid"] },
                        },
                      },
                      { $project: { _id: 1, name: 1, email: 1 } },
                    ],
                    as: "noteUser",
                  },
                },
                {
                  $set: {
                    "history.note.userId": { $first: "$noteUser" },
                  },
                },
                {
                  $group: {
                    _id: "$_id",
                    candidateId: { $first: "$candidateId" },
                    jobId: { $first: "$jobId" },
                    history: { $push: "$history" },
                  },
                },
              ],
              as: "histories",
            },
          },
          {
            $unwind: { path: "$histories" },
          },
          {
            $lookup: {
              from: "organizations",
              let: { orgId: "$organizationId" },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ["$_id", "$$orgId"] },
                  },
                },
              ],
              as: "organization",
            },
          },
          {
            $unwind: {
              path: "$organization",
              // preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "users",
              let: { userId: "$candidates.assignment.interviewerId" },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ["$_id", "$$userId"] },
                  },
                },
              ],
              as: "users",
            },
          },
          { $unwind: { path: "$users" } },
          {
            $project: {
              resume: "$candidates.resume",
              tracking: "$candidates.tracking",
              _id: "$candidates._id",
              "assignment.interviewerId._id":
                "$candidates.assignment.interviewerId",
              "assignment.interviewerId.name": "$users.name",
              "assignment.interviewerId.email": "$users.email",
              "assignment.time": "$candidates.assignment.time",
              "assignment.assignedAt": "$candidates.assignment.assignedAt",
              scores: "$candidates.scores",
              "jobId._id": "$_id",
              "jobId.title": "$title",
              "jobId.description": "$description",
              "jobId.skills": "$skills",
              "jobId.organizationId": "$organizationId",
              organizationId: "$organizationId",
              name: "$candidates.name",
              location: "$candidates.location",
              experience: "$candidates.experience",
              skills: "$candidates.skills",
              expectedCTC: {
                $cond: [
                  { $eq: [userData?.role, "interviewer"] },
                  0,
                  "$candidates.expectedCTC",
                ],
              },
              currentCTC: {
                $cond: [
                  { $eq: [userData?.role, "interviewer"] },
                  0,
                  "$candidates.currentCTC",
                ],
              },
              noticePeriod: "$candidates.noticePeriod",
              remarks: "$candidates.remarks",
              attachments: "$candidates.attachments",
              status: "$candidates.status",
              email: "$candidates.email",
              createdAt: "$candidates.createdAt",
              updatedAt: "$candidates.updatedAt",
              history: "$histories.history",
              customFields: "$organization.customFields",
            },
          },
          {
            $group: {
              _id: null,
              totalInterviews: {
                $sum: {
                  $cond: [
                    { $eq: [userData?.role, "interviewer"] },
                    {
                      $cond: [
                        {
                          $eq: [
                            "$assignment.interviewerId._id",
                            new Types.ObjectId(userData.id),
                          ],
                        },
                        1,
                        0,
                      ],
                    },
                    1,
                  ],
                },
              },
              data: { $push: "$$ROOT" },
            },
          },
          {
            $project: {
              _id: 0,
              data: "$data",
              totalInterviews: "$totalInterviews",
            },
          },
        ];

        if (filterValue) {
          pipeline.push({
            $addFields: {
              data: {
                $filter: {
                  input: "$data",
                  cond: {
                    $or: [
                      {
                        $regexMatch: {
                          input: { $ifNull: ["$$this.name", ""] },
                          regex: filterValue,
                          options: "i",
                        },
                      },
                      {
                        $regexMatch: {
                          input: { $ifNull: ["$$this.email", ""] },
                          regex: filterValue,
                          options: "i",
                        },
                      },
                      {
                        $anyElementTrue: {
                          $map: {
                            input: { $ifNull: ["$$this.skills", []] },
                            as: "skill",
                            in: {
                              $regexMatch: {
                                input: { $ifNull: ["$$skill", ""] },
                                regex: filterValue,
                                options: "i",
                              },
                            },
                          },
                        },
                      },
                      {
                        $anyElementTrue: {
                          $map: {
                            input: { $ifNull: ["$$this.jobId.skills", []] },
                            as: "jobSkill",
                            in: {
                              $regexMatch: {
                                input: { $ifNull: ["$$jobSkill", ""] },
                                regex: filterValue,
                                options: "i",
                              },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          });
        }
        if (isPagination) {
          pipeline.push({
            $addFields: {
              data: { $slice: ["$data", skip, limit] },
            },
          });
        }
        const candidates = await Job.aggregate(pipeline);
        const filteredCandidates = candidates[0]?.data?.filter(
          (candidate) =>
            candidate.jobId?.organizationId?.toString() ===
              userData.organizationId && candidate.status !== "rejected"
        );
        if (!History) return;
        const candidatesWithHistory = await Promise.all(
          filteredCandidates.map(async (candidate) => {
            const history = await History?.findOne({
              jobId: candidate.jobId._id,
              candidateId: candidate._id.toString(),
            })
              .populate("history.currentInterviewer", "_id name email")
              .populate("history.previousInterviewer", "_id name email")
              .populate("history.assignmentBy", "_id name email")
              .populate("history.note.userId", "_id name email")
              .lean();

            return {
              ...candidate._doc,
              history: history
                ? history.history.filter((entry) =>
                    userData?.role === "admin" || userData?.role === "hr"
                      ? true
                      : !entry.remark?.isPrivate
                  )
                : [],
            };
          })
        );
        return NextResponse.json(candidates);
      } else {
        return NextResponse.json(
          { message: "Unauthorised Access" },
          { status: 401 }
        );
      }
    } else {
      return NextResponse.json(
        { message: "Unauthorised Access" },
        { status: 401 }
      );
    }
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
}
