import connectToDatabase, { Job, Organization } from "@/lib/mongodb";
import { NextResponse } from "next/server";

interface CustomField {
  label: string;
  private?: boolean;
}

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    // Extract orgname from the query parameters
    const url = new URL(request.url);
    const orgName = url.searchParams.get("orgname");

    if (!orgName) {
      return NextResponse.json(
        { error: "Organization name not provided" },
        { status: 400 }
      );
    }

    if (!Organization) {
      return NextResponse.json(
        { error: "Organization Model not Found" },
        { status: 404 }
      );
    }

    // Find the organization ID based on the orgName
    const organization = await Organization.findOne({ name: orgName });
    const organizationId = organization?._id;

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    if (!Job) {
      return NextResponse.json(
        { error: "Job Model not Found" },
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
      ?.filter((field: CustomField) => !field.private)
      ?.map((data: CustomField) => data.label);

    // Eliminate custom fields from jobs that are not in public fields
    const filteredJobs = jobs?.map((job) => ({
      ...job,
      customFields: Object.fromEntries(
        job.customFields
          ? Object.entries(job.customFields).filter(([key]) =>
              publicFieldLabels.includes(key)
            )
          : []
      ),
    }));

    return NextResponse.json(filteredJobs);
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
}
