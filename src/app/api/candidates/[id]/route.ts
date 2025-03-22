import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { Candidate } from "@/lib/mongodb";
import { handleCustomFieldFiles } from "@/lib/fileUtils";
import { handleSingleFile } from "@/lib/fileUtils";
import { handleFileAttachments } from "@/lib/fileUtils";
import { Attachment } from "../route";
import { History } from "@/lib/mongodb"; // Import History model
import { ICandidate } from "@/lib/models/candidate";

interface UpdateObject {
  $set: Record<string, unknown>;
  $currentDate: { "tracking.updatedAt": boolean };
  $unset?: Record<string, number>;
}

// import { Document } from "mongoose";

// export interface ICandidate extends Document {
//   _id: string;
//   name: string;
//   email: string;
//   assignment?: {
//     interviewerId: {
//       _id: string;
//       name: string;
//       email: string;
//     };
//     deadline?: Date;
//   };
//   remarks?: {
//     userId: {
//       name: string;
//       email: string;
//     };
//     text: string;
//   }[];
//   tracking?: {
//     updatedAt: Date;
//   };
//   attachments?: Attachment[];
// }


export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {

  let fileStorage = 'local';
  let organizationId;

  try {
    await connectToDatabase();
    const data = await request.json();
    try {
      const userCookie = request.cookies.get('user')?.value;
      if (userCookie) {
        const userData = JSON.parse(userCookie);
        fileStorage = userData.fileStorage || 'local';
        organizationId = userData.organizationId || "";
      }
    } catch {
      
    }
    const { id } = await params;

    if (data.attachments) {
      const images = data.attachments.filter((attachment: Attachment) =>
        attachment.type.startsWith("image")
      );
      const files = data.attachments.filter(
        (attachment: Attachment) => !attachment.type.startsWith("image")
      );

      data.attachments = {
        images: images || [],
        files: files || [],
      };
      const { files: f, images: i } = await handleFileAttachments(
        data.attachments,
        fileStorage,
        organizationId,
        request
      );
      data.attachments = [...f, ...i];
    }

    if (data.resume) {
      data.resume = await handleSingleFile(data.resume, fileStorage, organizationId, request);
    }

    if (data.customFields) {
      const cs = await handleCustomFieldFiles(data.customFields, fileStorage, organizationId, request);
      data.customFields = cs;
    }

    const updateObj: UpdateObject = {
      $set: {},
      $currentDate: { "tracking.updatedAt": true },
    };

    // Handle assignment separately
    if ("assignment" in data) {
      if (data.assignment === null) {
        updateObj.$unset = { assignment: 1 };
      } else {
        updateObj.$set.assignment = data.assignment;
      }
    }

    // Handle remarks separately
    if ("remarks" in data) {
      updateObj.$set.remarks = data.remarks;
    }

    // Handle other fields
    Object.entries(data).forEach(([key, value]) => {
      if (
        key !== "assignment" &&
        key !== "remarks" &&
        key !== "_id" &&
        key !== "tracking"
      ) {
        updateObj.$set[key] = value;
      }
    });

    if (!Candidate || !History) {
      return NextResponse.json(
        { error: "Database not connected" },
        { status: 404 }
      );
    }
    
    const updatedCandidate= await Candidate.findByIdAndUpdate(id, updateObj, {
      new: true,
      runValidators: true,
    })
      .populate([
        {
          path: "assignment.interviewerId",
          select: "_id name email",
        },
        {
          path: "remarks.userId",
          select: "name email",
        },
        {
          path:"jobId",
          select:"_id description"
        }
      ])
      .lean() as ICandidate | null

    if (!updatedCandidate) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(updatedCandidate);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    if (!Candidate) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }
    const candidate = await Candidate.findById(id).populate({
      path: "assignment.interviewerId",
      select: "_id name email",
    });

    if (!candidate) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(candidate);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    if (!Candidate) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }

    const deletedCandidate = await Candidate.findByIdAndDelete(id);

    if (!deletedCandidate) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Candidate deleted successfully" });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
}
