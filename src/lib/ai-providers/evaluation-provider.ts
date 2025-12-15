import { AIProviderFactory } from "./factory";
import { AIProviderType } from "./types";
import { ICandidate } from "../models/candidate";
import { ISettings, IEvaluationConfig, IAIProviders } from "../models/settings";
import {
  JobForEvaluate,
  EvaluationResult,
} from "./evaluation-types";
import {
  DEFAULT_EVALUATION_CONFIG,
  DEFAULT_PROVIDER_CONFIGS,
  EVALUATION_CONSTANTS,
} from "./evaluation-constants";
import { extractNumericScore, isValidNumber } from "./evaluation-utils";
import { parseEvaluationResponse } from "./evaluation-parser";
import {
  getEvaluationPrompt,
  buildPromptWithCustomTemplate,
} from "./evaluation-prompts";
import { getEvaluationMetadata } from "./evaluation-metadata";

/**
 * Service for AI-powered candidate resume evaluation
 * Handles evaluation using various AI providers (Gemini, OpenAI, Anthropic, Perplexity)
 */
export class AIEvaluationService {
  private static modelUsed: string = '';

  /**
   * Evaluates a candidate's resume using AI
   * @param resumeBase64 - Base64 encoded resume content
   * @param settings - Application settings including AI provider configuration
   * @param jobData - Job details for evaluation context
   * @param candidate - Candidate information
   * @returns Evaluation result with scores and recommendations
   * @throws Error if evaluation fails
   */
  static async evaluateResume(
    resumeBase64: string,
    settings: ISettings | Partial<ISettings>,
    jobData: JobForEvaluate,
    candidate: ICandidate,
  ): Promise<EvaluationResult> {
    try {
      const aiProviders = this.getAIProviders(settings);
      const activeProvider = aiProviders.activeProvider as AIProviderType;
      const apiKey = this.validateAndGetApiKey(aiProviders, activeProvider);
      const evaluationConfig = this.getEvaluationConfig(settings);
      const prompt = this.buildPrompt(evaluationConfig, jobData, candidate);
      const provider = AIProviderFactory.getProvider(activeProvider);
      const selectedModel = this.getSelectedModel(aiProviders, activeProvider);

      const response = await provider.evaluateResume(
        resumeBase64,
        apiKey,
        prompt,
        selectedModel,
        evaluationConfig.temperature,
      );

      let evaluationResult = parseEvaluationResponse(response);
      evaluationResult = this.filterEvaluationBySettings(
        evaluationResult,
        evaluationConfig,
      );

      const evaluationMetadata = await getEvaluationMetadata(
        activeProvider,
        settings,
        this.modelUsed
      );
      evaluationResult.notes = this.appendMetadata(
        evaluationResult.notes,
        evaluationMetadata
      );

      return evaluationResult;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to evaluate resume";
      throw new Error(errorMessage);
    }
  }

  /**
   * Gets AI providers configuration with backward compatibility
   * @param settings - Application settings
   * @returns AI providers configuration
   */
  private static getAIProviders(
    settings: ISettings | Partial<ISettings>
  ): IAIProviders {
    let { aiProviders } = settings;

    if (!aiProviders) {
      const legacyGeminiKey = settings.gemini?.gemini_key || "";
      aiProviders = {
        activeProvider: "gemini",
        gemini: {
          api_key: legacyGeminiKey,
          ...DEFAULT_PROVIDER_CONFIGS.gemini,
        },
        openai: {
          api_key: "",
          ...DEFAULT_PROVIDER_CONFIGS.openai,
        },
        anthropic: {
          api_key: "",
          ...DEFAULT_PROVIDER_CONFIGS.anthropic,
        },
        perplexity: {
          api_key: "",
          ...DEFAULT_PROVIDER_CONFIGS.perplexity,
        },
      };
    }

    return aiProviders;
  }

  /**
   * Validates and retrieves API key for the active provider
   * @param aiProviders - AI providers configuration
   * @param activeProvider - Active provider type
   * @returns API key string
   * @throws Error if API key is not found
   */
  private static validateAndGetApiKey(
    aiProviders: IAIProviders,
    activeProvider: AIProviderType
  ): string {
    const apiKey = aiProviders[activeProvider]?.api_key;

    if (!apiKey) {
      throw new Error(
        `API key not found for active provider: ${activeProvider}`
      );
    }

    return apiKey;
  }

  /**
   * Gets evaluation configuration with defaults
   * @param settings - Application settings
   * @returns Evaluation configuration
   */
  private static getEvaluationConfig(
    settings: ISettings | Partial<ISettings>
  ): IEvaluationConfig {
    return settings.evaluationConfig || DEFAULT_EVALUATION_CONFIG;
  }

  /**
   * Builds the evaluation prompt based on configuration
   * @param evaluationConfig - Evaluation configuration
   * @param jobData - Job details
   * @param candidate - Candidate information
   * @returns Evaluation prompt string
   */
  private static buildPrompt(
    evaluationConfig: IEvaluationConfig,
    jobData: JobForEvaluate,
    candidate: ICandidate,
  ): string {
    return evaluationConfig.customPrompt
      ? buildPromptWithCustomTemplate(
          evaluationConfig.customPrompt,
          jobData,
          candidate
        )
      : getEvaluationPrompt(jobData, candidate);
  }

  /**
   * Gets the selected model for the provider
   * @param aiProviders - AI providers configuration
   * @param activeProvider - Active provider type
   * @returns Selected model name
   */
  private static getSelectedModel(
    aiProviders: IAIProviders,
    activeProvider: AIProviderType
  ): string {
    return (
      aiProviders[activeProvider]?.customModel ||
      aiProviders[activeProvider]?.model ||
      ""
    );
  }

  /**
   * Appends metadata to notes string
   * @param notes - Existing notes
   * @param metadata - Metadata to append
   * @returns Combined notes string
   */
  private static appendMetadata(notes: string, metadata: string): string {
    const currentNotes = typeof notes === "string" ? notes : "";
    return currentNotes + metadata;
  }

  /**
   * Filters evaluation result based on enabled settings
   * @param evaluation - Evaluation result
   * @param config - Evaluation configuration
   * @returns Filtered evaluation result
   */
  private static filterEvaluationBySettings(
    evaluation: EvaluationResult,
    config: IEvaluationConfig | Partial<IEvaluationConfig>
  ): EvaluationResult {
    const filtered = { ...evaluation };
    
    if (config.enableConfidenceScores === false) {
      delete filtered.evidenceLinks;
    }
    if (config.enableRedFlagsDetection === false) {
      delete filtered.redFlags;
    }
    if (config.enableSkillsMatrix === false) {
      delete filtered.skillsMatrix;
    }

    return filtered;
  }

  /**
   * Calculates weighted score based on scores and weights
   * @param scores - Score values for each dimension
   * @param weights - Weight values for each dimension
   * @returns Weighted score rounded to 2 decimal places
   */
  static calculateWeightedScore(
    scores: {
      overall: number;
      skills: number;
      experience: number;
      affordability: number;
    },
    weights: {
      overall: number;
      skills: number;
      experience: number;
      affordability: number;
    },
  ): number {
    const numericScores = {
      overall: extractNumericScore(scores.overall, 0),
      skills: extractNumericScore(scores.skills, 0),
      experience: extractNumericScore(scores.experience, 0),
      affordability: extractNumericScore(scores.affordability, 0),
    };

    const numericWeights = {
      overall: extractNumericScore(weights.overall, 0),
      skills: extractNumericScore(weights.skills, 0),
      experience: extractNumericScore(weights.experience, 0),
      affordability: extractNumericScore(weights.affordability, 0),
    };

    const totalWeight =
      numericWeights.overall +
      numericWeights.skills +
      numericWeights.experience +
      numericWeights.affordability;

    if (totalWeight === 0) {
      return (
        (numericScores.overall +
          numericScores.skills +
          numericScores.experience +
          numericScores.affordability) /
        EVALUATION_CONSTANTS.AVERAGE_SCORE_DIVISOR
      );
    }

    const normalizedWeights = {
      overall: numericWeights.overall / totalWeight,
      skills: numericWeights.skills / totalWeight,
      experience: numericWeights.experience / totalWeight,
      affordability: numericWeights.affordability / totalWeight,
    };

    const weightedScore =
      numericScores.overall * normalizedWeights.overall +
      numericScores.skills * normalizedWeights.skills +
      numericScores.experience * normalizedWeights.experience +
      numericScores.affordability * normalizedWeights.affordability;

    if (!isValidNumber(weightedScore)) {
      console.error(
        "Invalid weighted score calculated, returning 0. Scores:",
        numericScores,
        "Weights:",
        numericWeights
      );
      return 0;
    }

    return (
      Math.round(weightedScore * EVALUATION_CONSTANTS.SCORE_DECIMAL_MULTIPLIER) /
      EVALUATION_CONSTANTS.SCORE_DECIMAL_MULTIPLIER
    );
  }
}

// Re-export types for backward compatibility
export type { JobForEvaluate, EvaluationResult } from "./evaluation-types";
