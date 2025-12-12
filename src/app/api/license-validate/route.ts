// /app/api/license-validate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { licenseValidateRateLimiter } from "@/lib/rateLimiter";
import { validateLicense } from "@/lib/licenseUtils";

async function handleLicenseValidation() {
  try {
    const validationResult = await validateLicense();

    if (validationResult.valid) {
      return NextResponse.json({
        valid: true,
      });
    } else {
      return NextResponse.json({
        valid: false,
        error: validationResult.error || "License validation failed",
        hasLicenseFile: true,
        apiError: true,
      });
    }
  } catch (error) {
    console.error("License validation error:", error);
    return NextResponse.json(
      {
        valid: false,
        error: "Internal server error during license validation",
        hasLicenseFile: false,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return licenseValidateRateLimiter(request, handleLicenseValidation);
}
