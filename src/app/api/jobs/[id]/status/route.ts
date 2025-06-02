import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { Organization } from "@/lib/mongodb";
import { Job } from "@/lib/mongodb";
import { auth } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { status, openJobCardsOrder } = await request.json();
    const { id } = await params;
    if (!Job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const userCookie = await auth(request);
    const organizationId = userCookie?.user.organizationId;

    await Organization?.findByIdAndUpdate(organizationId, {
      $set: {
        openJobCards: openJobCardsOrder,
      },
    });
    const updatedJob = await Job.findByIdAndUpdate(
      id,
      {
        status,
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!updatedJob) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json(updatedJob);
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
}
