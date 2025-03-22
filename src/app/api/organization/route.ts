import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { Organization } from "@/lib/mongodb";
import mongoose from "mongoose";

// Handle POST request
export async function POST(req: Request) {
  await connectToDatabase();

  try {
    const { name, adminId, lanes } = await req.json();
    const id = new mongoose.Types.ObjectId(adminId);
    if (!Organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 400 }
      );
    }
    const org = await Organization.create({
      name: name,
      adminId: id,
      lanes: lanes,
      customFields: {
        h3qmln24v: {
          fields: [],
          formName: "Job Position",
        },
        g2xh8hoe1: {
          fields: [],
          formName: "Candidate",
        },
      },
    });

    return NextResponse.json(
      {
        message: "Organization Created Successfully",
        organization: org,
        _id: org.id,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Unknown error occurred" },
      { status: 400 }
    );
  }
}

// Handle PUT request
export async function PUT(req: Request) {
  await connectToDatabase();

  try {
    const { orgId, lanes } = await req.json();
    if (!Organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 400 }
      );
    }
    const updatedOrg = await Organization.findByIdAndUpdate(
      orgId,
      { lanes },
      { new: true }
    );

    if (!updatedOrg) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedOrg, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Unknown error occurred" },
      { status: 400 }
    );
  }
}

// Handle unsupported methods
export function OPTIONS() {
  return NextResponse.json({ message: "Method Not Allowed" }, { status: 405 });
}
