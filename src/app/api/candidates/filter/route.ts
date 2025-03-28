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

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    // Get query parameters
    const body = await request.json();
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
      logicOperator = "$or"  // Default to $or if not specified
    } = body;

    // Build query using the specified logic operator
    const query: Query = { [logicOperator]: [] };

    // Add organization filter if provided
    if (organizationId) {
      if (!query.$and) query.$and = [];
      query.$and.push({ organizationId: organizationId });
    }else{
      return NextResponse.json(
        { error: "Please Add OrgID" },
        { status: 500 }
      );
    }

    if (name) {
      query[logicOperator].push({
        name: {
          $regex: name,
          $options: "i",
        },
      });
    }

    // Handle skills with $and
    if (skills && skills.length > 0) {
      const skillsConditions = skills.map((skill : string) => ({
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

    // Handle experience ranges
    if (minExperience || maxExperience) {
      const experienceQuery: { $gte?: number; $lte?: number } = {};
      if (minExperience) experienceQuery.$gte = parseFloat(minExperience);
      if (maxExperience) experienceQuery.$lte = parseFloat(maxExperience);
      query[logicOperator].push({ experience: experienceQuery });
    }

    // Handle date ranges for tracking.createdAt
    if (createdAfter || createdBefore) {
      const dateQuery: { $gte?: Date; $lte?: Date } = {};
      if (createdAfter) dateQuery.$gte = new Date(createdAfter);
      if (createdBefore) dateQuery.$lte = new Date(createdBefore);
      query[logicOperator].push({ "tracking.createdAt": dateQuery });
    }

    // Execute query with pagination
    if (!Candidate) {
      throw new Error("Candidate model is not available");
    }
    
    const candidates_WO_history = await Candidate.find(query)
      .sort({ "tracking.createdAt": -1 })    
      .populate("remarks.userId", "name email")
      .populate([
        {
            path: "assignment.interviewerId",
            select: "_id name email",
          },
          {
            path: "jobId",
            select: "title description ",
          },
        ]).lean();

        if(!History) return;

        const candidates = await Promise.all(
          candidates_WO_history.map(async (candidate) => {
            if (!candidate.jobId || typeof candidate.jobId !== "object" || !("_id" in candidate.jobId)) {
              return candidate;
            }
        
            const history = await History?.findOne({
              jobId: (candidate.jobId as { _id: string })._id.toString(),
              candidateId: candidate._id.toString()
            })
              .populate("history.currentInterviewer", "_id name email")
              .populate("history.previousInterviewer", "_id name email") 
              .populate("history.assignmentBy", "_id name email")
              .populate("history.note.userId", "_id name email")
              .lean();
            
            return {
              ...candidate,
              history: history ? history.history : []
            };
          })
        );

    // Get total count for pagination
    const totalCount = candidates.length || 0;

    return NextResponse.json({
      candidates,
      pagination: {
        total: totalCount,
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
