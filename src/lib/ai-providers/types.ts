export interface ProcessedResumeData {
  name: string;
  email?: string;
  location: string;
  experience: number;
  skills: string[];
  currentCTC: number;
  expectedCTC: number;
  noticePeriod: number;
  contact : string;
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
  processResume(base64Resume: string, apiKey: string, model?: string): Promise<ProcessedResumeData>;
  validateApiKey(apiKey: string, model?: string): Promise<{ isValid: boolean; error?: string }>;
}

export type AIProviderType = "gemini" | "openai" | "anthropic" | "perplexity";