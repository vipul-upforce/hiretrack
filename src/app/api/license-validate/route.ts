import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { licenseValidateRateLimiter } from "@/lib/rateLimiter";
import { machineIdSync, machineId } from "node-machine-id";
import { execSync } from "child_process";

// const fs ("fs");
// const crypto = require("crypto");
import { hostname } from "os";
// Common variable for license.json path (in project root).,
const LICENSE_PATH = path.join(process.cwd(), "..", "license.json");

// Common variable for package.json path (parent of parent of current project root)
const PACKAGE_JSON_PATH = path.join(process.cwd(), "package.json");

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

export function generateMachineCode(): string {
  try {
    const osType = process.platform; // 'darwin' or 'linux'
    let id: string;

    if (osType === "linux") {
      id = execSync("cat /etc/machine-id").toString().trim();
    } else if (osType === "darwin") {
      id = execSync("hostname | shasum -a 256 | awk '{print $1}'")
        .toString()
        .trim();
    } else {
      throw new Error(`Unsupported OS: ${osType}`);
    }

    return id;
  } catch (err) {
    console.error("Failed to get machine ID:", err);
    return "unknown-machine-id";
  }
}

// Read license data from license.json file
function readLicenseData(): LicenseData | null {
  try {
    if (!fs.existsSync(LICENSE_PATH)) {
      return null;
    }

    const licenseContent = fs.readFileSync(LICENSE_PATH, "utf8");
    const licenseData = JSON.parse(licenseContent) as LicenseData;

    return licenseData;
  } catch (error) {
    console.error("Error reading license data:", error);
    return null;
  }
}

// Validate license with external API
async function validateLicenseWithAPI(
  licenseKey: string,
  machineCode: string
  // version?: string
): Promise<LicenseValidationResponse> {
  try {
    const licenseValidationUrl = process.env.LICENSE_VALIDATION_URL;

    if (!licenseValidationUrl) {
      return {
        valid: false,
        error: "License validation URL not configured",
      };
    }
    console.log("licenseValidationUrl: ", licenseValidationUrl);
    console.log("licenseKey: ", licenseKey);
    // console.log("machineCode: ", machineCode);
    const response = await fetch(
      `${licenseValidationUrl}/api/license/validate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          licenseKey,
          machineCode,
          // installedVersion:
          //   version || process.env.npm_package_version || "1.0.0",
        }),
      }
    );
    console.log("response: ", response);

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
    console.error("License validation API error:", error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Unknown error",
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
          "No license found. Please ensure license.json exists in the project root.",
        hasLicenseFile: false,
      });
    }

    // Get current machine code
    const currentMachineCode = generateMachineCode();
    console.log("currentMachineCode: ", currentMachineCode);
    console.log("licenseData.machineCode: ", licenseData.machineCode);
    console.log("licenseData: ", licenseData);
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
      currentMachineCode
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
        console.error("Error updating license file:", error);
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
    } else {
      // Update license as invalid
      licenseData.isValid = false;

      try {
        fs.writeFileSync(LICENSE_PATH, JSON.stringify(licenseData, null, 2));
      } catch (error) {
        console.error("Error updating license file:", error);
      }

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
    const { force } = await request.json();

    // Read license data from license.json
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

    console.log("currentMachineCode: ", currentMachineCode);
    console.log("licenseData.machineCode: ", licenseData.machineCode);
    console.log("force: ", force);
    console.log("licenseData: ", licenseData);

    // Check if machine code matches
    if (licenseData.machineCode !== currentMachineCode) {
      return NextResponse.json({
        valid: false,
        error:
          "Machine code mismatch. This license is not valid for this machine.",
        hasLicenseFile: true,
        machineCodeMismatch: true,
      });
    }

    // Force validation with external API
    const validationResult = await validateLicenseWithAPI(
      licenseData.licenseKey,
      licenseData.machineCode
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
        console.error("Error updating license file:", error);
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
    } else {
      // Update license as invalid
      licenseData.isValid = false;

      try {
        fs.writeFileSync(LICENSE_PATH, JSON.stringify(licenseData, null, 2));
      } catch (error) {
        console.error("Error updating license file:", error);
      }

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
