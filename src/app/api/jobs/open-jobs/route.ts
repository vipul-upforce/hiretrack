import { auth } from "@/lib/auth";
import connectToDatabase, { Job, Organization } from "@/lib/mongodb";
import { NextResponse } from "next/server";

interface CustomField {
  label: string;
  private?: boolean;
}

export async function GET() {
  try {
    await connectToDatabase();
    const session = await auth();
    const organizationId = session?.user.organizationId;
    if (!Job) {
      return NextResponse.json(
        { error: "Job or Candidate not found" },
        { status: 404 }
      );
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID not found" },
        { status: 404 }
      );
    }

    const customFields = await Organization?.findById(organizationId);

    const jobs = await Job.find(
      {
        organizationId: organizationId,
        status: "open",
      },
      {
        attachments: 0,
        tracking: 0,
        organizationId: 0,
        links: 0,
        status: 0,
      }
    )
      .sort({
        "tracking.createdAt": -1,
      })
      .lean();

    // Get the job position fields
    const jobPositionFields =
      Object.values(customFields?.customFields || {}).find(
        (field) => field.formName === "Job Position"
      )?.fields || [];

    // Filter out private fields
    const publicFieldLabels = jobPositionFields
      .filter((field: CustomField) => !field.private)
      .map((data: CustomField) => data.label);

    // Eliminate custom fields from jobs that are not in public fields
    const filteredJobs = jobs.map((job) => ({
      ...job,
      customFields: Object.fromEntries(
        Object.entries(job.customFields).filter(([key]) =>
          publicFieldLabels.includes(key)
        )
      ),
    }));

    return NextResponse.json(filteredJobs);
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
}
