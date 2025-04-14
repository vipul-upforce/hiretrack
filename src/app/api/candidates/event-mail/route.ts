import { NextRequest, NextResponse } from "next/server";
import { sendMail } from "@/app/api/event-mail";
import { Candidate, Organization, User } from "@/lib/mongodb"; // Add User import
import { ICandidate } from "@/lib/models/candidate";
import fs from "fs";
import path from "path";

export function loadTemplate(
  templateName: string,
  variables: Record<string, string>
) {
  const templatePath = path.join(
    process.cwd(),
    "public",
    "templates",
    `${templateName}.html`
  );

  // console.log("########## PATH: ", templatePath);
  let content = fs.readFileSync(templatePath, "utf-8");

  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    content = content.replace(regex, value);
  }

  return content;
}

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
    let organizationId = candidateData.organizationId;

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

    const candidateHtmlContent = loadTemplate("job-application-(candidate)", {
      orgName,
      eventTitle,
      name,
      jobName,
      candidateName,
      status,
    });

    // Send email to candidate
    const candidateEmailStatus = await sendMail(
      organizationId,
      email,
      eventTitle,
      candidateHtmlContent
    );

    // Find all HR users in the organization
    const hrUsers = await User.find({
      organizationId: organizationId,
      role: { $in: ["hr"] },
    });

    // Prepare HR notification email content
    const hrNotificationTitle = "New Candidate Applied";
    const hrHtmlContent = loadTemplate("job-application-(hr)", {
      orgName,
      hrNotificationTitle,
      status,
      email,
      candidateName,
      jobName,
      applicationDate: new Date().toLocaleString(),
    });

    // Send emails to all HR personnel
    const hrEmailPromises = hrUsers.map((hrUser) => {
      if (hrUser.email && emailRegex.test(hrUser.email)) {
        return sendMail(
          organizationId,
          hrUser.email,
          hrNotificationTitle,
          hrHtmlContent
        );
      }
      // console.log(`Skipping invalid HR email: ${hrUser.email}`);
      return Promise.resolve({ status: 400, message: "Invalid HR email" });
    });

    // Wait for all HR emails to be sent
    const hrEmailResults = await Promise.allSettled(hrEmailPromises);
    const successfulHrEmails = hrEmailResults.filter(
      (result) => result.status === "fulfilled" && result.value.status === 200
    ).length;

    // Prepare response
    let message = "";
    if (candidateEmailStatus.status === 200) {
      message = "Email sent successfully to candidate.";
      if (successfulHrEmails > 0) {
        message += ` Notification sent to ${successfulHrEmails} HR personnel.`;
      }
      return NextResponse.json({ message });
    } else {
      return NextResponse.json(
        {
          error: candidateEmailStatus.message,
          hrNotifications: `${successfulHrEmails} HR notifications sent successfully.`,
        },
        { status: candidateEmailStatus.status }
      );
    }
  } catch (error: unknown) {
    console.error("Error sending emails:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unknown Error Occurred",
      },
      { status: 500 }
    );
  }
}
