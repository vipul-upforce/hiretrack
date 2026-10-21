import type { ProvidersConfig } from '@/lib/encryption';
import type { CaptchaConfig } from '@/lib/encryption';
import type { IBulkCvAi } from '@/lib/types/bulk-cv-ai';

/** Demo GET: never send secret bytes to the client (forms expect strings). */
export function stripSecretForDemo(
  _storedValue: string | undefined | null,
): '' {
  return '';
}

export function stripMailConfigForDemo(
  mailConfig: Record<string, string | undefined> | null | undefined,
): Record<string, string | undefined> {
  const config = mailConfig ?? {};
  return {
    ...config,
    smtp_password: stripSecretForDemo(config.smtp_password),
    resend_api_key: stripSecretForDemo(config.resend_api_key),
    brevo_api_key: stripSecretForDemo(config.brevo_api_key),
  };
}

export function stripFileStorageForDemo(
  fileStorage: Record<string, string | undefined> | null | undefined,
): Record<string, string | undefined> {
  const storage = fileStorage ?? {};
  return {
    ...storage,
    awsAccessKeyId: stripSecretForDemo(storage.awsAccessKeyId),
    awsSecretAccessKey: stripSecretForDemo(storage.awsSecretAccessKey),
    cloudinaryApiKey: stripSecretForDemo(storage.cloudinaryApiKey),
    cloudinaryApiSecret: stripSecretForDemo(storage.cloudinaryApiSecret),
  };
}

const AI_PROVIDER_IDS = [
  'gemini',
  'openai',
  'anthropic',
  'perplexity',
] as const;

export function stripAiProvidersForDemo(
  providers: ProvidersConfig,
): ProvidersConfig {
  const stripped: ProvidersConfig = { ...providers };
  for (const id of AI_PROVIDER_IDS) {
    const slot = providers[id];
    if (!slot) continue;
    stripped[id] = {
      ...slot,
      api_key: stripSecretForDemo(slot.api_key),
    };
  }
  return stripped;
}

const BULK_CV_SLOTS = [
  'groq',
  'gemini',
  'deepseek',
  'openrouter',
  'cerebras',
  'mistral',
] as const;

export function stripBulkCvAiForDemo(config: IBulkCvAi): IBulkCvAi {
  const next: IBulkCvAi = { ...config };
  for (const slotId of BULK_CV_SLOTS) {
    const slot = config[slotId];
    if (!slot) continue;
    next[slotId] = {
      ...slot,
      api_key: stripSecretForDemo(slot.api_key),
    };
  }
  return next;
}

export function stripCaptchaForDemo(
  captcha: CaptchaConfig | null | undefined,
): CaptchaConfig {
  const config = captcha ?? {};
  return {
    ...config,
    secretKey: stripSecretForDemo(config.secretKey),
  };
}

export function stripZoomForDemo(
  zoom: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const config = { ...(zoom ?? {}) };
  config.clientSecret = stripSecretForDemo(
    config.clientSecret as string | undefined,
  );
  config.accessToken = stripSecretForDemo(
    config.accessToken as string | undefined,
  );
  return config;
}

export function stripGoogleCalendarForDemo(
  googleCalendar: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const config = { ...(googleCalendar ?? {}) };
  config.clientSecret = stripSecretForDemo(
    config.clientSecret as string | undefined,
  );
  config.accessToken = stripSecretForDemo(
    config.accessToken as string | undefined,
  );
  config.refreshToken = stripSecretForDemo(
    config.refreshToken as string | undefined,
  );
  return config;
}

export function stripMicrosoftTeamsForDemo(
  microsoftTeams: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const config = { ...(microsoftTeams ?? {}) };
  config.clientSecret = stripSecretForDemo(
    config.clientSecret as string | undefined,
  );
  config.accessToken = stripSecretForDemo(
    config.accessToken as string | undefined,
  );
  config.refreshToken = stripSecretForDemo(
    config.refreshToken as string | undefined,
  );
  config.botPassword = stripSecretForDemo(
    config.botPassword as string | undefined,
  );
  return config;
}

export function stripGeminiForDemo(
  gemini: { gemini_key?: string } | null | undefined,
): { gemini_key?: string } {
  const config = gemini ?? {};
  return {
    ...config,
    gemini_key: stripSecretForDemo(config.gemini_key),
  };
}
