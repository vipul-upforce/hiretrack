import CryptoJS from "crypto-js";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || "your_encryption_key";

if (!ENCRYPTION_KEY) {
  throw new Error("ENCRYPTION_KEY or JWT_SECRET must be defined in environment variables");
}

/**
 * Encrypts a string using AES encryption
 * @param text - The text to encrypt
 * @returns The encrypted text
 */
export function encryptText(text: string): string {
  if (!text) return "";
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
export function decryptText(encryptedText: string): string {
  if (!encryptedText) return "";
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
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
export function encryptAIProviderKeys(providers: any): any {
  if (!providers) return providers;
  
  const encrypted = { ...providers };
  
  // Encrypt each provider's API key
  if (encrypted.gemini?.api_key) {
    encrypted.gemini.api_key = encryptText(encrypted.gemini.api_key);
  }
  if (encrypted.openai?.api_key) {
    encrypted.openai.api_key = encryptText(encrypted.openai.api_key);
  }
  if (encrypted.anthropic?.api_key) {
    encrypted.anthropic.api_key = encryptText(encrypted.anthropic.api_key);
  }
  if (encrypted.perplexity?.api_key) {
    encrypted.perplexity.api_key = encryptText(encrypted.perplexity.api_key);
  }
  
  return encrypted;
}

/**
 * Decrypts API keys in an AI providers object
 * @param providers - The AI providers object with encrypted API keys
 * @returns The providers object with decrypted API keys
 */
export function decryptAIProviderKeys(providers: any): any {
  if (!providers) return providers;
  
  const decrypted = { ...providers };
  
  // Decrypt each provider's API key
  if (decrypted.gemini?.api_key) {
    decrypted.gemini.api_key = decryptText(decrypted.gemini.api_key);
  }
  if (decrypted.openai?.api_key) {
    decrypted.openai.api_key = decryptText(decrypted.openai.api_key);
  }
  if (decrypted.anthropic?.api_key) {
    decrypted.anthropic.api_key = decryptText(decrypted.anthropic.api_key);
  }
  if (decrypted.perplexity?.api_key) {
    decrypted.perplexity.api_key = decryptText(decrypted.perplexity.api_key);
  }
  
  return decrypted;
}