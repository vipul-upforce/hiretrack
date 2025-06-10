import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { Organization } from "@/lib/mongodb";
import { Candidate } from "@/lib/mongodb";
import dayjs from "dayjs";
import { Types } from "mongoose";
import { CustomField } from "@/Custom_Fields/Types/CustomField";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const page = parseInt(request.nextUrl.searchParams.get("page") || "1");
    const limit = 100;
    const skip = (page - 1) * limit;
    const {
      name,
      skills,
      location,
      minExpectedCTC,
      maxExpectedCTC,
      minCurrentCTC,
      maxCurrentCTC,
      minExperience,
      maxExperience,
      createdAfter,
      createdBefore,
      organizationId,
      customFields,
      logicOperator = "$or",
    } = body;

    const query: Record<string, any> = { [logicOperator]: [] };

    if (organizationId) {
      if (!query.$and) query.$and = [];
      query.$and.push({ organizationId: organizationId });
    } else {
      return NextResponse.json({ error: "Please Add OrgID" }, { status: 500 });
    }

    if (name) {
      query[logicOperator].push({
        name: {
          $regex: name.trim(),
          $options: "i",
        },
      });
    }

    // Handle skills with $and
    if (skills && skills.length > 0) {
      const skillsConditions = skills.map((skill: string) => ({
        skills: {
          $regex: skill.trim(),
          $options: "i",
        },
      }));

      query[logicOperator].push({ $or: skillsConditions });
    }

    if (location) {
      query[logicOperator].push({
        location: {
          $regex: location.trim(),
          $options: "i",
        },
      });
    }

    // Handle CTC ranges
    if (minExpectedCTC || maxExpectedCTC) {
      const expectedCTCQuery: { $gte?: number; $lte?: number } = {};
      if (minExpectedCTC) expectedCTCQuery.$gte = parseFloat(minExpectedCTC);
      if (maxExpectedCTC) expectedCTCQuery.$lte = parseFloat(maxExpectedCTC);
      query[logicOperator].push({ expectedCTC: expectedCTCQuery });
    }

    if (minCurrentCTC || maxCurrentCTC) {
      const currentCTCQuery: { $gte?: number; $lte?: number } = {};
      if (minCurrentCTC) currentCTCQuery.$gte = parseFloat(minCurrentCTC);
      if (maxCurrentCTC) currentCTCQuery.$lte = parseFloat(maxCurrentCTC);
      query[logicOperator].push({ currentCTC: currentCTCQuery });
    }

    if (minExperience || maxExperience) {
      const experienceQuery: { $gte?: number; $lte?: number } = {};
      if (minExperience) experienceQuery.$gte = parseFloat(minExperience);
      if (maxExperience) experienceQuery.$lte = parseFloat(maxExperience);
      query[logicOperator].push({ experience: experienceQuery });
    }

    if (createdAfter || createdBefore) {
      const dateQuery: { $gte?: Date; $lte?: Date } = {};
      if (createdAfter) dateQuery.$gte = new Date(createdAfter);
      if (createdBefore) dateQuery.$lte = new Date(createdBefore);
      query[logicOperator].push({ "tracking.createdAt": dateQuery });
    }

    if (customFields && typeof customFields === "object") {
      const types = await getKeysType(organizationId);

      await Promise.all(
        Object.entries(customFields).map(async ([key, value]) => {
          const fieldPath = `customFields.${key}`;
          const matchedType = types.find(
            (type: CustomField) => type.label === key
          );
          const isDateTime = matchedType?.type === "datetime";

          if (
            Array.isArray(value) &&
            (dayjs(value[0]).isValid() || dayjs(value[1]).isValid())
          ) {
            const start =
              value[0] && dayjs(value[0]).isValid()
                ? (!isDateTime
                    ? dayjs(value[0]).add(1, "day")
                    : dayjs(value[0])
                  ).toDate()
                : null;

            const end =
              value[1] && dayjs(value[1]).isValid()
                ? (!isDateTime
                    ? dayjs(value[1]).add(1, "day")
                    : dayjs(value[1])
                  ).toDate()
                : null;

            if (start && end) {
              query[logicOperator].push({
                [fieldPath]: {
                  $gte: start.toISOString(),
                  $lte: end.toISOString(),
                },
              });
            } else if (start) {
              console.log("osnide start", start);
              console.log("start.toISOString() :>> ", start.toISOString());
              query[logicOperator].push({
                [fieldPath]: {
                  $gte: start.toISOString(),
                },
              });
            } else if (end) {
              query[logicOperator].push({
                [fieldPath]: {
                  $lte: end.toISOString(),
                },
              });
            }
          }

          // ✅ Handle single string (text input)
          else if (typeof value === "string" && value.trim() !== "") {
            query[logicOperator].push({
              [fieldPath]: {
                $regex: value,
                $options: "i",
              },
            });
          }

          // ✅ Handle multi-select (array of strings, not date)
          else if (Array.isArray(value) && value.length > 0) {
            const regexArray = value
              .filter((v) => typeof v === "string" && v.trim() !== "")
              .map((v) => new RegExp(v, "i"));

            if (regexArray.length > 0) {
              query[logicOperator].push({
                [fieldPath]: {
                  $in: regexArray,
                },
              });
            }
          }
        })
      );
    }

    if (!Candidate) {
      throw new Error("Candidate model is not available");
    }

    const candidatesResult = await Candidate.aggregate([
      { $match: query },
      { $sort: { "tracking.createdAt": -1 } },

      // $facet to run two pipelines: paginated data and total count
      {
        $facet: {
          paginatedData: [
            { $skip: skip },
            { $limit: limit },
            // all your existing lookups and projections go here
            {
              $lookup: {
                from: "users",
                localField: "remarks.userId",
                foreignField: "_id",
                as: "remarksUser",
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "assignment.interviewerId",
                foreignField: "_id",
                as: "interviewer",
              },
            },
            {
              $unwind: {
                path: "$interviewer",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $lookup: {
                from: "jobs",
                localField: "jobId",
                foreignField: "_id",
                as: "job",
              },
            },
            {
              $unwind: {
                path: "$job",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $lookup: {
                from: "histories",
                let: {
                  jobId: { $toString: "$jobId" },
                  candidateId: { $toString: "$_id" },
                },
                pipeline: [
                  {
                    $unwind: "$history",
                  },
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: [{ $toString: "$jobId" }, "$$jobId"] },
                          {
                            $eq: [
                              { $toString: "$candidateId" },
                              "$$candidateId",
                            ],
                          },
                        ],
                      },
                    },
                  },
                  { $unwind: "$history" },
                  {
                    $lookup: {
                      from: "users",
                      localField: "history.assignmentBy",
                      foreignField: "_id",
                      as: "history.assignmentBy",
                    },
                  },
                  {
                    $unwind: {
                      path: "$history.assignmentBy",
                      preserveNullAndEmptyArrays: true,
                    },
                  },
                  {
                    $lookup: {
                      from: "users",
                      localField: "history.currentInterviewer",
                      foreignField: "_id",
                      as: "history.currentInterviewer",
                    },
                  },
                  {
                    $unwind: {
                      path: "$history.currentInterviewer",
                    },
                  },
                  {
                    $lookup: {
                      from: "users",
                      localField: "history.previousInterviewer",
                      foreignField: "_id",
                      as: "history.previousInterviewer",
                    },
                  },
                  {
                    $unwind: {
                      path: "$history.previousInterviewer",
                    },
                  },
                  {
                    $unwind: {
                      path: "$history.note",
                    },
                  },
                  {
                    $lookup: {
                      from: "users",
                      localField: "history.note.userId",
                      foreignField: "_id",
                      as: "history.note.userId",
                    },
                  },
                  {
                    $unwind: {
                      path: "$history.note.userId",
                      preserveNullAndEmptyArrays: true,
                    },
                  },
                  {
                    $group: {
                      _id: "$_id",
                      jobId: { $first: "$jobId" },
                      candidateId: { $first: "$candidateId" },
                      history: { $push: "$history" },
                    },
                  },
                ],
                as: "history",
              },
            },
            {
              $project: {
                _id: 1,
                jobId: "$job",
                organizationId: 1,
                name: 1,
                location: 1,
                experience: 1,
                skills: 1,
                email: 1,
                scores: 1,
                status: 1,
                createdAt: 1,
                updatedAt: 1,
                remarksUser: 1,
                attachments: 1,
                currentCTC: 1,
                expectedCTC: 1,
                customFields: 1,
                tracking: 1,
                history: { $arrayElemAt: ["$history.history", 0] },
                assignment: {
                  $mergeObjects: [
                    "$assignment",
                    {
                      interviewerId: {
                        _id: "$interviewer._id",
                        name: "$interviewer.name",
                        email: "$interviewer.email",
                      },
                    },
                  ],
                },
              },
            },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
    ]);

    const paginatedData = candidatesResult[0]?.paginatedData || [];
    const totalCount = candidatesResult[0]?.totalCount[0]?.count || 0;

    return NextResponse.json({
      candidates: paginatedData,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: "An unknown error occurred" },
      { status: 500 }
    );
  }
}

const getKeysType = async (orgId: string) => {
  const keys = await Organization?.aggregate([
    {
      $match: {
        _id: new Types.ObjectId(orgId),
      },
    },
    {
      $project: {
        customFieldsArray: { $objectToArray: "$customFields" },
      },
    },
    {
      $unwind: "$customFieldsArray",
    },
    {
      $match: {
        "customFieldsArray.v.formName": "Candidate",
      },
    },
    {
      $project: {
        fields: "$customFieldsArray.v.fields",
        _id: 0,
      },
    },
  ]);
  return keys?.[0].fields;
};
