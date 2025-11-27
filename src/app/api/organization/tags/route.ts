import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { Organization } from "@/lib/mongodb";
import { getAuthenticatedUser } from "@/app/actions/auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const [user] = await Promise.all([
      getAuthenticatedUser(req, ["admin", "hr"]),
      connectToDatabase(),
    ]);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const orgId = searchParams?.get("organizationId");
    if (!orgId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 }
      );
    }
    if (!Organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 400 }
      );
    }
    const org = await Organization.findById(orgId).select("tags").lean().exec();
    if (!org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ tags: org.tags });
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
// export async function PUT(req: NextRequest) {
//   try {
//     const [user] = await Promise.all([
//       getAuthenticatedUser(req,["admin", "hr"]),
//       connectToDatabase(),
//     ]);
//     if (!user) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }
//     const { searchParams } = new URL(req.url);
//     const orgId = searchParams?.get("organizationId");
//     const tags = await req.json();

//     if (!orgId) {
//       return NextResponse.json(
//         { error: "organizationId is required" },
//         { status: 400 }
//       );
//     }

//     if (!Organization) {
//       return NextResponse.json(
//         { error: "database not connected" },
//         { status: 400 }
//       );
//     }
//     const org = await Organization.findById(orgId);
//     if (!org) {
//       return NextResponse.json(
//         { error: "Organization not found" },
//         { status: 400 }
//       );
//     }
//     org.tags = tags;
//     await org.save();
//     if (!org) {
//       return NextResponse.json(
//         { error: "Organization not found" },
//         { status: 404 }
//       );
//     }
//     return NextResponse.json({ tags: org.tags });
//   } catch (error: unknown) {
//     if (error instanceof Error) {
//       return NextResponse.json({ error: error.message }, { status: 400 });
//     }
//     return NextResponse.json(
//       { error: "Unknown error occurred" },
//       { status: 400 }
//     );
//   }
// }
export async function PUT(req: NextRequest) {
  try {
    const [user] = await Promise.all([
      getAuthenticatedUser(req, ["admin", "hr"]),
      connectToDatabase(),
    ]);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");
    const tags = await req.json();

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 }
      );
    }
    if (!tags) {
      return NextResponse.json({ error: "tags are required" }, { status: 400 });
    }

    const updated = await Organization.findByIdAndUpdate(
      organizationId,
      { $set: { tags } },
      { new: true }
    ).select("tags");

    if (!updated) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ tags: updated.tags });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error occurred";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
