import { NextRequest, NextResponse } from "next/server";
import dbConnect, { Organization, Settings } from "@/lib/mongodb";
import { verifyAndDecryptToken } from "@/app/actions/auth";
import { decryptProviderKeys, encryptProviderKeys } from "@/lib/encryption";
import {
  MAX_LENGTHS,
  validateQueryParams,
  VALIDATION_PATTERNS,
} from "@/lib/inputValidation";
import connectToDatabase from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  try {
    // // SECURITY FIX: Validate query parameters
    const validation = validateQueryParams(req.nextUrl.searchParams, {
      org: {
        type: "string",
        maxLength: MAX_LENGTHS.shortText,
        pattern: VALIDATION_PATTERNS.safeString,
      },
      subdomain: {
        type: "string",
        maxLength: MAX_LENGTHS.shortText,
        pattern: VALIDATION_PATTERNS.slug,
      },
    });

    if (!validation.isValid) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: validation.errors },
        { status: 400 }
      );
    }
    await connectToDatabase();

    // Give models a moment to initialize if they haven't already
    let retries = 0;
    while ((!Settings || !Organization) && retries < 5) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      retries++;
    }

    if (!Settings || !Organization) {
      console.log("Database models not initialized");

      return NextResponse.json(
        { error: "Database models not initialized" },
        { status: 500 }
      );
    }
    console.log(Settings, "Settings");
    console.log(Organization, "Organization");

    let organizationId = "";
    let isAuthenticated = false;

    // Try to get organization from auth token
    const token = req.cookies.get("auth_token");
    const orgId = req.cookies.get("org_id")?.value;
    if (token?.value) {
      try {
        const decryptedResponse = await verifyAndDecryptToken(
          String(token?.value),
          orgId
        );
        const userData = decryptedResponse.user;
        if (decryptedResponse.success) {
          organizationId = userData.organizationId || "";
          isAuthenticated = true;
        }
      } catch (error) {
        // Token verification failed, continue as anonymous user
        console.log("Token verification failed, serving as anonymous user");
      }
    }
    console.log(isAuthenticated, "isAuthenticated");
    console.log(organizationId, "organizationId");

    let settings = null;

    if (organizationId) {
      // Authenticated user - get specific organization settings
      settings = await Settings.findOne(
        { organizationId: organizationId },
        { captcha: 1 }
      );
      console.log(settings, "settings");
    } else {
      // Anonymous user - try orgId from query or default organization

      // Fallback to default organization
      const defaultOrg = await Organization.findOne({}).sort({
        createdAt: 1,
      });
      console.log(defaultOrg, "defaultOrg");

      if (defaultOrg) {
        settings = await Settings.findOne(
          { organizationId: defaultOrg._id.toString() },
          { captcha: 1 }
        );
      }
    }

    if (!settings) {
      return NextResponse.json(
        { error: "CAPTCHA settings not found" },
        { status: 404 }
      );
    }

    // Decrypt the CAPTCHA keys before returning
    // const decryptedSettings = decryptProviderKeys(settings.toObject());
    // console.log(decryptedSettings, "decryptedSettings");

    return NextResponse.json({ captcha: settings.captcha });
    // return NextResponse.json({ captcha: decryptedSettings.captcha });
  } catch (error) {
    console.error("CAPTCHA API error:", error);
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
    await dbConnect();
    const token = req.cookies.get("auth_token");
    const orgId = req.cookies.get("org_id")?.value;
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization ID missing" },
        { status: 400 }
      );
    }

    const { enableCaptcha, siteKey, secretKey } = await req.json();

    if (enableCaptcha && (!siteKey || !secretKey)) {
      return NextResponse.json(
        {
          error:
            "Both site key and secret key are required when enabling CAPTCHA",
        },
        { status: 400 }
      );
    }

    // Encrypt before saving
    const encryptedCaptcha = encryptProviderKeys(
      {
        captcha: {
          enableCaptcha: enableCaptcha || false,
          siteKey: siteKey || "",
          secretKey: secretKey || "",
        },
      },
      orgId
    ).captcha;

    const updatedSettings = await Settings.findOneAndUpdate(
      { organizationId: orgId },
      { captcha: encryptedCaptcha },
      { new: true, runValidators: true, upsert: true }
    );

    if (!updatedSettings) {
      return NextResponse.json(
        { error: "Settings not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "CAPTCHA settings updated successfully",
    });
  } catch (error) {
    console.error("CAPTCHA API error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
