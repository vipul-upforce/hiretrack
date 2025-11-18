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
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20");
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

    const addLogicCondition = (condition: Record<string, unknown>) => {
      if (!Array.isArray(query[logicOperator])) {
        query[logicOperator] = [];
      }
      (query[logicOperator] as Record<string, unknown>[]).push(condition);
    };

    if (organizationId) {
      if (!query.$and) query.$and = [];
      query.$and.push({ organizationId: organizationId });
    } else {
      return NextResponse.json({ error: "Please Add OrgID" }, { status: 500 });
    }

    if (name) {
      addLogicCondition({
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

      addLogicCondition({ $or: skillsConditions });
    }

    if (location) {
      addLogicCondition({
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
      addLogicCondition({ expectedCTC: expectedCTCQuery });
    }

    if (minCurrentCTC || maxCurrentCTC) {
      const currentCTCQuery: { $gte?: number; $lte?: number } = {};
      if (minCurrentCTC) currentCTCQuery.$gte = parseFloat(minCurrentCTC);
      if (maxCurrentCTC) currentCTCQuery.$lte = parseFloat(maxCurrentCTC);
      addLogicCondition({ currentCTC: currentCTCQuery });
    }

    if (minExperience || maxExperience) {
      const experienceQuery: { $gte?: number; $lte?: number } = {};
      if (minExperience) experienceQuery.$gte = parseFloat(minExperience);
      if (maxExperience) experienceQuery.$lte = parseFloat(maxExperience);
      addLogicCondition({ experience: experienceQuery });
    }

    if (createdAfter || createdBefore) {
      const dateQuery: { $gte?: Date; $lte?: Date } = {};
      if (createdAfter) dateQuery.$gte = new Date(createdAfter);
      if (createdBefore) dateQuery.$lte = new Date(createdBefore);
      addLogicCondition({ "tracking.createdAt": dateQuery });
    }

    if (customFields && typeof customFields === "object") {
      const types = (await getKeysType(organizationId)) || [];

      Object.entries(customFields).forEach(([key, value]) => {
        if (value === undefined || value === null) {
          return;
        }

        const fieldPath = `customFields.${key}`;
        const matchedType = types.find(
          (type: CustomField) => type.label === key
        );
        const fieldType = matchedType?.type;

        if (
          fieldType &&
          (fieldType === "date" || fieldType === "datetime") &&
          Array.isArray(value)
        ) {
          const dateCondition = buildDateRangeCondition(
            fieldPath,
            value,
            fieldType
          );

          if (dateCondition) {
            addLogicCondition(dateCondition);
          }
          return;
        }

        if (fieldType === "time" && Array.isArray(value)) {
          const timeCondition = buildTimeRangeCondition(fieldPath, value);
          if (timeCondition) {
            addLogicCondition(timeCondition);
          }
          return;
        }

        if (
          !fieldType &&
          Array.isArray(value) &&
          value.some((entry) => dayjs(entry).isValid())
        ) {
          const fallbackCondition = buildDateRangeCondition(
            fieldPath,
            value,
            "datetime"
          );
          if (fallbackCondition) {
            addLogicCondition(fallbackCondition);
          }
          return;
        }

        if (typeof value === "string" && value.trim() !== "") {
          addLogicCondition({
            [fieldPath]: {
              $regex: value,
              $options: "i",
            },
          });
          return;
        }

        if (Array.isArray(value) && value.length > 0) {
          const regexArray = value
            .filter((v) => typeof v === "string" && v.trim() !== "")
            .map((v) => new RegExp(v, "i"));

          if (regexArray.length > 0) {
            addLogicCondition({
              [fieldPath]: {
                $in: regexArray,
              },
            });
          }
        }
      });
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
                      preserveNullAndEmptyArrays: true,
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
                      preserveNullAndEmptyArrays: true,
                    },
                  },
                  {
                    $unwind: {
                      path: "$history.note",
                      preserveNullAndEmptyArrays: true,
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
                resume: 1,
                scores: 1,
                status: 1,
                createdAt: 1,
                updatedAt: 1,
                remarksUser: 1,
                attachments: 1,
                contact: 1,
                currentCTC: 1,
                expectedCTC: 1,
                customFields: 1,
                tracking: 1,
                isDeleted: 1,
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

const parseDateInput = (value: unknown) => {
  if (!value) {
    return null;
  }

  const parsed = dayjs(value as string | number | Date);
  return parsed.isValid() ? parsed : null;
};

const buildDateFieldExpression = (fieldPath: string, format?: string) => {
  const fieldRef = `$${fieldPath}`;
  const isoParser = {
    $dateFromString: {
      dateString: fieldRef,
      onNull: null,
      onError: null,
    },
  };

  const formattedParser = format
    ? {
        $dateFromString: {
          dateString: fieldRef,
          format,
          onNull: null,
          onError: null,
        },
      }
    : null;

  return {
    $let: {
      vars: {
        rawValue: fieldRef,
        isoValue: isoParser,
        formattedValue: formattedParser,
      },
      in: {
        $cond: [
          { $eq: [{ $type: "$$rawValue" }, "date"] },
          "$$rawValue",
          formattedParser
            ? {
                $ifNull: ["$$isoValue", "$$formattedValue"],
              }
            : "$$isoValue",
        ],
      },
    },
  };
};

const buildDateRangeCondition = (
  fieldPath: string,
  range: unknown[],
  fieldType: "date" | "datetime"
) => {
  if (!Array.isArray(range)) {
    return null;
  }

  const [startRaw, endRaw] = range;
  const start = parseDateInput(startRaw);
  const end = parseDateInput(endRaw);

  const startDate =
    start && fieldType === "date"
      ? start.startOf("day").toDate()
      : start?.toDate();
  const endDate =
    end && fieldType === "date" ? end.endOf("day").toDate() : end?.toDate();

  if (!startDate && !endDate) {
    return null;
  }

  const dateFormat = fieldType === "date" ? "%m/%d/%Y" : undefined;
  const fieldExpression = buildDateFieldExpression(fieldPath, dateFormat);

  const comparisons: Record<string, unknown>[] = [];

  if (startDate) {
    comparisons.push({
      $gte: [fieldExpression, startDate],
    });
  }

  if (endDate) {
    comparisons.push({
      $lte: [fieldExpression, endDate],
    });
  }

  if (!comparisons.length) {
    return null;
  }

  if (comparisons.length === 1) {
    return {
      $expr: comparisons[0],
    };
  }

  return {
    $expr: {
      $and: comparisons,
    },
  };
};

const parseTimeStringToDate = (value: unknown) => {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const [hoursStr, minutesStr = "0", secondsStr = "0"] = value.split(":");
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);
  const seconds = Number(secondsStr);

  if (Number.isNaN(hours) || Number.isNaN(minutes) || Number.isNaN(seconds)) {
    return null;
  }

  return new Date(Date.UTC(1970, 0, 1, hours, minutes, seconds));
};

const buildTimeRangeCondition = (fieldPath: string, range: unknown[]) => {
  if (!Array.isArray(range)) {
    return null;
  }

  const [startRaw, endRaw] = range;
  const start = parseTimeStringToDate(startRaw);
  const end = parseTimeStringToDate(endRaw);

  if (!start && !end) {
    return null;
  }

  const fieldExpression = buildDateFieldExpression(fieldPath, "%H:%M");
  const comparisons: Record<string, unknown>[] = [];

  if (start) {
    comparisons.push({
      $gte: [fieldExpression, start],
    });
  }

  if (end) {
    comparisons.push({
      $lte: [fieldExpression, end],
    });
  }

  if (!comparisons.length) {
    return null;
  }

  if (comparisons.length === 1) {
    return {
      $expr: comparisons[0],
    };
  }

  return {
    $expr: {
      $and: comparisons,
    },
  };
};

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
