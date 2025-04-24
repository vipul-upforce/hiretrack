import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { User } from "@/lib/mongodb";
import { Candidate } from "@/lib/mongodb";
import { handleCustomFieldFiles } from "@/lib/fileUtils";
import { handleSingleFile } from "@/lib/fileUtils";
import { handleFileAttachments } from "@/lib/fileUtils";
import { Attachment } from "../route";
import { History } from "@/lib/mongodb"; // Import History model
import { ICandidate as IExternalCandidate } from "@/lib/models/candidate"; // Import existing ICandidate
import mongoose from "mongoose";
import { verifyAndDecryptToken } from "@/app/actions/auth";
import { sendMail } from "../../event-mail";
import { loadTemplate } from "@/lib/templateLoader";

interface UpdateObject {
  $set: Record<string, unknown>;
  $currentDate: { "tracking.updatedAt": boolean };
  $unset?: Record<string, number>;
}

interface IFJob {
  _id: mongoose.Schema.Types.ObjectId;
  title: string;
  description: string;
}

type ICandidate = IExternalCandidate & {
  // Extend the existing ICandidate
  jobId?: IFJob | mongoose.Schema.Types.ObjectId | null; // Make jobId optional
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let fileStorage = "local";
  let organizationId;
  let userData;

  try {
    await connectToDatabase();
    const data = await request.json();

    const token = request.cookies.get("token");
    if (token?.value) {
      const decryptedResponse = await verifyAndDecryptToken(
        String(token?.value)
      );
      userData = decryptedResponse.user;
      if (decryptedResponse.success) {
        fileStorage = userData.fileStorage || "local";
        organizationId = userData.organizationId || "";
      }
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
        organizationId
      );
      data.attachments = [...f, ...i];
    }

    if (data.resume) {
      data.resume = await handleSingleFile(
        data.resume,
        fileStorage,
        organizationId
      );
    }

    if (data.customFields) {
      const cs = await handleCustomFieldFiles(
        data.customFields,
        fileStorage,
        organizationId
      );
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

    if (
      "remarks" in data &&
      Array.isArray(data.remarks) &&
      data.remarks.length > 0
    ) {
      const existingCandidate = await Candidate!.findById(id);
      const existingRemarks = existingCandidate?.remarks || [];

      if (data.remarks.length > existingRemarks.length) {
        updateObj.$set.remarks = data.remarks;
        const latestRemark = data.remarks[data.remarks.length - 1];

        if (organizationId && User && latestRemark?.description) {
          const users = await User.find({
            organizationId,
            role: { $in: ["hr", "admin"] },
            isDeleted: false || null,
          }).select("email");

          const emailList = users.map((user) => user.email);

          const remark_adder = userData?.name || "user";
          const remark_for = data.name;
          const remark = latestRemark.description.trim();
          const rating = latestRemark.rating || "None";

          if (emailList.length > 0 && remark !== "") {
            const emailContent = loadTemplate("remark-add", {
              remark_adder,
              remark_for,
              rating,
              remark,
            });

            sendMail(
              organizationId,
              emailList,
              `New Remark Added For ${remark_for}`,
              emailContent
            );
          }
        }
      } else {
        updateObj.$set.remarks = data.remarks;
      }
    }

    // Handle email separately
    if ("email" in data) {
      updateObj.$set.email = data.email;
    }

    // Handle other fields
    Object.entries(data).forEach(([key, value]) => {
      if (
        key !== "assignment" &&
        key !== "remarks" &&
        key !== "_id" &&
        key !== "tracking" &&
        key !== "email"
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

    const updatedCandidate = (await Candidate.findByIdAndUpdate(id, updateObj, {
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
          path: "jobId",
          select: "_id description title",
        },
      ])
      .lean()) as ICandidate | null;

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
        { error: "Candidate Model Not Found" },
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

    const candidate = await Candidate.findById(id);

    if (!candidate) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }

    // const deletedCandidate = await Candidate.findByIdAndUpdate(id, { isDeleted : });
    const deletedCandidate = await Candidate.findByIdAndUpdate(
      id,
      { isDeleted: !candidate.isDeleted },
      { new: true }
    );

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
