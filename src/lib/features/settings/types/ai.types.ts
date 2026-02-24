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
