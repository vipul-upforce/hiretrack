import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { Organization, Settings } from "@/lib/mongodb";
import { validateQueryParams, MAX_LENGTHS } from "@/lib/inputValidation";

export async function GET(req: NextRequest) {
  try {
    // SECURITY FIX: Validate query parameters
    const validation = validateQueryParams(req.nextUrl.searchParams, {
      limit: {
        type: "number",
        min: 1,
        max: 100,
      },
      search: {
        type: "string",
        maxLength: MAX_LENGTHS.mediumText,
        sanitize: true,
      },
    });

    if (!validation.isValid) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: validation.errors },
        { status: 400 }
      );
    }

    await connectToDatabase();

    if (!Organization || !Settings) {
      return NextResponse.json(
        { error: "Database models not found" },
        { status: 500 }
      );
    }

    // Get all organizations
    const organizations = await Organization.find({}, { _id: 1, name: 1 });

    if (!organizations || organizations.length === 0) {
      return NextResponse.json({
        portals: [],
      });
    }

    // Get portal configurations for each organization
    const portalList = await Promise.all(
      organizations.map(async (org) => {
        const settings = await Settings.findOne(
          { organizationId: org._id.toString() },
          { "portalConfigs.portalName": 1 }
        );

        return {
          id: org._id.toString(),
          name:
            settings?.portalConfigs?.portalName || org.name || "Unnamed Portal",
        };
      })
    );

    return NextResponse.json({
      portals: portalList,
    });
  } catch (error) {
    console.error("Orgs API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
