import type { IBulkCvAi } from '@/lib/types/bulk-cv-ai';
import { EvaluationCustomFieldSelection } from '@/lib/evaluation/custom-field-context';

export interface EvaluationConfigItem {
  temperature: number;
  customPrompt?: string | null;
  autoEvaluateAllCandidates: boolean;
  maxPdfPages: number;
  enableConfidenceScores: boolean;
  enableRedFlagsDetection: boolean;
  enableSkillsMatrix: boolean;
  enableComparativeRanking: boolean;
  useCustomFieldsPrompt?: boolean;
  customFieldsPrompt?: string | null;
  selectedCustomFields?: EvaluationCustomFieldSelection[];
}

export interface GetEvaluationConfigsResponse {
  evaluationConfig: EvaluationConfigItem;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface UpdateEvaluationConfigsRequest extends EvaluationConfigItem {}

export interface UpdateEvaluationConfigsResponse {
  success: boolean;
  message?: string;
  evaluationConfig?: EvaluationConfigItem;
  error?: string;
}

export interface ValidateAiProviderRequest {
  provider: string;
  apiKey: string;
  model: string;
}

export interface ValidateAiProviderResponse {
  isValid: boolean;
  message?: string;
  error?: string;
}

export interface GetBulkCvAiResponse {
  bulkCvAi: IBulkCvAi;
}

export interface UpdateBulkCvAiRequest {
  bulkCvAi: IBulkCvAi;
  /**
   * When true, an empty `bulkCvAi.<slot>.api_key` in the payload must not wipe
   * the previously stored key (the password field was not edited in the form).
   * The PUT route only honors the retain flag when the matching field was not
   * marked dirty by Formik.
   */
  retainGroqApiKey?: boolean;
  retainGeminiApiKey?: boolean;
  retainDeepseekApiKey?: boolean;
  retainOpenrouterApiKey?: boolean;
  retainCerebrasApiKey?: boolean;
  retainMistralApiKey?: boolean;
}

export interface ValidateBulkCvAiRequest {
  provider:
    | 'groq'
    | 'gemini'
    | 'deepseek'
    | 'openrouter'
    | 'cerebras'
    | 'mistral';
  apiKey: string;
  model: string;
}

export interface ValidateBulkCvAiResponse {
  isValid: boolean;
  message?: string;
  error?: string;
  provider?: string;
  model?: string;
}
