import { NextRequest, NextResponse } from "next/server";
import { licenseValidateRateLimiter } from "@/lib/rateLimiter";
import {
  validateAndUpdateLicense,
  generateMachineCode,
  readLicenseData,
  validateLicenseWithAPI,
} from "@/lib/licenseUtils";

async function handleLicenseValidation(request: NextRequest) {
  try {
    const licenseData = readLicenseData();

    if (!licenseData) {
      return NextResponse.json({
        valid: false,
        error:
          "No license found. Please ensure license.json exists in the project root.",
        hasLicenseFile: false,
      });
    }

    const validationResult = await validateAndUpdateLicense();

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

async function handleForceLicenseValidation(request: NextRequest) {
  try {
    const licenseData = readLicenseData();

    if (!licenseData) {
      return NextResponse.json({
        valid: false,
        error:
          "No license found. Please ensure license.json exists in the project root.",
        hasLicenseFile: false,
      });
    }

    // Get current machine code
    const currentMachineCode = generateMachineCode();


    // Force validation with external API (using current machine code)
    const validationResult = await validateLicenseWithAPI(
      licenseData.licenseKey,
      currentMachineCode
    );

    if (validationResult.valid) {
      return NextResponse.json({
        valid: true,

        asset: validationResult.asset,
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

export async function POST(request: NextRequest) {
  return licenseValidateRateLimiter(request, handleForceLicenseValidation);
}
