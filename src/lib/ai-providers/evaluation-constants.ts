import { AIProviderType } from "./types";
import { IEvaluationConfig } from "../models/settings";

/**
 * Constants for evaluation configuration
 */
export const EVALUATION_CONSTANTS = {
  DEFAULT_TEMPERATURE: 0.1,
  DEFAULT_MAX_PDF_PAGES: 4,
  DEFAULT_FALLBACK_SCORE: 5,
  SCORE_PRECISION: 2,
  SCORE_DECIMAL_MULTIPLIER: 100,
  AVERAGE_SCORE_DIVISOR: 4,
} as const;

/**
 * Default evaluation configuration
 */
export const DEFAULT_EVALUATION_CONFIG: IEvaluationConfig = {
  temperature: EVALUATION_CONSTANTS.DEFAULT_TEMPERATURE,
  customPrompt: null,
  autoEvaluateAllCandidates: false,
  maxPdfPages: EVALUATION_CONSTANTS.DEFAULT_MAX_PDF_PAGES,
};

/**
 * Provider display names mapping
 */
export const PROVIDER_NAMES: Record<AIProviderType, string> = {
  gemini: "Google Gemini",
  openai: "OpenAI",
  anthropic: "Anthropic Claude",
  perplexity: "Perplexity AI",
} as const;

/**
 * Default model configurations for each provider
 */
export const DEFAULT_PROVIDER_CONFIGS = {
  gemini: {
    model: "gemini-1.5-flash",
    customModel: "",
  },
  openai: {
    model: "gpt-4o-mini",
    customModel: "",
  },
  anthropic: {
    model: "claude-3-5-sonnet-20241022",
    customModel: "",
  },
  perplexity: {
    model: "sonar-pro",
    customModel: "",
  },
} as const;

