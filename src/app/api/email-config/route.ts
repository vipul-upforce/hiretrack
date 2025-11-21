import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { Settings } from "@/lib/mongodb";
import { getAuthenticatedUser } from "@/app/actions/auth";

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
   const [user] = await Promise.all([
      getAuthenticatedUser(request),
      connectToDatabase(),
    ]);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Get organization settings
    const settings = await Settings!.findOne({
      organizationId: user.organizationId,
    }).select("mailConfig").lean().exec();
    if (!settings) {
      return NextResponse.json({
        fromEmail: "noreply@hiretrack.com",
        provider: "not_configured",
      });
    }

    // Determine the from email based on the configured provider
    const mailConfig = settings.mailConfig;
    let fromEmail = "noreply@hiretrack.com";
    let provider = "not_configured";

    if (mailConfig) {
      provider = mailConfig.mailProvider || "not_configured";

      switch (mailConfig.mailProvider) {
        case "smtp":
          fromEmail = mailConfig.smtp_from || fromEmail;
          break;
        case "resend":
          fromEmail = mailConfig.resend_from || fromEmail;
          break;
        case "brevo":
          fromEmail = mailConfig.brevo_from || fromEmail;
          break;
      }
    }

    return NextResponse.json({
      fromEmail,
      provider,
    });
  } catch (error: any) {
    console.error("Error fetching email config:", error);
    return NextResponse.json(
      {
        fromEmail: "noreply@hiretrack.com",
        provider: "error",
      },
      { status: 200 } // Return 200 with fallback values
    );
  }
}
