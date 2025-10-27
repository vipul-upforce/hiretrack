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
    const orgId = req.cookies.get("org_id")?.value;
    if (token?.value) {
      const decryptedResponse = await verifyAndDecryptToken(
        String(token?.value),
        orgId
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

    if (!settings) {
      return NextResponse.json({
        smtp_host: "",
        smtp_port: "",
        smtp_user: "",
        smtp_password: "",
        smtp_from: "",
        mailProvider: "",
        resend_api_key: "",
        resend_from: "",
        resend_reply_to: "",
      });
    }

    return NextResponse.json(settings.mailConfig);
  } catch {
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
    const orgId = req.cookies.get("org_id")?.value;
    if (token?.value) {
      const decryptedResponse = await verifyAndDecryptToken(
        String(token?.value),
        orgId
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

    const mailConfig = await req.json();

    let mailConfigObj;

    if (mailConfig.mailProvider === "smtp") {
      mailConfigObj = {
        smtp_user: mailConfig.smtp_user,
        smtp_password: mailConfig.smtp_password,
        smtp_host: mailConfig.smtp_host,
        smtp_port: mailConfig.smtp_port,
        smtp_from: mailConfig.smtp_from,
        mailProvider: mailConfig.mailProvider,
      };
    } else if (mailConfig.mailProvider === "resend") {
      mailConfigObj = {
        mailProvider: mailConfig.mailProvider,
        resend_api_key: mailConfig.resend_api_key,
        resend_from: mailConfig.resend_from,
        resend_reply_to: mailConfig.resend_reply_to,
      };
    } else if (mailConfig.mailProvider === "brevo") {
      mailConfigObj = {
        mailProvider: mailConfig.mailProvider,
        brevo_api_key: mailConfig.brevo_api_key,
        brevo_from: mailConfig.brevo_from,
        brevo_reply_to: mailConfig.brevo_reply_to,
      };
    }

    const updatedUser = await Settings.findOneAndUpdate(
      {
        organizationId: userData.organizationId,
      },
      { mailConfig: mailConfigObj },
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
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
