import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { Settings } from "@/lib/mongodb";
import { getAuthenticatedUser } from "@/app/actions/auth";

export async function GET(req: NextRequest) {
  try {
    const [userData] = await Promise.all([
      getAuthenticatedUser(req, ["admin", "hr"]),
      connectToDatabase(),
    ]);
    if (!userData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const organizationId = userData.organizationId;

    if (!Settings) {
      return NextResponse.json(
        { error: "Settings Model Not Found" },
        { status: 404 }
      );
    }

    const settings = await Settings.findOne({ organizationId: organizationId }).select("emailTemplates").lean().exec();

    if (!settings || !settings.emailTemplates) {
      return NextResponse.json({
        templates: {},
      });
    }

    // Convert Map to Object if using Map in schema
    const emailTemplates =
      settings.emailTemplates instanceof Map
        ? Object.fromEntries(settings.emailTemplates)
        : settings.emailTemplates;

    return NextResponse.json({ templates: emailTemplates });
  } catch (error) {
    console.error("Error fetching email templates:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const [userData, templates] = await Promise.all([
      getAuthenticatedUser(req, "admin"),
      req.json(),
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

    // console.log("Request body:", JSON.stringify(body, null, 2));


    if (!templates || typeof templates !== "object") {
      return NextResponse.json(
        { error: "Invalid templates data structure" },
        { status: 400 }
      );
    }

    for (const [templateId, template] of Object.entries(templates)) {
      const temp = template as any;
      if (
        !temp.templateId ||
        !temp.templateName ||
        !temp.subject ||
        !temp.html
      ) {
        return NextResponse.json(
          { error: `Invalid template structure for ${templateId}` },
          { status: 400 }
        );
      }

      // Ensure variables field exists, use simplified variables for custom templates
      if (!temp.variables) {
        temp.variables = ["SenderName", "ReceiverName", "PortalName"];
      }
    }

    // console.log("Templates to save:", JSON.stringify(templates, null, 2));

    const updatedSettings = await Settings.findOneAndUpdate(
      { organizationId: userData.organizationId },
      {
        $set: {
          emailTemplates: templates,
        },
      },
      {
        new: true,
        runValidators: true,
        upsert: true,
        strict: false, // Allow fields not in schema temporarily
        select: "emailTemplates",
      }
    );

    if (!updatedSettings) {
      return NextResponse.json(
        { error: "Failed to update settings" },
        { status: 500 }
      );
    }

    console.log(
      "Updated settings email templates:",
      updatedSettings.emailTemplates
    );

    return NextResponse.json({
      message: "Email templates updated successfully",
      templates: updatedSettings.emailTemplates,
    });
  } catch (error) {
    console.error("Error updating email templates:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error },
      { status: 500 }
    );
  }
}
