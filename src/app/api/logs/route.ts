import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { History } from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const limit = parseInt(searchParams.get("limit") || "100", 10);
    const query = searchParams.get("query") || "";

    // Build search filter
    const searchFilter = query
      ? {
          $or: [
            { "history.title": { $regex: query, $options: "i" } },
            { "candidateData.name": { $regex: query, $options: "i" } },
            { "candidateData.email": { $regex: query, $options: "i" } },
            { "candidateData.skills": { $regex: query, $options: "i" } },
            {
              "candidateData.remarks.description": {
                $regex: query,
                $options: "i",
              },
            },
            { "jobData.title": { $regex: query, $options: "i" } },
          ],
        }
      : {};

    // Aggregation pipeline for fetching logs
    const historyLogs = await History!.aggregate([
      {
        // Unwind the history array
        $unwind: "$history",
      },
      {
        // Filter for valid ISO dateTime strings
        $match: {
          "history.dateTime": {
            $type: "string",
            $regex: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}.*Z$",
          },
        },
      },
      {
        // Convert valid ISO dateTime to Date
        $addFields: {
          "history.parsedDateTime": { $toDate: "$history.dateTime" },
        },
      },
      {
        // Add fields to handle candidateId conversion safely
        $addFields: {
          candidateObjectId: {
            $switch: {
              branches: [
                {
                  case: { $eq: [{ $type: "$candidateId" }, "objectId"] },
                  then: "$candidateId",
                },
                {
                  case: { $eq: [{ $type: "$candidateId" }, "string"] },
                  then: {
                    $cond: {
                      if: { $eq: [{ $strLenCP: "$candidateId" }, 24] },
                      then: { $toObjectId: "$candidateId" },
                      else: null,
                    },
                  },
                },
                {
                  case: {
                    $and: [
                      { $eq: [{ $type: "$candidateId" }, "object"] },
                      { $ne: ["$candidateId._id", null] },
                    ],
                  },
                  then: {
                    $cond: {
                      if: { $eq: [{ $type: "$candidateId._id" }, "objectId"] },
                      then: "$candidateId._id",
                      else: {
                        $cond: {
                          if: {
                            $and: [
                              {
                                $eq: [{ $type: "$candidateId._id" }, "string"],
                              },
                              { $eq: [{ $strLenCP: "$candidateId._id" }, 24] },
                            ],
                          },
                          then: { $toObjectId: "$candidateId._id" },
                          else: null,
                        },
                      },
                    },
                  },
                },
              ],
              default: null,
            },
          },
        },
      },
      {
        // Lookup for candidateId - only if candidateObjectId is valid
        $lookup: {
          from: "candidates",
          let: { cid: "$candidateObjectId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $ne: ["$$cid", null] }, { $eq: ["$_id", "$$cid"] }],
                },
              },
            },
          ],
          as: "candidateData",
        },
      },
      {
        // Unwind candidateData
        $unwind: {
          path: "$candidateData",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        // Add fields to handle jobId conversion safely
        $addFields: {
          jobObjectId: {
            $switch: {
              branches: [
                {
                  case: { $eq: [{ $type: "$jobId" }, "objectId"] },
                  then: "$jobId",
                },
                {
                  case: { $eq: [{ $type: "$jobId" }, "string"] },
                  then: {
                    $cond: {
                      if: { $eq: [{ $strLenCP: "$jobId" }, 24] },
                      then: { $toObjectId: "$jobId" },
                      else: null,
                    },
                  },
                },
                {
                  case: {
                    $and: [
                      { $eq: [{ $type: "$jobId" }, "object"] },
                      { $ne: ["$jobId._id", null] },
                    ],
                  },
                  then: {
                    $cond: {
                      if: { $eq: [{ $type: "$jobId._id" }, "objectId"] },
                      then: "$jobId._id",
                      else: {
                        $cond: {
                          if: {
                            $and: [
                              { $eq: [{ $type: "$jobId._id" }, "string"] },
                              { $eq: [{ $strLenCP: "$jobId._id" }, 24] },
                            ],
                          },
                          then: { $toObjectId: "$jobId._id" },
                          else: null,
                        },
                      },
                    },
                  },
                },
              ],
              default: null,
            },
          },
        },
      },
      {
        // Lookup for jobId - only if jobObjectId is valid
        $lookup: {
          from: "jobs",
          let: { jid: "$jobObjectId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $ne: ["$$jid", null] }, { $eq: ["$_id", "$$jid"] }],
                },
              },
            },
          ],
          as: "jobData",
        },
      },
      {
        // Unwind jobData
        $unwind: {
          path: "$jobData",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        // Lookup for assignmentBy
        $lookup: {
          from: "users",
          localField: "history.assignmentBy",
          foreignField: "_id",
          as: "history.assignmentBy",
        },
      },
      {
        // Lookup for currentInterviewer
        $lookup: {
          from: "users",
          localField: "history.currentInterviewer",
          foreignField: "_id",
          as: "history.currentInterviewer",
        },
      },
      {
        // Lookup for previousInterviewer
        $lookup: {
          from: "users",
          localField: "history.previousInterviewer",
          foreignField: "_id",
          as: "history.previousInterviewer",
        },
      },
      {
        // Lookup for note.userId
        $lookup: {
          from: "users",
          localField: "history.note.userId",
          foreignField: "_id",
          as: "history.note.userId",
        },
      },
      {
        // Apply search filter
        $match: searchFilter,
      },
      {
        // Sort by parsedDateTime in descending order
        $sort: { "history.parsedDateTime": -1 },
      },
      {
        // Remove temporary fields used for conversion
        $project: {
          candidateObjectId: 0,
          jobObjectId: 0,
          "history.parsedDateTime": 0,
        },
      },
      {
        // Count total matching documents (for pagination)
        $facet: {
          logs: [
            { $skip: offset },
            { $limit: limit },
            {
              $project: {
                _id: 0,
                jobId: 1,
                jobData: 1,
                candidateData: 1,
                candidateId: 1,
                dateTime: "$history.dateTime",
                currentInterviewer: "$history.currentInterviewer",
                previousInterviewer: "$history.previousInterviewer",
                title: "$history.title",
                remark: "$history.remark",
                note: "$history.note",
                attachments: "$history.attachments",
                assignmentBy: "$history.assignmentBy",
              },
            },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
    ]);

    const logs = historyLogs[0].logs || [];
    const totalCount = historyLogs[0].totalCount[0]?.count || 0;

    return NextResponse.json({
      logs,
      offset,
      totalLines: totalCount,
    });
  } catch (error) {
    console.error("Error fetching history logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch history logs." },
      { status: 500 }
    );
  }
}
