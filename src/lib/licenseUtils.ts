/* eslint-disable max-lines */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import logger from '@/lib/logger/';
import {
  PARENT_CONFIG_PATH,
  getReleaseChannel as getReleaseChannelFromConfig,
} from '@/lib/configUtils';

// License file path (in project root parent directory)
export const LICENSE_PATH = path.join(process.cwd(), '..', 'license.json');
/** @deprecated Use PARENT_CONFIG_PATH from @/lib/configUtils for parent config.json */
export const CONFIG_PATH = path.join(process.cwd(), '..', 'config.json');

/** Reads the release channel from parent config.json. Re-exported from configUtils for convenience. */
export const getReleaseChannel = getReleaseChannelFromConfig;

// Do not use .env for this. Hardcoding it bakes it into the compiled .next build.
const RAW_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA+q/liEMVrIqLLWKId1JD
ScvO5Bd7546sjpAvVHmqYL+BEJBRas6RcIxnF+ksdEGv3nnde7JhitMB5HMCHoIg
Dg7Vhd91ke/YKX9S98Md2IskqDWsaYXEe/Voaq/gyPmFU4OUP5vzUgotVd4zMw8n
G7ZrY86k5XGrtC4mFPuFUANbuU9fFBMa0amcVwPlYDVMJt7RGdkMcEF+ASLvNHjJ
C/i/cg+2HIn1EAdbKiNmFjt3PBD2gvGOBqwGnamN8QuC9bWnnc4QcWQy/UaIPjkM
NZjxqzFey+KJpP6NSaGEAFQZIii12O+iPUrUq0XEkX8anN9mxFAM9OH2OwK5MPyA
iwIDAQAB
-----END PUBLIC KEY-----`;

// Bulletproof formatter just in case a code formatter squashes the string
function formatPublicKey(keyString: string) {
    if (!keyString) return '';
    let cleanKey = keyString.replace(/\\n/g, '').replace(/\s+/g, '');
    cleanKey = cleanKey.replace(/-----BEGINPUBLICKEY-----/i, '');
    cleanKey = cleanKey.replace(/-----ENDPUBLICKEY-----/i, '');
    const chunked = cleanKey.match(/.{1,64}/g)?.join('\n') || cleanKey;
    return `-----BEGIN PUBLIC KEY-----\n${chunked}\n-----END PUBLIC KEY-----`;
}

const LICENSE_PUBLIC_KEY = formatPublicKey(RAW_PUBLIC_KEY);

/**
 * Updated License data structure stored in license.json
 */
export interface LicenseData {
  signature: string;
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
 * Generate machine code based on system characteristics (100% OFFLINE).
 * - Linux: OS Machine ID + Filesystem UUID
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
      let sysMachineId = 'UNKNOWN_OS';
      let sysFsUuid = 'UNKNOWN_FS';

      try {
        sysMachineId = execSync('cat /etc/machine-id', { encoding: 'utf8', stdio: 'pipe' }).toString().trim();
      } catch (e) { /* ignore */ }

      try {
        sysFsUuid = execSync('findmnt / -n -o UUID', { encoding: 'utf8', stdio: 'pipe' }).toString().trim();
      } catch (e) { /* ignore */ }

      const combined = `${sysMachineId}-${sysFsUuid}`;
      id = crypto.createHash('sha256').update(combined).digest('hex');

    } else if (osType === 'darwin') {
      const macIdCmd = "ioreg -rd1 -c IOPlatformExpertDevice | awk '/IOPlatformUUID/ { split($0, line, \"\\\"\"); printf(\"%s\\n\", line[4]); }'";
      const macId = execSync(macIdCmd, { encoding: 'utf8', stdio: 'pipe' }).toString().trim();
      const combined = `${macId}-MAC_FS`;
      id = crypto.createHash('sha256').update(combined).digest('hex');

    } else if (osType === 'win32') {
      id = execSync('powershell -Command "(Get-CimInstance -ClassName Win32_ComputerSystemProduct).UUID"', { encoding: 'utf8', stdio: 'pipe' }).toString().trim();
      if (!id || id === 'Not Available') {
        throw new Error('Machine UUID not available');
      }
    } else {
      throw new Error(`Unsupported OS: ${osType}`);
    }

    return id;
  } catch (err) {
    logger.error('Failed to get machine ID:', err);
    return 'unknown-machine-id';
  }
}

/**
 * Read and parse the cryptographically signed license data
 */
export function readLicenseData(): LicenseData | null {
  try {
    if (!fs.existsSync(LICENSE_PATH)) {
      return null;
    }

    const licenseContent = fs.readFileSync(LICENSE_PATH, 'utf8');
    const licenseData = JSON.parse(licenseContent) as LicenseData;

    // 👈 2. We only check for the signature now
    if (!licenseData.signature) {
      logger.error('License file format invalid. Missing signature.');
      return null;
    }

    return licenseData;
  } catch (error) {
    logger.error('Error reading license data:', error);
    return null;
  }
}

/**
 * Read config data from config.json file
 */
export function readConfigData(): ConfigData | null {
  try {
    if (!fs.existsSync(PARENT_CONFIG_PATH)) {
      return null;
    }

    const configContent = fs.readFileSync(PARENT_CONFIG_PATH, 'utf8');
    return JSON.parse(configContent) as ConfigData;
  } catch (error) {
    logger.error('Error reading config data:', error);
    return null;
  }
}

/**
 * OFFLINE License Validation
 */
export async function validateLicenseComprehensive(): Promise<LicenseValidationResult> {
  try {
    const licenseData = readLicenseData();

    if (!licenseData) {
      return {
        valid: false,
        error: 'No valid license found. Please run the installer script.',
        hasLicenseFile: false,
      };
    }

    // Generate hardware ID at runtime
    const currentMachineCode = generateMachineCode();

    // 👈 3. Verify Cryptographic Signature AND Hardware Lock Simultaneously
    try {
      const verify = crypto.createVerify('SHA256');
      
      // We feed the RUNTIME machine code directly into the verifier
      verify.update(currentMachineCode);
      verify.end();

      // If this matches the signature from the file, it means the server's 
      // physical metal is exactly what the Admin API authorized!
      const isAuthentic = verify.verify(LICENSE_PUBLIC_KEY, licenseData.signature, 'base64');
      
      if (!isAuthentic) {
        logger.error('License verification failed: Hardware mismatch or signature tampered.');
        return {
          valid: false,
          error: 'Hardware mismatch. This instance is not authorized for this server.',
          hasLicenseFile: true,
        };
      }
    } catch (cryptoError) {
      logger.error('Crypto verification failed:', cryptoError);
      return {
        valid: false,
        error: 'Internal error verifying license signature.',
        hasLicenseFile: true,
      };
    }

    // All checks passed! 100% Offline.
    return { valid: true, hasLicenseFile: true, apiError: false };

  } catch (error) {
    logger.error('License validation error:', error);
    return {
      valid: false,
      error: 'Internal server error during license validation',
      hasLicenseFile: true,
    };
  }
}

export async function validateLicense(): Promise<LicenseValidationResult> {
  // const result = await validateLicenseComprehensive();

  // return {
  //   valid: result.valid,
  //   error: result.error,
  //   hasLicenseFile: result.hasLicenseFile,
  //   apiError: result.apiError || false,
  // };
  return {
    valid: true,
    hasLicenseFile: true,
    apiError: false,
  };
}