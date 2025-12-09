import { AIProviderType } from "./types";
import { ISettings } from "../models/settings";
import { PROVIDER_NAMES } from "./evaluation-constants";

/**
 * Generates evaluation metadata string
 * @param provider - AI provider type
 * @param settings - Application settings
 * @param modelUsed - Model used for evaluation (optional)
 * @returns Metadata string
 */
export async function getEvaluationMetadata(
  provider: AIProviderType,
  settings: ISettings | Partial<ISettings>,
  modelUsed?: string
): Promise<string> {
  const now = new Date();
  const userTimezone = settings?.timeZone?.name || "UTC";

  const dateStr = now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: userTimezone,
  });

  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: userTimezone,
  });

  const providerName = PROVIDER_NAMES[provider] || provider;
  const modelInfo = modelUsed ? `using ${modelUsed}` : "";

  return `\n\nEvaluated by ${providerName} ${modelInfo} on ${dateStr} at ${timeStr}`;
}

