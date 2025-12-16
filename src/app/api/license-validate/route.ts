import { NextRequest, NextResponse } from 'next/server';
import { validateLicense } from '@/lib/licenseUtils';
import { licenseValidateRateLimiter } from '@/lib/rateLimiter';

async function handleLicenseValidation() {
  try {
    const result = await validateLicense();

    if (result.valid) {
      return NextResponse.json({
        valid: true,
      });
    }

    return NextResponse.json(
      {
        valid: false,
        error: result.error || 'License validation failed',
        hasLicenseFile: result.hasLicenseFile,
        apiError: result.apiError,
      },
      { status: 403 },
    );
  } catch {
    return NextResponse.json(
      {
        valid: false,
        error: 'Internal server error during license validation',
        hasLicenseFile: false,
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return licenseValidateRateLimiter(request, handleLicenseValidation);
}
