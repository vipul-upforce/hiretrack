import { DEFAULT_CUSTOM_FIELDS_PROMPT_TEMPLATE } from '@/lib/evaluation/custom-field-context';
import { IEvaluationConfig } from '../models/settings';
import { AIProviderType } from './types';

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
  enableConfidenceScores: true,
  enableRedFlagsDetection: true,
  enableSkillsMatrix: true,
  enableComparativeRanking: false,
  useCustomFieldsPrompt: false,
  customFieldsPrompt: DEFAULT_CUSTOM_FIELDS_PROMPT_TEMPLATE,
  selectedCustomFields: [],
};

/**
 * Provider display names mapping
 */
export const PROVIDER_NAMES: Record<AIProviderType, string> = {
  gemini: 'Google Gemini',
  openai: 'OpenAI',
  anthropic: 'Anthropic Claude',
  perplexity: 'Perplexity AI',
} as const;

/**
 * Default model configurations for each provider
 */
export const DEFAULT_PROVIDER_CONFIGS = {
  gemini: {
    model: 'gemini-1.5-flash',
    customModel: '',
  },
  openai: {
    model: 'gpt-4o-mini',
    customModel: '',
  },
  anthropic: {
    model: 'claude-3-5-sonnet-20241022',
    customModel: '',
  },
  perplexity: {
    model: 'sonar-pro',
    customModel: '',
  },
} as const;
