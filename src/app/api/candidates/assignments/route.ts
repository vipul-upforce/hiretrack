// @ts-nocheck

import { NextResponse, NextRequest } from "next/server";
import connectToDatabase, { History, Settings } from "@/lib/mongodb";
import { Candidate } from "@/lib/mongodb";
import { User } from "@/lib/mongodb";
import { Job } from "@/lib/mongodb";
import { verifyAndDecryptToken } from "@/app/actions/auth";
import { Types } from "mongoose";
import { getFilterPrivateCF } from "@/lib/filterPrivateCF";

function parseGMTOffset(offset) {
  if (!offset || offset === "GMT+00:00") return 0;
  const sign = offset.startsWith("GMT+") ? 1 : -1;
  const [hours, minutes] = offset
    .replace("GMT+", "")
    .replace("GMT-", "")
    .split(":")
    .map(Number);
  return sign * (hours * 60 * 60 * 1000 + minutes * 60 * 1000);
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const searchParams = req.nextUrl.searchParams;
    const token = req.cookies.get("auth_token");
    const orgId = req.cookies.get("org_id")?.value;
    if (token?.value) {
      const decryptedResponse = await verifyAndDecryptToken(
        String(token?.value),
        orgId
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
        const limit = parseInt(searchParams.get("limit") || "48", 10);
        const skip = (page - 1) * limit;

        const settings = await Settings.findOne({
          organizationId: new Types.ObjectId(userData.organizationId),
        }).lean();
        const userTimeZoneOffset = settings?.timeZone?.offset
          ? parseGMTOffset(settings.timeZone.offset)
          : 0;

        // Calculate timezone-aware dates
        const now = new Date();

        // Adjust to IST (GMT+05:30)
        const nowInUserTimeZone = new Date(now.getTime() + userTimeZoneOffset);

        // Start and end of today in IST
        const startOfToday = new Date(
          nowInUserTimeZone.getFullYear(),
          nowInUserTimeZone.getMonth(),
          nowInUserTimeZone.getDate(),
          0,
          0,
          0,
          0
        );
        const endOfToday = new Date(
          nowInUserTimeZone.getFullYear(),
          nowInUserTimeZone.getMonth(),
          nowInUserTimeZone.getDate(),
          23,
          59,
          59,
          999
        );
        // Convert to UTC
        const startOfTodayUTC = new Date(
          startOfToday.getTime() - userTimeZoneOffset
        );
        const endOfTodayUTC = new Date(
          endOfToday.getTime() - userTimeZoneOffset
        );

        // Start and end of week (Monday to Sunday) in IST
        const dayOfWeek = nowInUserTimeZone.getDay(); // 0 for Sunday, ..., 6 for Saturday

        // Start of week: Sunday
        const startOfWeek = new Date(
          nowInUserTimeZone.getFullYear(),
          nowInUserTimeZone.getMonth(),
          nowInUserTimeZone.getDate() - dayOfWeek,
          0,
          0,
          0,
          0
        );

        // End of week: Saturday (6 days after Sunday)
        const endOfWeek = new Date(
          startOfWeek.getFullYear(),
          startOfWeek.getMonth(),
          startOfWeek.getDate() + 6,
          23,
          59,
          59,
          999
        );

        // Convert to UTC
        const startOfWeekUTC = new Date(
          startOfWeek.getTime() - userTimeZoneOffset
        );
        const endOfWeekUTC = new Date(endOfWeek.getTime() - userTimeZoneOffset);

        const pipeline = [
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
                {
                  $match: {
                    $or: [
                      { isDeleted: { $eq: false } },
                      { isDeleted: { $exists: false } },
                    ],
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
                        { $gte: ["$assignment.time", startOfToday] },
                        { $lt: ["$assignment.time", endOfToday] },
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
                        { $gte: ["$assignment.time", startOfWeek] },
                        { $lt: ["$assignment.time", endOfWeek] },
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
                {
                  $match: {
                    $or: [
                      { isDeleted: { $eq: false } },
                    ],
                  },
                },
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
          Job.aggregate(pipeline),
          Job.aggregate(todaysInterviewsPipeline),
          Job.aggregate(thisweeksInterviewsPipeline),
          Job.aggregate(assignmentsCountPipeline),
        ]);
        const candidates = mainResult[0] || { data: [], totalInterviews: 0 };
        const todaysInterviews = todaysInterviewsResult[0]?.count || 0;
        const thisweeksInterviews = thisweeksInterviewsResult[0]?.count || 0;
        const assignmentCount = assignmentCountsResult || [];

        if (!History) return;
        const candidatesWithPrivateCF = await getFilterPrivateCF(
          candidates.data,
          req
        );
        // console.
        return NextResponse.json([
          {
            data: candidatesWithPrivateCF,
            totalInterviews: candidates.totalInterviews,
            todaysInterviews,
            thisweeksInterviews,
            assignmentCount,
          },
        ]);
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
      console.log(error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
}
