import connectToDatabase, { Job, Organization } from "@/lib/mongodb";
import { NextResponse } from "next/server";

interface CustomField {
  label: string;
  private?: boolean;
}

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const url = new URL(request.url);
    const orgName = url.searchParams.get("o");
    const title = url.searchParams.get("title");

    if (!Organization && !Job) {
      return NextResponse.json(
        { error: "DB Model not Found" },
        { status: 404 }
      );
    }

    let organizationId;

    if (orgName !== "") {
      const organization = await Organization!.findOne({ name: orgName });
      organizationId = organization?._id;

      if (!organizationId) {
        return NextResponse.json(
          { error: "Organization not found" },
          { status: 404 }
        );
      }
    } else {
      const organization = await Organization!.findOne().sort({ _id: 1 });
      organizationId = organization?._id;

      if (!organizationId) {
        return NextResponse.json(
          { error: "No organizations found" },
          { status: 404 }
        );
      }
    }
    console.log("ORG⛔⛔: ", organizationId);

    const customFields = await Organization?.findById(organizationId);
    const jobs = await Job!
      .find(
        {
          organizationId: organizationId,
          status: "open",
          ...(title && {
            title: {
              $regex: title,
              $options: "i",
            },
          }),
          $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
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

    console.log("########### PUBLICJOBS: ", jobs);
    const jobPositionFields =
      Object.values(customFields?.customFields || {}).find(
        (field) => field.formName === "Job Position"
      )?.fields || [];

    const publicFieldLabels = jobPositionFields
      ?.filter((field: CustomField) => !field.private)
      ?.map((data: CustomField) => data.label);

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
