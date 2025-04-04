import connectToDatabase, { Job } from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET() {
    try {
      await connectToDatabase();
      const organizationId = "67e69cb26dcd91d6424c5768";
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
  
      const jobs = await Job.find(
        {
          organizationId: organizationId,
          status: "open",
        },{
            customFields : 0,
            attachments:0,
            tracking:0,
            organizationId:0,
            links:0,
            status:0
        }
      ).sort({
        "tracking.createdAt": -1,
      });
      return NextResponse.json(jobs);
    } catch (error: unknown) {
      if (error instanceof Error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
  }
  