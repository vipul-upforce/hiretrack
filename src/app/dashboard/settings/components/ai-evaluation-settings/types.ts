import type { EvaluationCustomFieldSelection } from '@/lib/evaluation/custom-field-context';

export interface EvaluationConfig {
  temperature: number;
  customPrompt: string;
  autoEvaluateAllCandidates: boolean;
  maxPdfPages: number;
  useCustomPrompt: boolean;
  enableConfidenceScores: boolean;
  enableRedFlagsDetection: boolean;
  enableSkillsMatrix: boolean;
  enableComparativeRanking: boolean;
  useCustomFieldsPrompt: boolean;
  customFieldsPrompt: string;
  selectedCustomFields: EvaluationCustomFieldSelection[];
}

export type EvaluationConfigKey = keyof EvaluationConfig;

export interface SectionProps {
  config: EvaluationConfig;
  updateConfig: <K extends EvaluationConfigKey>(
    key: K,
    value: EvaluationConfig[K],
  ) => void;
}
