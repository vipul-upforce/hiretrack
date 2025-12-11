import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { licenseValidateRateLimiter } from '@/lib/rateLimiter';
import { execSync } from 'child_process';
import { logger } from '@/lib/logger/logger.server';
// Common variable for license.json path (in project root).,
const LICENSE_PATH = path.join(process.cwd(), '..', 'license.json');

interface LicenseData {
  licenseKey: string;
  machineCode: string;
  email: string;
  lastValidated: number;
  isValid: boolean;
}

interface LicenseValidationResponse {
  valid: boolean;
  asset?: string;
  error?: string;
}

export function generateMachineCode(): string {
  try {
    const osType = process.platform;
    let id: string;

    if (osType === 'linux') {
      // On Linux, reads from /etc/machine-id
      id = execSync('cat /etc/machine-id').toString().trim();
    } else if (osType === 'darwin') {
      // On macOS, executes: hostname | shasum -a 256 | awk '{print $1}'
      // This:
      // 1. Gets the hostname,
      // 2. Computes its SHA256 hash (using shasum -a 256),
      // 3. Extracts the first part (digest) using awk.
      id = execSync(
        "system_profiler SPHardwareDataType | awk '/Hardware UUID/ { print $3; }'",
      )
        .toString()
        .trim();
    } else if (osType === 'win32') {
      // On Windows, retrieves the system UUID using PowerShell
      id = execSync(
        'powershell -Command "(Get-CimInstance -ClassName Win32_ComputerSystemProduct).UUID"',
      )
        .toString()
        .trim();
      if (!id || id === 'Not Available') {
        throw new Error('Machine UUID not available');
      }
    } else {
      throw new Error(`Unsupported OS: ${osType}`);
    }

    return id;
  } catch (err) {
    logger.error({ err }, 'Error generating machine code.');
    return 'unknown-machine-id';
  }
}

// Read license data from license.json file
function readLicenseData(): LicenseData | null {
  try {
    if (!fs.existsSync(LICENSE_PATH)) {
      return null;
    }

    const licenseContent = fs.readFileSync(LICENSE_PATH, 'utf8');
    const licenseData = JSON.parse(licenseContent) as LicenseData;

    return licenseData;
  } catch (error) {
    logger.error({ error }, 'Error reading license data.');
    return null;
  }
}

// Validate license with external API
async function validateLicenseWithAPI(
  licenseKey: string,
  machineCode: string,
  // version?: string
): Promise<LicenseValidationResponse> {
  try {
    const licenseValidationUrl = process.env.LICENSE_VALIDATION_URL;

    if (!licenseValidationUrl) {
      return {
        valid: false,
        error: 'License validation URL not configured',
      };
    }

    const response = await fetch(
      `${licenseValidationUrl}/api/license/validate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          licenseKey: licenseKey.trim(),
          machineCode: machineCode.trim(),
        }),
      },
    );

    if (!response.ok) {
      return {
        valid: false,
        error: `API request failed with status: ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      valid: data.valid || false,
      asset: data.asset,
      error: data.error,
    };
  } catch (error) {
    logger.error({ error }, 'License validation API error');
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function handleLicenseValidation(request: NextRequest) {
  try {
    // Read license data from license.json
    const licenseData = readLicenseData();

    if (!licenseData) {
      return NextResponse.json({
        valid: false,
        error:
          'No license found. Please ensure license.json exists in the project root.',
        hasLicenseFile: false,
      });
    }

    // Get current machine code
    const currentMachineCode = generateMachineCode();

    // Validate with external API
    const validationResult = await validateLicenseWithAPI(
      licenseData.licenseKey,
      currentMachineCode,
      // licenseData.version
    );

    if (validationResult.valid) {
      // Update last validated timestamp
      licenseData.lastValidated = Date.now();
      licenseData.isValid = true;

      // Save updated license data
      try {
        fs.writeFileSync(LICENSE_PATH, JSON.stringify(licenseData, null, 2));
      } catch (error) {
        logger.error(
          { error, url: request.url },
          'Error updating license file.',
        );
      }

      return NextResponse.json({
        valid: true,
        license: {
          email: licenseData.email,
          lastValidated: licenseData.lastValidated,
        },
        asset: validationResult.asset,
      });
    }
    // Update license as invalid
    licenseData.isValid = false;

    try {
      fs.writeFileSync(LICENSE_PATH, JSON.stringify(licenseData, null, 2));
    } catch (error) {
      logger.error({ error, url: request.url }, 'Error updating license file');
    }

    return NextResponse.json({
      valid: false,
      error: validationResult.error || 'License validation failed',
      hasLicenseFile: true,
      apiError: true,
    });
  } catch (error) {
    logger.error({ error, url: request.url }, 'License validation error');
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

async function handleForceLicenseValidation(request: NextRequest) {
  try {
    // Read license data from license.json
    const licenseData = readLicenseData();

    if (!licenseData) {
      return NextResponse.json({
        valid: false,
        error:
          'No license found. Please ensure license.json exists in the project root.',
        hasLicenseFile: false,
      });
    }

    // Get current machine code
    const currentMachineCode = generateMachineCode();
    // Check if machine code matches
    if (licenseData.machineCode !== currentMachineCode) {
      return NextResponse.json({
        valid: false,
        error:
          'Mac        hasLicenseFile: true,hine code mismatch. This license is not valid for this machine.',

        machineCodeMismatch: true,
      });
    }

    // Force validation with external API
    const validationResult = await validateLicenseWithAPI(
      licenseData.licenseKey,
      licenseData.machineCode,
      // licenseData.version
    );

    if (validationResult.valid) {
      // Update last validated timestamp
      licenseData.lastValidated = Date.now();
      licenseData.isValid = true;

      // Save updated license data
      try {
        fs.writeFileSync(LICENSE_PATH, JSON.stringify(licenseData, null, 2));
      } catch (error) {
        logger.error(
          { error, url: request.url },
          'Error updating license file',
        );
      }

      return NextResponse.json({
        valid: true,
        license: {
          email: licenseData.email,
          lastValidated: licenseData.lastValidated,
        },
        asset: validationResult.asset,
      });
    }
    // Update license as invalid
    licenseData.isValid = false;

    try {
      fs.writeFileSync(LICENSE_PATH, JSON.stringify(licenseData, null, 2));
    } catch (error) {
      logger.error({ error, url: request.url }, 'Error updating license file');
    }

    return NextResponse.json({
      valid: false,
      error: validationResult.error || 'License validation failed',
      hasLicenseFile: true,
      apiError: true,
    });
  } catch (error) {
    logger.error({ error, url: request.url }, 'License validation error');
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

export async function POST(request: NextRequest) {
  return licenseValidateRateLimiter(request, handleForceLicenseValidation);
}
