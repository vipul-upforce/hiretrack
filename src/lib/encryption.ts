import CryptoJS from "crypto-js";
import Cookies from "js-cookie";
import { generateOrgJwtSecret } from "./jwtSecretGenerator";
/**
 * Encrypts a string using AES encryption
 * @param text - The text to encrypt
 * @returns The encrypted text
 */
export function encryptText(text: string, orgId: string): string {
  if (!text) return "";
  console.log(orgId, "orgId in encryptText");
  const ENCRYPTION_KEY = generateOrgJwtSecret(orgId);
  console.log(ENCRYPTION_KEY, "ENCRYPTION_KEY in encryptText");
  try {
    const encrypted = CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
    return encrypted;
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt text");
  }
}

/**
 * Decrypts an encrypted string
 * @param encryptedText - The encrypted text to decrypt
 * @returns The decrypted text
 */
export function decryptText(encryptedText: string, orgId: string): string {
  if (!encryptedText) return "";
  const ENCRYPTION_KEY = generateOrgJwtSecret(orgId);
  console.log(ENCRYPTION_KEY, "ENCRYPTION_KEY in encryptText");
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
    // console.log("ENCRYPTION_KEY: ", ENCRYPTION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error);
    // If decryption fails, assume it's already plaintext (for backward compatibility)
    return encryptedText;
  }
}

/**
 * Encrypts API keys in an AI providers object
 * @param providers - The AI providers object with plain text API keys
 * @returns The providers object with encrypted API keys
 */
export function encryptProviderKeys(providers: any, orgId: string): any {
  if (!providers) return providers;

  const encrypted = { ...providers };

  // Encrypt each provider's API key
  if (encrypted.gemini?.api_key) {
    encrypted.gemini.api_key = encryptText(encrypted.gemini.api_key, orgId);
  }
  if (encrypted.openai?.api_key) {
    encrypted.openai.api_key = encryptText(encrypted.openai.api_key, orgId);
  }
  if (encrypted.anthropic?.api_key) {
    encrypted.anthropic.api_key = encryptText(
      encrypted.anthropic.api_key,
      orgId
    );
  }
  if (encrypted.perplexity?.api_key) {
    encrypted.perplexity.api_key = encryptText(
      encrypted.perplexity.api_key,
      orgId
    );
  }

  // Encrypt CAPTCHA keys
  if (encrypted.captcha?.siteKey) {
    encrypted.captcha.siteKey = encryptText(encrypted.captcha.siteKey, orgId);
  }
  if (encrypted.captcha?.secretKey) {
    encrypted.captcha.secretKey = encryptText(
      encrypted.captcha.secretKey,
      orgId
    );
  }

  return encrypted;
}

/**
 * Decrypts API keys in an AI providers object
 * @param providers - The AI providers object with encrypted API keys
 * @returns The providers object with decrypted API keys
 */
export function decryptProviderKeys(providers: any, orgId: string): any {
  if (!providers) return providers;

  const decrypted = { ...providers };

  // Decrypt each provider's API key
  if (decrypted.gemini?.api_key) {
    decrypted.gemini.api_key = decryptText(decrypted.gemini.api_key, orgId);
  }
  if (decrypted.openai?.api_key) {
    decrypted.openai.api_key = decryptText(decrypted.openai.api_key, orgId);
  }
  if (decrypted.anthropic?.api_key) {
    decrypted.anthropic.api_key = decryptText(
      decrypted.anthropic.api_key,
      orgId
    );
  }
  if (decrypted.perplexity?.api_key) {
    decrypted.perplexity.api_key = decryptText(
      decrypted.perplexity.api_key,
      orgId
    );
  }

  // Decrypt CAPTCHA keys
  if (decrypted.captcha?.siteKey) {
    decrypted.captcha.siteKey = decryptText(decrypted.captcha.siteKey, orgId);
  }
  if (decrypted.captcha?.secretKey) {
    decrypted.captcha.secretKey = decryptText(
      decrypted.captcha.secretKey,
      orgId
    );
  }

  return decrypted;
}
