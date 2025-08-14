import { NextRequest, NextResponse } from "next/server";
import connectToDatabase, { Settings } from "@/lib/mongodb";
import { verifyAndDecryptJWTToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const token = request.cookies.get("auth_token");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decryptedResponse = await verifyAndDecryptJWTToken(token.value);
    if (!decryptedResponse.success || !decryptedResponse.user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const user = decryptedResponse.user;

    // Connect to database
    await connectToDatabase();

    // Get organization settings
    const settings = await Settings!.findOne({ organizationId: user.organizationId });
    if (!settings) {
      return NextResponse.json({ 
        fromEmail: "noreply@hiretrack.com",
        provider: "not_configured"
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
        provider: "error"
      },
      { status: 200 } // Return 200 with fallback values
    );
  }
}