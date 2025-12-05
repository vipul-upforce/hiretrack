import { EvaluationResult } from './evaluation-provider';

export interface ProcessedResumeData {
  name: string;
  email?: string;
  location: string;
  experience: number;
  relevantExperience: number;
  skills: string[];
  currentCTC: number;
  expectedCTC: number;
  noticePeriod: number;
  contact: string;
  scores?: {
    overall: number;
    experience: number;
    skills: number;
    strengths: string[];
    areas_for_improvement: string[];
    recommendation: string;
    notes: string;
  };
  error?: string;
}

export interface AIProvider {
  name: string;
  processResume(
    base64Resume: string,
    apiKey: string,
    model?: string
  ): Promise<ProcessedResumeData>;
  evaluateResume(
    resumeBase64: string,
    apiKey: string,
    prompt: string,
    model?: string,
    temperature?: number
  ): Promise<string>;
  validateApiKey(
    apiKey: string,
    model?: string
  ): Promise<{ isValid: boolean; error?: string }>;
}

export type AIProviderType = 'gemini' | 'openai' | 'anthropic' | 'perplexity';

export interface AIProviderConfig {
  api_key: string;
  model: string;
  customModel?: string;
}

export interface AIProviders {
  activeProvider: AIProviderType;
  gemini: AIProviderConfig;
  openai: AIProviderConfig;
  anthropic: AIProviderConfig;
  perplexity: AIProviderConfig;
}
