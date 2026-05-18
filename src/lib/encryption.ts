import CryptoJS from 'crypto-js';
import type {
  BulkCvProviderId,
  IBulkCvAi,
  IBulkCvAiProviderSlot,
} from '@/lib/types/bulk-cv-ai';
import { generateOrgJwtSecret } from './jwtSecretGenerator';
import logger from './logger';

/**
 * Slots we encrypt/decrypt inside `bulkCvAi`. Kept narrow on purpose so we
 * never silently drop a slot when a new provider is added - extending
 * `BulkCvProviderId` requires a deliberate edit here.
 */
const BULK_CV_AI_SLOTS: readonly BulkCvProviderId[] = [
  'groq',
  'gemini',
  'deepseek',
  'openrouter',
  'cerebras',
  'mistral',
];

function transformBulkCvAiSlots(
  config: IBulkCvAi,
  transformApiKey: (apiKey: string) => string,
): IBulkCvAi {
  const next: IBulkCvAi = { ...config };
  for (const slotId of BULK_CV_AI_SLOTS) {
    const slot = config[slotId] as IBulkCvAiProviderSlot | undefined;
    next[slotId] = {
      ...slot,
      api_key: slot?.api_key ? transformApiKey(slot.api_key) : '',
      model: slot?.model ?? '',
      customModel: slot?.customModel ?? '',
    };
  }
  return next;
}

/**
 * Type definition for AI provider configuration
 */
interface AIProviderConfig {
  api_key?: string;
  model?: string;
  customModel?: string;
}

/**
 * Type definition for CAPTCHA configuration
 */
export interface CaptchaConfig {
  siteKey?: string;
  secretKey?: string;
  enableCaptcha?: boolean;
  captchaProvider?: string;
  captchaType?: 'v2' | 'v3';
  captchaVariant?: 'checkbox' | 'invisible';
}

/**
 * Type definition for providers object that can contain AI providers and/or CAPTCHA config
 */
export interface ProvidersConfig {
  activeProvider?: 'gemini' | 'openai' | 'anthropic' | 'perplexity';
  gemini?: AIProviderConfig;
  openai?: AIProviderConfig;
  anthropic?: AIProviderConfig;
  perplexity?: AIProviderConfig;
  captcha?: CaptchaConfig;
  [key: string]: unknown;
}

/**
 * Encrypts a string using AES encryption
 * @param text - The text to encrypt
 * @returns The encrypted text
 */
export function encryptText(text: string, orgId: string): string {
  if (!text) return '';
  const ENCRYPTION_KEY = generateOrgJwtSecret(orgId);
  try {
    const encrypted = CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
    return encrypted;
  } catch (error) {
    logger.error('Encryption error:', error);
    throw new Error('Failed to encrypt text');
  }
}

/**
 * Decrypts an encrypted string
 * @param encryptedText - The encrypted text to decrypt
 * @returns The decrypted text
 */
export function decryptText(encryptedText: string, orgId: string): string {
  if (!encryptedText) return '';
  const ENCRYPTION_KEY = generateOrgJwtSecret(orgId);
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted;
  } catch (error) {
    logger.error('Decryption error:', error);
    // If decryption fails, assume it's already plaintext (for backward compatibility)
    return encryptedText;
  }
}

/**
 * Encrypts API keys in an AI providers object
 * @param providers - The AI providers object with plain text API keys
 * @returns The providers object with encrypted API keys
 */
export function encryptProviderKeys(
  providers: ProvidersConfig | null | undefined,
  orgId: string,
): ProvidersConfig | null | undefined {
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
      orgId,
    );
  }
  if (encrypted.perplexity?.api_key) {
    encrypted.perplexity.api_key = encryptText(
      encrypted.perplexity.api_key,
      orgId,
    );
  }

  // Encrypt CAPTCHA keys
  if (encrypted.captcha?.siteKey) {
    encrypted.captcha.siteKey = encryptText(encrypted.captcha.siteKey, orgId);
  }
  if (encrypted.captcha?.secretKey) {
    encrypted.captcha.secretKey = encryptText(
      encrypted.captcha.secretKey,
      orgId,
    );
  }

  return encrypted;
}

/**
 * Decrypts API keys in an AI providers object
 * @param providers - The AI providers object with encrypted API keys
 * @returns The providers object with decrypted API keys
 */
export function decryptProviderKeys(
  providers: ProvidersConfig | null | undefined,
  orgId: string,
): ProvidersConfig | null | undefined {
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
      orgId,
    );
  }
  if (decrypted.perplexity?.api_key) {
    decrypted.perplexity.api_key = decryptText(
      decrypted.perplexity.api_key,
      orgId,
    );
  }

  // Decrypt CAPTCHA keys
  if (decrypted.captcha?.siteKey) {
    decrypted.captcha.siteKey = decryptText(decrypted.captcha.siteKey, orgId);
  }
  if (decrypted.captcha?.secretKey) {
    decrypted.captcha.secretKey = decryptText(
      decrypted.captcha.secretKey,
      orgId,
    );
  }

  return decrypted;
}

export function encryptBulkCvAi(
  config: IBulkCvAi | null | undefined,
  orgId: string,
): IBulkCvAi | null | undefined {
  if (!config) return config;
  return transformBulkCvAiSlots(config, (key) => encryptText(key, orgId));
}

export function decryptBulkCvAi(
  config: IBulkCvAi | null | undefined,
  orgId: string,
): IBulkCvAi | null | undefined {
  if (!config) return config;
  return transformBulkCvAiSlots(config, (key) => decryptText(key, orgId));
}
