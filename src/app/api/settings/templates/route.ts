import { NextRequest, NextResponse } from "next/server";
import dbConnect, { Settings } from "@/lib/mongodb";
import { verifyAndDecryptToken } from "@/app/actions/auth";

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    let organizationId;
    let role;
    let userData;
    const token = req.cookies.get("auth_token");
    if (token?.value) {
      const decryptedResponse = await verifyAndDecryptToken(
        String(token?.value)
      );
      userData = decryptedResponse.user;
      if (decryptedResponse.success) {
        organizationId = userData.organizationId;
        role = userData.role;
      }
    }

    if (!userData || role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!Settings) {
      return NextResponse.json(
        { error: "Settings Model Not Found" },
        { status: 404 }
      );
    }

    const settings = await Settings.findOne({ organizationId: organizationId });

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
    await dbConnect();
    let userData;
    const token = req.cookies.get("auth_token");
    if (token?.value) {
      const decryptedResponse = await verifyAndDecryptToken(
        String(token?.value)
      );
      if (decryptedResponse.success) {
        userData = decryptedResponse.user;
      }
    }

    if (!userData || userData.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!Settings) {
      return NextResponse.json(
        { error: "Settings Model Not Found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    // console.log("Request body:", JSON.stringify(body, null, 2));

    const templates = body.templates || body;

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
