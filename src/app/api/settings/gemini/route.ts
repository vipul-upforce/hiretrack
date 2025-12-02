import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { Settings } from "@/lib/mongodb";
import { getAuthenticatedUser } from "@/app/actions/auth";

export async function GET(req: NextRequest) {
  try {
    const [userData] = await Promise.all([
      getAuthenticatedUser(req, "admin"),
      connectToDatabase(),
    ]);
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!Settings) {
      return NextResponse.json(
        { error: "Settings Model Not Found" },
        { status: 404 }
      );
    }
    const settings = await Settings.findOne({
      organizationId: userData.organizationId,
    })
      .select("gemini")
      .lean()
      .exec();

    if (!settings) {
      return NextResponse.json(
        { error: "Settings not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ gemini: settings.gemini });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const [userData, geminiSetting] = await Promise.all([
      getAuthenticatedUser(req, "admin"),
      req.json(),
      connectToDatabase(),
    ]);
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const organizationId = userData.organizationId || "";

    if (!Settings) {
      return NextResponse.json(
        { error: "Settings Model Not Found" },
        { status: 404 }
      );
    }

    const updatedUser = await Settings.findOneAndUpdate(
      {
        // organizationId: userData.organizationId,
        organizationId: organizationId,
      },
      { gemini: geminiSetting },
      {
        new: true,
        runValidators: true,
        upsert: true,
      }
    );

    if (!updatedUser) {
      return NextResponse.json(
        { error: "Settings not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Settings updated successfully" });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
