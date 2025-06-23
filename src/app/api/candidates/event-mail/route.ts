import { NextRequest, NextResponse } from "next/server";
import { sendMail } from "@/app/api/event-mail";
import { Candidate, Organization, User } from "@/lib/mongodb"; // Add User import
import { ICandidate } from "@/lib/models/candidate";
import mongoose from "mongoose";
import { getFormattedDate } from "@/components/timezoneFormat/getFormattedTZ";
import { getMappedEmailTemplate } from "@/app/actions/getMappedEmailTemplate";

export async function POST(req: NextRequest) {
  try {
    const { candidateId } = await req.json();
    if (!Candidate || !User) {
      throw new Error("Database not connected");
    }

    // Get candidate data
    const candidateData = await Candidate.findOne({
      _id: candidateId,
    }).populate({
      path: "jobId",
      select: "title",
    });

    // console.log("############# candidateData: ", candidateData);

    if (!candidateData || !Organization) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }

    const { name, email } = candidateData as ICandidate;
    const organizationId = candidateData.organizationId;

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is missing." },
        { status: 400 }
      );
    }
    const orgData = await Organization.findById(organizationId);
    let orgName = "";
    if (orgData) {
      orgName = orgData.name;
    }

    // Get job information
    const jobName =
      (typeof candidateData.jobId === "object" &&
        "title" in candidateData.jobId &&
        (candidateData.jobId?.title as string)) ||
      "Not specified";
    const candidateName = name;
    const status = "Applied";

    // Prepare candidate email content
    const eventTitle = "Application Successful";

    if (!email || !eventTitle) {
      return NextResponse.json(
        { error: "Email and event title are required." },
        { status: 400 }
      );
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format." },
        { status: 400 }
      );
    }

    // const candidateHtmlContent = loadTemplate("job-application-(candidate)", {
    //   orgName,
    //   eventTitle,
    //   name,
    //   jobName,
    //   candidateName,
    //   status,
    // });

    // Find all HR users in the organization
    const hrUsers = await User.find({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      role: { $in: ["hr", "admin"] },
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
    })
      .select("email")
      .lean();

    const hrEmails: string[] = [];
    hrUsers?.map((user) => {
      hrEmails.push(user.email);
    });

    const applicationDate = (await getFormattedDate(
      req,
      new Date(),
      false,
      organizationId
    )) as string;

    // console.log("⛔⛔⛔ APLPICTION DATE: ", applicationDate);
    // Prepare HR notification email content
    const hrNotificationTitle = `${candidateName} applied for ${jobName}`;
    const candidateDetails = `${req.headers.get("Origin")}/candidate/${candidateId}`;
    const {emailContent, emailSubject} = await getMappedEmailTemplate("job-application-(hr)", {
      orgName,
      hrNotificationTitle,
      status,
      email,
      candidateName,
      jobName,
      applicationDate,
      candidateDetails,
    }, organizationId);

    const candidateAndHr = [email, ...hrEmails];

    const candidateEmailStatus = await sendMail(
      organizationId,
      candidateAndHr,
      emailSubject,
      emailContent
    );

    // Prepare response
    if (candidateEmailStatus.status === 200) {
      return NextResponse.json({ message: "Email sent successfully" });
    } else {
      return NextResponse.json(
        {
          error: candidateEmailStatus.message,
        },
        { status: candidateEmailStatus.status }
      );
    }
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unknown Error Occurred",
      },
      { status: 500 }
    );
  }
}
