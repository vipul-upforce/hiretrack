import { NextResponse, NextRequest } from "next/server";
import connectToDatabase, { Settings } from "@/lib/mongodb";
import { Candidate } from "@/lib/mongodb";
import { User } from "@/lib/mongodb";
import { Job } from "@/lib/mongodb";
import { getAuthenticatedUser } from "@/app/actions/auth";
import { Types } from "mongoose";
import { getFilterPrivateCF } from "@/lib/filterPrivateCF";
import { parseGMTOffset, getTimeZoneDates } from "@/lib/utils/dateHelpers";
import type { PipelineStage } from "mongoose";

// export async function GET(req: NextRequest) {
//   try {
//     await connectToDatabase();

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
    // Connect to database and authenticate in parallel
    const [userData] = await Promise.all([
      getAuthenticatedUser(req, ["admin", "hr", "interviewer"]),
      connectToDatabase(),
    ]);

    if (!userData) {
      return NextResponse.json(
        { message: "Unauthorised Access" },
        { status: 401 }
      );
    }

    // Validate required models
    if (!Job || !Candidate || !User || !Settings) {
      return NextResponse.json(
        { error: "Database models not available" },
        { status: 500 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const assignedTo = searchParams.get("assignedTo");
    const filterValue = searchParams.get("filterValue");
    const isInterviewer = userData.role === "interviewer";
    const isPagination = searchParams.get("isPagination") === "true";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "48", 10);
    const skip = (page - 1) * limit;

    // Build interviewer filter
    let interviewerFilter: { $match: Record<string, unknown> };
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

        // const today = new Date();
        // const startOfToday = new Date(
        //   Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
        // );
        // const endOfToday = new Date(
        //   Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() + 1)
        // );
        // const startOfWeek = new Date(
        //   Date.UTC(
        //     today.getFullYear(),
        //     today.getMonth(),
        //     today.getDate() - today.getDay() + 1
        //   )
        // );
        // const endOfWeek = new Date(
        //   Date.UTC(
        //     today.getFullYear(),
        //     today.getMonth(),
        //     today.getDate() - today.getDay() + 8
        //   )
        // );

    // Fetch settings in parallel with other operations (optimized query)
    const settings = await Settings.findOne({
      organizationId: userData.organizationId,
    })
      .select("timeZone.offset")
      .lean()
      .exec();

    const userTimeZoneOffset = parseGMTOffset(settings?.timeZone?.offset);
    const { startOfTodayUTC, endOfTodayUTC, startOfWeekUTC, endOfWeekUTC } =
      getTimeZoneDates(userTimeZoneOffset);

    // Build main aggregation pipeline with optimized structure
    const candidateMatchPipeline: PipelineStage[] = [
      {
        $match: {
          $expr: {
            $eq: ["$jobId", "$$jobId"],
          },
        },
      },
      {
        $match: {
          $or: [
            { isDeleted: { $eq: false } },
            { isDeleted: { $exists: false } },
          ],
        },
      },
      interviewerFilter,
    ];

    // Add filterValue to candidate pipeline early for better performance
    if (filterValue) {
      candidateMatchPipeline.push({
        $match: {
          $or: [
            { name: { $regex: filterValue, $options: "i" } },
            { email: { $regex: filterValue, $options: "i" } },
            { skills: { $regex: filterValue, $options: "i" } },
          ],
        },
      });
    }

    const pipeline: PipelineStage[] = [
      {
        $match: {
          status: "open",
          organizationId: new Types.ObjectId(userData.organizationId),
          $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
        },
      },
      {
        $lookup: {
          from: "candidates",
          let: { jobId: "$_id" },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          pipeline: candidateMatchPipeline as any,
          as: "candidates",
        },
      },
          {
            $unwind: {
              path: "$candidates",
              // preserveNullAndEmptyArrays: true,
            },
          },
          // {
          //   $lookup: {
          //     from: "histories",
          //     let: { candidateId: "$candidates._id" },
          //     pipeline: [
          //       {
          //         $match: {
          //           $expr: {
          //             $eq: ["$candidateId", { $toString: "$$candidateId" }],
          //           },
          //         },
          //       },
          //       { $unwind: "$history" },
          //       {
          //         $lookup: {
          //           from: "users",
          //           let: { uid: "$history.assignmentBy" },
          //           pipeline: [
          //             {
          //               $match: {
          //                 $expr: {
          //                   $and: [
          //                     { $eq: ["$_id", "$$uid"] },
          //                     {
          //                       $or: [
          //                         { $eq: ["$isDeleted", false] },
          //                         { $not: { $ifNull: ["$isDeleted", false] } },
          //                       ],
          //                     },
          //                   ],
          //                 },
          //               },
          //             },
          //             { $project: { _id: 1, name: 1, email: 1 } },
          //           ],
          //           as: "assignmentByUser",
          //         },
          //       },
          //       {
          //         $set: {
          //           "history.assignmentBy": { $first: "$assignmentByUser" },
          //         },
          //       },
          //       {
          //         $lookup: {
          //           from: "users",
          //           let: { uid: "$history.currentInterviewer" },
          //           pipeline: [
          //             {
          //               $match: {
          //                 $expr: { $eq: ["$_id", "$$uid"] },
          //               },
          //             },
          //             { $project: { _id: 1, name: 1, email: 1 } },
          //           ],
          //           as: "currentInterviewerUser",
          //         },
          //       },
          //       {
          //         $set: {
          //           "history.currentInterviewer": {
          //             $first: "$currentInterviewerUser",
          //           },
          //         },
          //       },
          //       {
          //         $lookup: {
          //           from: "users",
          //           let: { uid: "$history.previousInterviewer" },
          //           pipeline: [
          //             {
          //               $match: {
          //                 $expr: { $eq: ["$_id", "$$uid"] },
          //               },
          //             },
          //             { $project: { _id: 1, name: 1, email: 1 } },
          //           ],
          //           as: "previousInterviewerUser",
          //         },
          //       },
          //       {
          //         $set: {
          //           "history.previousInterviewer": {
          //             $first: "$previousInterviewerUser",
          //           },
          //         },
          //       },
          //       {
          //         $lookup: {
          //           from: "users",
          //           let: { uid: "$history.note.userId" },
          //           pipeline: [
          //             {
          //               $match: {
          //                 $expr: { $eq: ["$_id", "$$uid"] },
          //               },
          //             },
          //             { $project: { _id: 1, name: 1, email: 1 } },
          //           ],
          //           as: "noteUser",
          //         },
          //       },
          //       {
          //         $set: {
          //           "history.note.userId": { $first: "$noteUser" },
          //         },
          //       },
          //       {
          //         $group: {
          //           _id: "$_id",
          //           candidateId: { $first: "$candidateId" },
          //           jobId: { $first: "$jobId" },
          //           history: { $push: "$history" },
          //         },
          //       },
          //     ],
          //     as: "histories",
          //   },
          // },
          // {
          //   $unwind: { path: "$histories" },
          // },
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
            $lookup: {
              from: "users",
              let: { followUpUserId: "$candidates.followUp.userId" },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ["$_id", "$$followUpUserId"] },
                  },
                },
                { $project: { _id: 1, name: 1, email: 1 } },
              ],
              as: "followUpUser",
            },
          },
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
              "assignment.googleMeet": "$candidates.assignment.googleMeet",
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
              relevantExperience: "$candidates.relevantExperience",
              skills: "$candidates.skills",
              expectedCTC: {
                $cond: [
                  { $eq: [isInterviewer, true] },
                  0,
                  "$candidates.expectedCTC",
                ],
              },
              currentCTC: {
                $cond: [
                  { $eq: [isInterviewer, true] },
                  0,
                  "$candidates.currentCTC",
                ],
              },
              tags: "$candidates.tags",
              noticePeriod: "$candidates.noticePeriod",
              isDeleted: "$candidates.isDeleted",
              remarks: "$candidates.remarks",
              attachments: "$candidates.attachments",
              status: "$candidates.status",
              email: "$candidates.email",
              contact: "$candidates.contact",
              createdAt: "$candidates.createdAt",
              updatedAt: "$candidates.updatedAt",
              // history: "$histories.history",
              customFields: "$candidates.customFields",
              followUp: {
                note: "$candidates.followUp.note",
                date: "$candidates.followUp.date",
                userId: { $first: "$followUpUser" },
              },
            },
          },
          {
            $group: {
              _id: null,
              totalInterviews: {
                $sum: {
                  $cond: [
                    { $eq: [isInterviewer, true] },
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

    // Add pagination if enabled
    if (isPagination) {
      pipeline.push({
        $addFields: {
          data: { $slice: ["$data", skip, limit] },
        },
      });
    }

        // Separate aggregation for todaysInterviews
        const todaysInterviewsPipeline = [
          {
            $match: {
              status: "open",
              organizationId: new Types.ObjectId(userData?.organizationId),
            },
          },
          {
            $lookup: {
              from: "candidates",
              let: { jobId: "$_id" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ["$jobId", "$$jobId"] },
                        { $gte: ["$assignment.time", startOfTodayUTC] },
                        { $lt: ["$assignment.time", endOfTodayUTC] },
                        ...(isInterviewer
                          ? [
                              {
                                $eq: [
                                  "$assignment.interviewerId",
                                  new Types.ObjectId(userData.id),
                                ],
                              },
                            ]
                          : []),
                      ],
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
            },
          },
          {
            $count: "count",
          },
        ];

        // Separate aggregation for thisweeksInterviews
        const thisweeksInterviewsPipeline = [
          {
            $match: {
              status: "open",
              organizationId: new Types.ObjectId(userData?.organizationId),
            },
          },
          {
            $lookup: {
              from: "candidates",
              let: { jobId: "$_id" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ["$jobId", "$$jobId"] },
                        { $gte: ["$assignment.time", startOfWeekUTC] },
                        { $lt: ["$assignment.time", endOfWeekUTC] },
                        ...(isInterviewer
                          ? [
                              {
                                $eq: [
                                  "$assignment.interviewerId",
                                  new Types.ObjectId(userData.id),
                                ],
                              },
                            ]
                          : []),
                      ],
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
            },
          },
          {
            $count: "count",
          },
        ];

        const assignmentsCountPipeline = [
          {
            $match: {
              status: "open",
              organizationId: new Types.ObjectId(userData?.organizationId),
            },
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
                // interviewerFilter,
              ],
              as: "candidates",
            },
          },
          {
            $unwind: {
              path: "$candidates",
            },
          },
          {
            $group: {
              _id: "$candidates.assignment.interviewerId",
              count: { $sum: 1 },
              name: { $first: "$candidates.assignment.interviewerId.name" },
              email: { $first: "$candidates.assignment.interviewerId.email" },
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "_id",
              foreignField: "_id",
              as: "user",
            },
          },
          {
            $unwind: {
              path: "$user",
            },
          },
          {
            $project: {
              _id: 0,
              interviewerId: "$_id",
              name: "$user.name",
              email: "$user.email",
              count: 1,
            },
          },
          {
            $sort: {
              name: 1,
            },
          },
        ];

        const [
          mainResult,
          todaysInterviewsResult,
          thisweeksInterviewsResult,
          assignmentCountsResult,
        ] = await Promise.all([
          Job.aggregate(pipeline as PipelineStage[]),
          Job.aggregate(todaysInterviewsPipeline as PipelineStage[]),
          Job.aggregate(thisweeksInterviewsPipeline as PipelineStage[]),
          Job.aggregate(assignmentsCountPipeline as PipelineStage[]),
        ]);
        const candidates = mainResult[0] || { data: [], totalInterviews: 0 };
        const todaysInterviews = todaysInterviewsResult[0]?.count || 0;
        const thisweeksInterviews = thisweeksInterviewsResult[0]?.count || 0;
        const assignmentCount = assignmentCountsResult || [];
        // console.log("befire filter: ", candidates.data.length);
        // const filteredCandidates = candidates.data?.filter(
        //   (candidate) =>
        //     candidate.jobId?.organizationId?.toString() ===
        //       userData.organizationId && candidate.status !== "rejected"
        // );
        // console.log("after filter: ", filteredCandidates.length);

    // Filter private custom fields
    const candidatesWithPrivateCF = await getFilterPrivateCF(
      candidates.data,
      req
    );

    // Calculate pagination metadata
    const totalCandidates = candidates.data.length;
    const totalPages = isPagination ? Math.ceil(totalCandidates / limit) : 1;

    return NextResponse.json([
      {
        data: candidatesWithPrivateCF,
        totalInterviews: candidates.totalInterviews,
        todaysInterviews,
        thisweeksInterviews,
        assignmentCount,
        ...(isPagination && {
          pagination: {
            page,
            limit,
            total: totalCandidates,
            totalPages,
          },
        }),
      }
    ]);
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
