/* eslint-disable max-lines */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import os from 'os';
import { logger } from '@/lib/logger/logger.server';

// License file path (in project root parent directory)
export const LICENSE_PATH = path.join(process.cwd(), '..', 'license.json');
export const CONFIG_PATH = path.join(process.cwd(), '..', 'config.json');

/**
 * License data structure stored in license.json
 */
export interface LicenseData {
  licenseKey: string;
}
export interface ConfigData {
  email: string;
  installedVersion: string;
  dbChoice: string;
  dbUrl: string;
}

export interface LicenseValidationResult {
  valid: boolean;
  error?: string;
  hasLicenseFile?: boolean;
  apiError?: boolean;
}

/**
 * Helper: Get first non-internal, non-empty MAC address on Linux
 */
function getLinuxMacAddress(): string | null {
  try {
    // Try to get the MAC of default route interface
    const interfaceName = execSync(
      "ip route show default | awk '/default/ {print $5}' | head -n 1",
    )
      .toString()
      .trim();

    if (interfaceName) {
      // Try /sys/class/net/INTERFACE/address
      try {
        const mac = execSync(`cat /sys/class/net/${interfaceName}/address`)
          .toString()
          .trim();
        if (mac && mac !== '00:00:00:00:00:00') return mac;
      } catch {
        // Fallback: ip link show
      }
      try {
        const mac = execSync(
          `ip link show "${interfaceName}" | awk '/ether/ {print $2}'`,
        )
          .toString()
          .trim();
        if (mac && mac !== '00:00:00:00:00:00') return mac;
      } catch {
        // Continue to fallback
      }
    }
  } catch {
    // Continue to network interfaces fallback
  }

  // Try to get first non-internal MAC from all network interfaces as fallback
  try {
    const interfaces = os.networkInterfaces();
    // Safe: iterating over OS network interfaces, not user input
    // eslint-disable-next-line security/detect-object-injection
    for (const name of Object.keys(interfaces)) {
      // eslint-disable-next-line security/detect-object-injection
      const addrs = interfaces[name];
      if (addrs) {
        for (const addr of addrs) {
          if (addr.mac && addr.mac !== '00:00:00:00:00:00' && !addr.internal) {
            return addr.mac;
          }
        }
      }
    }
  } catch {
    // Return null if all methods fail
  }
  return null;
}

/**
 * Helper: Fetch public IP using curl
 */
function getLinuxPublicIp(): string | null {
  const services = ['curl -s ifconfig.me', 'curl -s icanhazip.com'];
  for (const cmd of services) {
    try {
      const ip = execSync(cmd).toString().trim();
      // Rudimentary IPv4 check - matches 4 groups of 1-3 digits separated by dots
      // eslint-disable-next-line security/detect-unsafe-regex
      if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return ip;
    } catch {
      // Try next service
    }
  }
  return null;
}

/**
 * Generate machine code based on system characteristics.
 * - Linux: MAC address + Public IP (hashed)
 * - macOS: Hardware UUID
 * - Windows: System UUID
 *
 * @returns Machine code string
 */
export function generateMachineCode(): string {
  try {
    const osType = process.platform;
    let id: string;

    if (osType === 'linux') {
      // Compose machine ID from MAC + Public IP, then hash
      const mac = getLinuxMacAddress() ?? '';
      const ip = getLinuxPublicIp() ?? '';
      const combined = `${mac.trim()}_${ip.trim()}`;
      id = crypto.createHash('sha256').update(combined).digest('hex');
    } else if (osType === 'darwin') {
      // On macOS, use hardware UUID
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
    logger.error(
      { error: err, platform: process.platform },
      'Failed to generate machine code',
    );
    return 'unknown-machine-id';
  }
}

/**
 * Read license data from license.json file
 *
 * @returns LicenseData or null if file doesn't exist or is invalid
 */
export function readLicenseData(): LicenseData | null {
  try {
    if (!fs.existsSync(LICENSE_PATH)) {
      return null;
    }

    const licenseContent = fs.readFileSync(LICENSE_PATH, 'utf8');
    const licenseData = JSON.parse(licenseContent) as LicenseData;

    return licenseData;
  } catch (error) {
    logger.error({ error, path: LICENSE_PATH }, 'Error reading license data');
    return null;
  }
}
/**
 * Read config data from config.json file
 */
export function readConfigData(): ConfigData | null {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      return null;
    }

    const configContent = fs.readFileSync(CONFIG_PATH, 'utf8');
    const configData = JSON.parse(configContent) as ConfigData;

    return configData;
  } catch (error) {
    logger.error({ error, path: CONFIG_PATH }, 'Error reading config data');
    return null;
  }
}

/**
 * Validate license with external API
 *
 * @param licenseKey - License key to validate
 * @param machineCode - Machine code to validate
 * @returns LicenseValidationResponse
 */
async function validateLicenseWithAPI(
  licenseKey: string,
  machineCode: string,
): Promise<LicenseValidationResult> {
  try {
    const licenseValidationUrl = process.env.LICENSE_VALIDATION_URL;

    if (!licenseValidationUrl) {
      return {
        valid: false,
        error: 'License validation URL not configured',
      };
    }

    logger.info(
      {
        url: licenseValidationUrl,
        hasLicenseKey: !!licenseKey,
        hasMachineCode: !!machineCode,
      },
      'Validating license with external API',
    );

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
      logger.warn(
        { status: response.status, statusText: response.statusText },
        'License validation API returned non-OK status',
      );
      return {
        valid: false,
        error: `API request failed with status: ${response.status}`,
      };
    }

    const data = await response.json();
    logger.info(
      { valid: data.valid, hasAsset: !!data.asset },
      'License validation API response received',
    );

    return {
      valid: data.valid || false,
      error: data.error,
    };
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      'License validation API error',
    );
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function validateLicenseComprehensive(): Promise<LicenseValidationResult> {
  try {
    const licenseData = readLicenseData();

    if (!licenseData) {
      return {
        valid: false,
        error:
          'No license found. Please ensure license.json exists in the project root.',
      };
    }

    const currentMachineCode = generateMachineCode();
    const validationResult = await validateLicenseWithAPI(
      licenseData.licenseKey,
      currentMachineCode,
    );

    if (validationResult.valid) {
      // Return validation result without modifying license file
      return {
        valid: true,
        hasLicenseFile: true,
        apiError: false,
      };
    }

    // Return invalid result without modifying license file

    return {
      valid: false,
      error: validationResult.error || 'License validation failed',
      hasLicenseFile: true,
      apiError: true,
    };
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      'License validation error',
    );
    return {
      valid: false,
      error: 'Internal server error during license validation',
      hasLicenseFile: false,
    };
  }
}

export async function validateLicense(): Promise<LicenseValidationResult> {
  const result = await validateLicenseComprehensive();

  return {
    valid: result.valid,
    error: result.error,
    hasLicenseFile: result.hasLicenseFile,
    apiError: result.apiError || false,
  };
}
