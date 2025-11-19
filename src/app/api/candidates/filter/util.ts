import { Organization } from "@/lib/mongodb";
import dayjs from "dayjs";
import { Types } from "mongoose";

export const parseDateInput = (value: unknown) => {
  if (!value) {
    return null;
  }

  const parsed = dayjs(value as string | number | Date);
  return parsed.isValid() ? parsed : null;
};

export const buildDateFieldExpression = (
  fieldPath: string,
  format?: string
) => {
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

export const buildDateRangeCondition = (
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

  // Normalize "6:08" → "06:08"
  const [h, m] = value.split(":");
  const hours = h.padStart(2, "0");
  const minutes = m?.padStart(2, "0") || "00";

  // Build ISO datetime Mongo will parse as a valid Date
  const isoString = `1970-01-01T${hours}:${minutes}:00Z`;

  const parsed = dayjs(isoString);
  return parsed.isValid() ? parsed.toDate() : null;
};

export const buildTimeRangeCondition = (
  fieldPath: string,
  range: unknown[]
) => {
  if (!Array.isArray(range)) {
    return null;
  }

  const [startRaw, endRaw] = range;
  const start = parseTimeStringToDate(startRaw);
  const end = parseTimeStringToDate(endRaw);

  if (!start && !end) {
    return null;
  }

  const fieldExpression = {
    $dateFromString: {
      dateString: {
        $concat: [
          "1970-01-01T",

          {
            $let: {
              vars: {
                raw: { $ifNull: [`$${fieldPath}`, ""] }, // <-- PREVENTS the error
              },
              in: {
                $cond: [
                  { $lte: [{ $strLenCP: "$$raw" }, 4] },

                  // Case: "6:14" or "3:9"
                  {
                    $concat: [
                      {
                        $cond: [
                          { $eq: [{ $substr: ["$$raw", 1, 1] }, ":"] },
                          // If single digit hour → pad
                          { $concat: ["0", { $substr: ["$$raw", 0, 1] }] },
                          // Else already 2-digit hour
                          { $substr: ["$$raw", 0, 2] },
                        ],
                      },
                      ":",
                      {
                        // Minutes
                        $cond: [
                          { $eq: [{ $strLenCP: "$$raw" }, 3] },
                          { $concat: ["0", { $substr: ["$$raw", 2, 1] }] }, // "6:8"
                          { $substr: ["$$raw", 2, 2] },
                        ],
                      },
                    ],
                  },

                  // Case: already "HH:mm"
                  "$$raw",
                ],
              },
            },
          },

          ":00Z",
        ],
      },
      onNull: null,
      onError: null,
    },
  };

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

export const getKeysType = async (orgId: string) => {
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
