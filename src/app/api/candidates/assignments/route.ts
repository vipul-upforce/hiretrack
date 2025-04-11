// @ts-nocheck

import { NextResponse, NextRequest } from "next/server";
import connectToDatabase, { History } from "@/lib/mongodb";
import { Candidate } from "@/lib/mongodb";
import { User } from "@/lib/mongodb";
import { Job } from "@/lib/mongodb";
import { verifyAndDecryptToken } from "@/app/actions/auth";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const token = req.cookies.get("token");
    if (token?.value) {
      const decryptedResponse = await verifyAndDecryptToken(
        String(token?.value)
      );
      const userData = decryptedResponse.user;
      if (decryptedResponse.success) {
        const query = {
          "assignment.interviewerId":
            userData?.role === "interviewer" ? userData?.id : { $exists: true },
        };
        if (!Candidate || !User || !Job) {
          return NextResponse.json(
            { error: "Candidate, User, or Job not found" },
            { status: 400 }
          );
        }
        const projection =
          userData?.role === "interviewer"
            ? {
                currentCTC: 0,
                expectedCTC: 0,
                customFields: 0,
              }
            : {};
        const candidates = await Candidate.find(query, projection).populate([
          {
            path: "assignment.interviewerId",
            model: User,
            select: "_id name email",
          },
          {
            path: "remarks.userId",
            model: User,
            select: "_id name email",
          },
          {
            path: "jobId",
            model: Job,
            select: "_id title skills description organizationId",
          },
        ]);
        const filteredCandidates = candidates.filter(
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
              history: history ? history.history : [],
            };
          })
        );
        return NextResponse.json(candidatesWithHistory);
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
