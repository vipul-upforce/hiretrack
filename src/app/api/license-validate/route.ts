import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { licenseValidateRateLimiter } from '@/lib/rateLimiter';
import { machineIdSync, machineId } from 'node-machine-id';
import { execSync } from 'child_process';
import os from 'os';
// const fs ("fs");
// const crypto = require("crypto");
import { hostname } from 'os';
// Common variable for license.json path (in project root).,
const LICENSE_PATH = path.join(process.cwd(), '..', 'license.json');

// Common variable for package.json path (parent of parent of current project root)
const PACKAGE_JSON_PATH = path.join(process.cwd(), 'package.json');

interface LicenseData {
  licenseKey: string;
  machineCode: string;
  email: string;
  // version: string;
  lastValidated: number;
  isValid: boolean;
}

interface LicenseValidationResponse {
  valid: boolean;
  asset?: string;
  error?: string;
}

// get_machine_code() {                                                          local OS_TYPE
//   OS_TYPE=$(uname | tr '[:upper:]' '[:lower:]')
//   if [[ "$OS_TYPE" == "linux" ]]; then
//       if [ -f /etc/machine-id ]; then
//           cat /etc/machine-id                                                   else                                                                          hostname | sha256sum | awk '{print $1}'
//       fi                                                                    elif [[ "$OS_TYPE" == "darwin" ]]; then
//       hostname | shasum -a 256 | awk '{print $1}'
//   else                                                                          echo "�~]~L Unsupported OS: $OS_TYPE"
//       exit 1
//   fi
// }

// Generate machine code based on system characteristics
/**
 * Returns the machine code using the same logic as the shell get_machine_code function.
 * - On Linux: returns the contents of /etc/machine-id if it exists, otherwise the sha256 of the hostname.
 * - On macOS (darwin): returns the sha256 of the hostname.
 * - On other OS: throws an error.
 * This ensures compatibility with installation scripts and other usages.
 */
// function generateMachineCode(): string {
//   const os = process.platform;

//   if (os === "linux") {
//     const machineIdPath = "/etc/machine-id";
//     if (fs.existsSync(machineIdPath)) {
//       // Read /etc/machine-id and trim whitespace
//       return fs.readFileSync(machineIdPath, "utf8").trim();
//     } else {
//       console.log("hostname: ", hostname);
//       // Fallback: sha256sum of hostname
//       return crypto.createHash("sha256").update(hostname()).digest("hex");
//     }
//   } else if (os === "darwin") {
//     console.log("hostname: ", hostname);
//     // macOS: sha256 of hostname
//     return crypto.createHash("sha256").update(hostname()).digest("hex");
//   } else if (os === "win32") {
//     console.log("hostname: ", hostname);
//     // Windows: sha256 of hostname
//     return crypto.createHash("sha256").update(hostname()).digest("hex");
//   } else {
//     // Unsupported OS
//     throw new Error(`Unsupported OS for machine code: ${os}`);
//   }
// }

// function generateMachineCode() {
//   const id = machineIdSync(); // returns a unique machine ID
//   return id;
// }

// Helper: Get first non-internal, non-empty MAC address on Linux
function getLinuxMacAddress(): string | null {
  try {
    // Try to get the MAC of default route interface
    const interfaceName = execSync(
      "ip route show default | awk '/default/ {print $5}' | head -n 1"
    )
      .toString()
      .trim();

    if (interfaceName) {
      // Try /sys/class/net/INTERFACE/address
      try {
        const mac = execSync(
          `cat /sys/class/net/${interfaceName}/address`
        )
          .toString()
          .trim();
        if (mac && mac !== "00:00:00:00:00:00") return mac;
      } catch {}
      // Fallback: ip link show
      try {
        const mac = execSync(
          `ip link show "${interfaceName}" | awk '/ether/ {print $2}'`
        )
          .toString()
          .trim();
        if (mac && mac !== "00:00:00:00:00:00") return mac;
      } catch {}
    }
  } catch {}
  // Try to get first non-internal MAC from all network interfaces as fallback
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      const addrs = interfaces[name];
      if (!addrs) continue;
      for (const addr of addrs) {
        if (
          addr.mac &&
          addr.mac !== "00:00:00:00:00:00" &&
          !addr.internal
        ) {
          return addr.mac;
        }
      }
    }
  } catch {}
  return null;
}

// Helper: Fetch public IP using a local call to curl
function getLinuxPublicIp(): string | null {
  // Try two popular services
  const services = [
    "curl -s ifconfig.me",
    "curl -s icanhazip.com",
  ];
  for (const cmd of services) {
    try {
      const ip = execSync(cmd).toString().trim();
      // rudimentary IPv4 check
      if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return ip;
    } catch {}
  }
  return "0.0.0.0";
}

export function generateMachineCode(): string {
  try {
    const osType = process.platform;
    let id: string;

    if (osType === "linux") {
      // Compose machine ID from MAC + Public IP, then hash
      const mac = getLinuxMacAddress() ?? "";
      const ip = getLinuxPublicIp() ?? "";
      const combined = `${mac.trim()}_${ip.trim()}`;
      id = crypto.createHash("sha256").update(combined).digest("hex");
    } else if (osType === "darwin") {
      // On macOS, use hardware UUID
      id = execSync("system_profiler SPHardwareDataType | awk '/Hardware UUID/ { print $3; }'")
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
    console.error('Failed to get machine ID:', err);
    return 'unknown-machine-id';
  }
}

// Read license data from license.json file
function readLicenseData(): LicenseData | null {
  console.log('LICENSE_PATH: ', LICENSE_PATH);
  try {
    if (!fs.existsSync(LICENSE_PATH)) {
      return null;
    }

    const licenseContent = fs.readFileSync(LICENSE_PATH, 'utf8');
    const licenseData = JSON.parse(licenseContent) as LicenseData;

    return licenseData;
  } catch (error) {
    console.error('Error reading license data:', error);
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
    console.log('licenseValidationUrl: ', licenseValidationUrl);
    console.log('licenseKey: ', licenseKey);
    console.log('machineCode: ', machineCode);
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
          // installedVersion:
          //   version || process.env.npm_package_version || "1.0.0",
        }),
      },
    );
    console.log('response: ', response);

    if (!response.ok) {
      return {
        valid: false,
        error: `API request failed with status: ${response.status}`,
      };
    }

    const data = await response.json();
    console.log('data: ', data);
    return {
      valid: data.valid || false,
      asset: data.asset,
      error: data.error,
    };
  } catch (error) {
    console.error('License validation API error:', error);
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
    console.log('currentMachineCode: ', currentMachineCode);
    console.log('licenseData.machineCode: ', licenseData.machineCode);
    console.log('licenseData: ', licenseData);
    // console.log(
    //   "licenseData.machineCode != currentMachineCode: ",
    //   licenseData.machineCode != currentMachineCode
    // );
    // Check if machine code matches
    // if (licenseData.machineCode != currentMachineCode) {
    //   return NextResponse.json({
    //     valid: false,
    //     error:
    //       "Machine code mismatch. This license is not valid for this machine.",
    //     hasLicenseFile: true,
    //     machineCodeMismatch: true,
    //   });
    // }

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
        console.error('Error updating license file:', error);
      }

      return NextResponse.json({
        valid: true,
      });
    }
    // Update license as invalid
    licenseData.isValid = false;

    try {
      fs.writeFileSync(LICENSE_PATH, JSON.stringify(licenseData, null, 2));
    } catch (error) {
      console.error('Error updating license file:', error);
    }

    return NextResponse.json({
      valid: false,
      error: validationResult.error || 'License validation failed',
      hasLicenseFile: true,
      apiError: true,
    });
  } catch (error) {
    console.error('License validation error:', error);
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
    const { force } = await request.json();

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

    console.log('currentMachineCode: ', currentMachineCode);
    console.log('licenseData.machineCode: ', licenseData.machineCode);
    console.log('force: ', force);
    console.log('licenseData: ', licenseData);

    // Check if machine code matches
    if (licenseData.machineCode !== currentMachineCode) {
      return NextResponse.json({
        valid: false,
        error:
          'Machine code mismatch. This license is not valid for this machine.',
        hasLicenseFile: true,
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
        console.error('Error updating license file:', error);
      }

      return NextResponse.json({
        valid: true,
        license: {
          email: licenseData.email,
          // version: licenseData.version,
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
      console.error('Error updating license file:', error);
    }

    return NextResponse.json({
      valid: false,
      error: validationResult.error || 'License validation failed',
      hasLicenseFile: true,
      apiError: true,
    });
  } catch (error) {
    console.error('License validation error:', error);
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
