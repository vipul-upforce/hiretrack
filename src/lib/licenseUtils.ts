import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// License file path (same as license-validate route)
export const LICENSE_PATH = path.join(process.cwd(), "..", "license.json");
export const CONFIG_PATH = path.join(process.cwd(), "..", "config.json");
export interface LicenseData {
  licenseKey: string;
}
export interface ConfigData {
  email: string;
  installedVersion: string;
  dbChoice: string;
  dbUrl: string;
}

export interface LicenseValidationResponse {
  valid: boolean;
  asset?: string;
  error?: string;
}

/**
 * Generate machine code based on system characteristics
 * Same logic as in license-validate route
 */
export function generateMachineCode(): string {
  try {
    const osType = process.platform;
    let id: string;

    if (osType === "linux") {
      id = execSync("cat /etc/machine-id").toString().trim();
    } else if (osType === "darwin") {
      id = execSync(
        "system_profiler SPHardwareDataType | awk '/Hardware UUID/ { print $3; }'"
      )
        .toString()
        .trim();
    } else if (osType === "win32") {
      id = execSync(
        'powershell -Command "(Get-CimInstance -ClassName Win32_ComputerSystemProduct).UUID"'
      )
        .toString()
        .trim();
      if (!id || id === "Not Available") {
        throw new Error("Machine UUID not available");
      }
    } else {
      throw new Error(`Unsupported OS: ${osType}`);
    }

    return id;
  } catch (err) {
    console.error("Failed to get machine ID:", err);
    return "unknown-machine-id";
  }
}

/**
 * Read license data from license.json file
 */
export function readLicenseData(): LicenseData | null {
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
/**
 * Read license data from license.json file
 */
export function readCofigData(): ConfigData | null {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      return null;
    }

    const configContent = fs.readFileSync(CONFIG_PATH, "utf8");
    const configData = JSON.parse(configContent) as ConfigData;

    return configData;
  } catch (error) {
    console.error("Error reading config data:", error);
    return null;
  }
}

/**
 * Validate license with external API
 */
export async function validateLicenseWithAPI(
  licenseKey: string,
  machineCode: string
): Promise<LicenseValidationResponse> {
  try {
    const licenseValidationUrl = process.env.LICENSE_VALIDATION_URL;

    if (!licenseValidationUrl) {
      return {
        valid: false,
        error: "License validation URL not configured",
      };
    }

    const response = await fetch(
      `${licenseValidationUrl}/api/license/validate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          licenseKey: licenseKey.trim(),
          machineCode: machineCode.trim(),
        }),
      }
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
    console.error("License validation API error:", error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Validate license and update license.json file
 * This is the main function to use for license validation
 */
export async function validateAndUpdateLicense(): Promise<{
  valid: boolean;
  error?: string;
}> {
  try {
    const licenseData = readLicenseData();

    if (!licenseData) {
      return {
        valid: false,
        error:
          "No license found. Please ensure license.json exists in the project root.",
      };
    }

    const currentMachineCode = generateMachineCode();
    const validationResult = await validateLicenseWithAPI(
      licenseData.licenseKey,
      currentMachineCode
    );

    if (validationResult.valid) {
      return { valid: true };
    } else {
      return {
        valid: false,
        error: validationResult.error || "License validation failed",
      };
    }
  } catch (error) {
    console.error("License validation error:", error);
    return {
      valid: false,
      error: "Internal server error during license validation",
    };
  }
}
