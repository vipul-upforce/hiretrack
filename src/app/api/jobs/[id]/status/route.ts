import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { Organization } from "@/lib/mongodb";
import { Job } from "@/lib/mongodb";
import { getAuthenticatedUser } from "@/app/actions/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const [user] = await Promise.all([
      getAuthenticatedUser(request, ["admin", "hr"]),
      connectToDatabase(),
    ]);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { status, openJobCardsOrder } = await request.json();
    const { id } = await params;
    if (!Job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const organizationId = user.organizationId;

    const [updatedJob] = await Promise.all([
      Job.findByIdAndUpdate(
        id,
        {
          status,
          updatedAt: new Date(),
        },
        { new: true }
      ),
      Organization.findByIdAndUpdate(organizationId, {
        $set: {
          openJobCards: openJobCardsOrder,
        },
      }),
    ]);

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
