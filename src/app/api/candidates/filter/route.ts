import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { History } from "@/lib/mongodb";
import { Candidate } from "@/lib/mongodb";

interface QueryCondition {
  $regex?: string;
  $options?: string;
  $gte?: number | Date;
  $lte?: number | Date;
}

interface Query {
  [key: string]: Array<Record<string, QueryCondition | string>>;
}

// export async function POST(request: NextRequest) {
//   try {
//     await connectToDatabase();

//     const body = await request.json();
//     const {
//       name,
//       skills,
//       location,
//       minExpectedCTC,
//       maxExpectedCTC,
//       minCurrentCTC,
//       maxCurrentCTC,
//       minExperience,
//       maxExperience,
//       createdAfter,
//       createdBefore,
//       organizationId,
//       logicOperator = "$or",
//     } = body;

//     const query: Query = { [logicOperator]: [] };

//     // Add organization filter if provided
//     if (organizationId) {
//       if (!query.$and) query.$and = [];
//       query.$and.push({ organizationId: organizationId });
//     } else {
//       return NextResponse.json({ error: "Please Add OrgID" }, { status: 500 });
//     }

//     if (name) {
//       query[logicOperator].push({
//         name: {
//           $regex: name,
//           $options: "i",
//         },
//       });
//     }

//     // Handle skills with $and
//     if (skills && skills.length > 0) {
//       const skillsConditions = skills.map((skill: string) => ({
//         skills: {
//           $regex: skill.trim(),
//           $options: "i",
//         },
//       }));

//       query[logicOperator].push({ $or: skillsConditions });
//     }

//     if (location) {
//       query[logicOperator].push({
//         location: {
//           $regex: location.trim(),
//           $options: "i",
//         },
//       });
//     }

//     // Handle CTC ranges
//     if (minExpectedCTC || maxExpectedCTC) {
//       const expectedCTCQuery: { $gte?: number; $lte?: number } = {};
//       if (minExpectedCTC) expectedCTCQuery.$gte = parseFloat(minExpectedCTC);
//       if (maxExpectedCTC) expectedCTCQuery.$lte = parseFloat(maxExpectedCTC);
//       query[logicOperator].push({ expectedCTC: expectedCTCQuery });
//     }

//     if (minCurrentCTC || maxCurrentCTC) {
//       const currentCTCQuery: { $gte?: number; $lte?: number } = {};
//       if (minCurrentCTC) currentCTCQuery.$gte = parseFloat(minCurrentCTC);
//       if (maxCurrentCTC) currentCTCQuery.$lte = parseFloat(maxCurrentCTC);
//       query[logicOperator].push({ currentCTC: currentCTCQuery });
//     }

//     // Handle experience ranges
//     if (minExperience || maxExperience) {
//       const experienceQuery: { $gte?: number; $lte?: number } = {};
//       if (minExperience) experienceQuery.$gte = parseFloat(minExperience);
//       if (maxExperience) experienceQuery.$lte = parseFloat(maxExperience);
//       query[logicOperator].push({ experience: experienceQuery });
//     }

//     if (createdAfter || createdBefore) {
//       const dateQuery: { $gte?: Date; $lte?: Date } = {};
//       if (createdAfter) dateQuery.$gte = new Date(createdAfter);
//       if (createdBefore) dateQuery.$lte = new Date(createdBefore);
//       query[logicOperator].push({ "tracking.createdAt": dateQuery });
//     }

//     if (!Candidate) {
//       throw new Error("Candidate model is not available");
//     }

//     const candidates_WO_history = await Candidate.find(query)
//       .sort({ "tracking.createdAt": -1 })
//       .populate("remarks.userId", "name email")
//       .populate([
//         {
//           path: "assignment.interviewerId",
//           select: "_id name email",
//         },
//         {
//           path: "jobId",
//           select: "title description ",
//         },
//       ])
//       .lean();

//     if (!History) return;

//     const candidates = await Promise.all(
//       candidates_WO_history.map(async (candidate) => {
//         if (
//           !candidate.jobId ||
//           typeof candidate.jobId !== "object" ||
//           !("_id" in candidate.jobId)
//         ) {
//           return candidate;
//         }

//         const history = await History?.findOne({
//           jobId: (candidate.jobId as { _id: string })._id.toString(),
//           candidateId: candidate._id.toString(),
//         })
//           .populate("history.currentInterviewer", "_id name email")
//           .populate("history.previousInterviewer", "_id name email")
//           .populate("history.assignmentBy", "_id name email")
//           .populate("history.note.userId", "_id name email")
//           .lean();

//         return {
//           ...candidate,
//           history: history ? history.history : [],
//         };
//       })
//     );

//     const totalCount = candidates.length || 0;

//     return NextResponse.json({
//       candidates,
//       pagination: {
//         total: totalCount,
//       },
//     });
//   } catch (error: unknown) {
//     if (error instanceof Error) {
//       return NextResponse.json({ error: error.message }, { status: 500 });
//     }
//     return NextResponse.json(
//       { error: "An unknown error occurred" },
//       { status: 500 }
//     );
//   }
// }

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
      Object.entries(customFields).forEach(([key, value]) => {
        const fieldPath = `customFields.${key}`;
        
        if (typeof value === "string" && value.trim() !== "") {
          query[logicOperator].push({
            [fieldPath]: {
              $regex: value,
              $options: "i", // case-insensitive
            },
          });
        } else if (Array.isArray(value) && value.length > 0) {
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
      });
    }

   console.log('query :>> ', query);
    
    if (!Candidate) {
      throw new Error("Candidate model is not available");
    }
   
    const candidatesResult = await Candidate.aggregate([
      { $match: query },
      { $sort: { "tracking.createdAt": -1 } },
    
      // 🧠 Use $facet to run two pipelines: paginated data and total count
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
                pipeline: [/* your full pipeline for histories */],
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
                customFields:1,
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
          totalCount: [
            { $count: "count" }
          ],
        },
      },
    ]);
    
    
    // const candidates = await Candidate.aggregate([
    //   { $match: query },
    //   { $sort: { "tracking.createdAt": -1 } },
    //   {
    //     $lookup: {
    //       from: "users",
    //       localField: "remarks.userId",
    //       foreignField: "_id",
    //       as: "remarksUser",
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "users",
    //       localField: "assignment.interviewerId",
    //       foreignField: "_id",
    //       as: "interviewer",
    //     },
    //   },
    //   { 
    //     $unwind: { 
    //       path: "$interviewer",
    //       preserveNullAndEmptyArrays: true 
    //     } 
    //   },
    //   {
    //     $lookup: {
    //       from: "jobs",
    //       localField: "jobId",
    //       foreignField: "_id",
    //       as: "job",
    //     },
    //   },
    //   { 
    //     $unwind: { 
    //       path: "$job",
    //       preserveNullAndEmptyArrays: true
    //     } 
    //   },
    //   {
    //     $lookup: {
    //       from: "histories",
    //       let: {
    //         jobId: { $toString: "$jobId" },
    //         candidateId: { $toString: "$_id" },
    //       },
    //       pipeline: [
    //         {
    //           $match: {
    //             $expr: {
    //               $and: [
    //                 { $eq: ["$jobId", "$$jobId"] },
    //                 { $eq: ["$candidateId", "$$candidateId"] },
    //               ],
    //             },
    //           },
    //         },
    //         {
    //           $unwind: {
    //             path: "$history",
    //             preserveNullAndEmptyArrays: true,
    //           },
    //         },
    //         {
    //           $lookup: {
    //             from: "users",
    //             localField: "history.currentInterviewer",
    //             foreignField: "_id",
    //             as: "history.currentInterviewer",
    //           },
    //         },
    //         {
    //           $addFields: {
    //             "history.currentInterviewer": {
    //               $cond: {
    //                 if: {
    //                   $or: [
    //                     { $eq: ["$history.currentInterviewer", []] },
    //                     { $eq: ["$history.currentInterviewer", null] }
    //                   ]
    //                 },
    //                 then: null,
    //                 else: { $arrayElemAt: ["$history.currentInterviewer", 0] }
    //               }
    //             }
    //           }
    //         },
    //         {
    //           $lookup: {
    //             from: "users",
    //             localField: "history.previousInterviewer",
    //             foreignField: "_id",
    //             as: "history.previousInterviewer",
    //           },
    //         },
    //         {
    //           $addFields: {
    //             "history.previousInterviewer": {
    //               $cond: {
    //                 if: {
    //                   $or: [
    //                     { $eq: ["$history.previousInterviewer", []] },
    //                     { $eq: ["$history.previousInterviewer", null] }
    //                   ]
    //                 },
    //                 then: null,
    //                 else: { $arrayElemAt: ["$history.previousInterviewer", 0] }
    //               }
    //             }
    //           }
    //         },
    //         {
    //           $lookup: {
    //             from: "users",
    //             localField: "history.assignmentBy",
    //             foreignField: "_id",
    //             as: "history.assignmentBy",
    //           },
    //         },
    //         {
    //           $addFields: {
    //             "history.assignmentBy": {
    //               $cond: {
    //                 if: {
    //                   $or: [
    //                     { $eq: ["$history.assignmentBy", []] },
    //                     { $eq: ["$history.assignmentBy", null] }
    //                   ]
    //                 },
    //                 then: null,
    //                 else: { $arrayElemAt: ["$history.assignmentBy", 0] }
    //               }
    //             }
    //           }
    //         },
    //         {
    //           $unwind: {
    //             path: "$history.note",
    //             preserveNullAndEmptyArrays: true, // <-- updated here
    //           },
    //         },
    //         {
    //           $addFields: {
    //             "history.noteUserId": "$history.note.userId"
    //           }
    //         },
    //         {
    //           $lookup: {
    //             from: "users",
    //             localField: "history.noteUserId",
    //             foreignField: "_id",
    //             as: "noteUser"
    //           }
    //         },
    //         {
    //           $addFields: {
    //             "history.note.user": {
    //               $cond: {
    //                 if: { $gt: [{ $size: "$noteUser" }, 0] },
    //                 then: { $arrayElemAt: ["$noteUser", 0] },
    //                 else: null
    //               }
    //             }
    //           }
    //         },
    //         {
    //           $group: {
    //             _id: "$_id",
    //             jobId: { $first: "$jobId" },
    //             candidateId: { $first: "$candidateId" },
    //             history: { 
    //               $push: {
    //                 $mergeObjects: [
    //                   "$history",
    //                   { title: "$history.title" } 
    //                 ]
    //               }
    //             },
    //           },
    //         },
    //       ],
    //       as: "history",
    //     },
    //   },
    
    //   {
    //     $project: {
    //       _id: 1,
    //       jobId: "$job",
    //       organizationId: 1,
    //       name: 1,
    //       location: 1,
    //       experience: 1,
    //       skills: 1,
    //       email: 1,
    //       scores: 1,
    //       status: 1,
    //       createdAt: 1,
    //       updatedAt: 1,
    //       remarksUser: 1,
    //       attachments: 1,
    //       currentCTC:1,
    //       expectedCTC:1,
    //       tracking:1,
    //       history: { $arrayElemAt: ["$history.history", 0] },
    //       assignment: {
    //         $mergeObjects: [
    //           "$assignment",
    //           {
    //             interviewerId: {
    //               _id: "$interviewer._id",
    //               name: "$interviewer.name",
    //               email: "$interviewer.email",
    //             },
    //           },
    //         ],
    //       },
    //     },
    //   },
    // ]);
    
  

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
