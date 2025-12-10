import { AIProviderFactory } from './factory';
import { AIProviderType } from './types';
import { ICandidate } from '../models/candidate';
import { decryptProviderKeys } from '../encryption';
import logger from '../logger';

interface JobForEvaluate {
  description: string;
  title: string;
  skills: string[];
  salary?: string;
  experience?: number;
}

export interface EvaluationResult {
  overall: number;
  experience: number;
  skills: number;
  education: number;
  projects: number;
  contact: string;
  certifications: number;
  affordability?: number;
  strengths: string[];
  areas_for_improvement: string[];
  recommendation: string;
  notes: string;
  failure?: string;
  // New enhanced evaluation fields
  confidenceScores?: {
    overall: number;
    skills: number;
    experience: number;
    affordability: number;
  };
  evidenceLinks?: {
    overall: string;
    skills: string;
    experience: string;
    affordability: string;
  };
  redFlags?: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    evidence: string;
  }>;

  skillsMatrix?: {
    requiredAndPresent: Array<{
      skill: string;
      yearsOfExperience?: number;
      proficiencyLevel?: string;
      evidence: string;
    }>;
    requiredButMissing: string[];
    presentButNotRequired: string[];
  };
  // Fields calculated after AI evaluation
  weightedScore?: number;
  comparativeRanking?: {
    overallRank: number;
    totalCandidates: number;
    percentile: number;
    skillsPercentile: number;
    experiencePercentile: number;
    affordabilityPercentile: number;
    hasTie: boolean;
    tiedWithCount: number;
    rankingBasedOn: 'overall' | 'weighted';
  };
}

export class AIEvaluationService {
  private static modelUsed: string = '';

  static async evaluateResume(
    resumeBase64: string,
    settings: any,
    jobData: JobForEvaluate,
    candidate: ICandidate,
  ): Promise<EvaluationResult> {
    try {
      // Get AI providers configuration with backward compatibility
      let { aiProviders } = settings;

      // Handle backward compatibility for legacy Gemini-only installations
      if (!aiProviders) {
        // Check if there's a legacy gemini configuration
        const legacyGeminiKey = settings.gemini?.gemini_key || '';

        aiProviders = {
          activeProvider: 'gemini',
          gemini: {
            api_key: legacyGeminiKey,
            model: 'gemini-1.5-flash',
            customModel: '',
          },
          openai: {
            api_key: '',
            model: 'gpt-4o-mini',
            customModel: '',
          },
          anthropic: {
            api_key: '',
            model: 'claude-3-5-sonnet-20241022',
            customModel: '',
          },
          perplexity: {
            api_key: '',
            model: 'sonar-pro',
            customModel: '',
          },
        };
      }

      const activeProvider = aiProviders.activeProvider as AIProviderType;

      const apiKey = aiProviders[activeProvider]?.api_key;

      if (!apiKey) {
        throw new Error(
          `API key not found for active provider: ${activeProvider}`,
        );
      }

      // Get evaluation configuration with defaults
      const evaluationConfig = settings.evaluationConfig || {
        temperature: 0.1,
        customPrompt: null,
        autoEvaluateAllCandidates: false,
        maxPdfPages: 4,
      };

      // Use custom prompt if available, otherwise use default
      const prompt = evaluationConfig.customPrompt
        ? this.buildPromptWithCustomTemplate(
            evaluationConfig.customPrompt,
            jobData,
            candidate,
          )
        : this.getEvaluationPrompt(jobData, candidate);

      // Get the appropriate AI provider
      const provider = AIProviderFactory.getProvider(activeProvider);

      // Get the selected model for this provider
      const selectedModel =
        aiProviders[activeProvider]?.customModel ||
        aiProviders[activeProvider]?.model;

      const response = await provider.evaluateResume(
        resumeBase64,
        apiKey,
        prompt,
        selectedModel,
        evaluationConfig.temperature,
      );

      let evaluationResult = this.parseEvaluationResponse(response);

      // Filter response based on enabled features
      evaluationResult = this.filterEvaluationBySettings(
        evaluationResult,
        evaluationConfig,
      );

      // Add evaluation metadata
      const evaluationMetadata = await this.getEvaluationMetadata(
        activeProvider,
        settings,
      );
      // Ensure notes is a string before concatenation
      const currentNotes =
        typeof evaluationResult.notes === 'string'
          ? evaluationResult.notes
          : '';
      evaluationResult.notes = currentNotes + evaluationMetadata;

      return evaluationResult;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Failed to evaluate resume',
      );
    }
  }

  private static parseEvaluationResponse(response: string): EvaluationResult {
    try {
      // Clean the response - handle multiple formats
      let jsonString = response
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      // If response starts with explanation text, extract JSON
      const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonString = jsonMatch[0];
      }

      let parsedObject;
      try {
        // Try to parse the JSON directly first
        parsedObject = JSON.parse(jsonString);
      } catch (parseError) {
        logger.error(
          'Initial JSON parse failed, attempting to fix common issues.',
          parseError,
        );
      }

      let { redFlags } = parsedObject;
      if (redFlags && Array.isArray(redFlags)) {
        redFlags = redFlags.map((flag: any) => ({
          ...flag,
          severity: flag.severity ? flag.severity.toLowerCase() : flag.severity,
        }));
      }

      // Ensure all required fields exist with defaults
      const result: EvaluationResult = {
        overall: parsedObject.overall || 0,
        experience: parsedObject.experience || 0,
        skills: parsedObject.skills || 0,
        contact: parsedObject.contact || '',
        education: parsedObject.education || 0,
        projects: parsedObject.projects || 0,
        certifications: parsedObject.certifications || 0,
        strengths: parsedObject.strengths || [],
        areas_for_improvement: parsedObject.areas_for_improvement || [],
        recommendation: parsedObject.recommendation || 'Not Recommended',
        notes: parsedObject.notes || '',
        // Handle different field names that AI might use
        affordability: parsedObject.affordability || parsedObject.salary || 0,
        // Enhanced evaluation fields
        confidenceScores: parsedObject.confidenceScores,
        evidenceLinks: parsedObject.evidenceLinks,
        redFlags,
        skillsMatrix: parsedObject.skillsMatrix,
      };

      return result;
    } catch (error) {
      return {
        overall: 5,
        experience: 5,
        skills: 5,
        contact: '',
        education: 0,
        projects: 0,
        certifications: 0,
        strengths: ['Could not parse AI response'],
        areas_for_improvement: ['Could not parse complete AI response'],
        recommendation: 'AI evaluation failed - manual review required',
        notes: `The AI evaluation response could not be fully parsed. Please review the candidate manually. Error: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      };
    }
  }

  private static getEvaluationPrompt(
    jobData: JobForEvaluate,
    candidate: ICandidate,
  ): string {
    const jobDescription = jobData.description.replace(/<[^>]*>/g, ''); // Strip HTML
    const jobTitle = jobData.title;
    const jobSkills = jobData.skills.join(', ');

    return `
    As a seasoned senior technology leader with expertise in talent acquisition, you are conducting a rigorous evaluation of a candidate. You must evaluate each dimension independently and avoid giving similar scores across categories.

    Job Details:
    - Job Title: ${jobTitle}
    - Job Description: ${jobDescription}
    - Job Salary: ${jobData.salary}
    - Candidate's Current salary: ${candidate.currentCTC}
    - Candidate's Expected salary: ${candidate.expectedCTC}
    - Required Skills: ${jobSkills}

    EVALUATION FRAMEWORK - Each category must be scored independently:

    **SKILLS ASSESSMENT (1-10) - TECHNICAL FOCUS ONLY:**
    - Evaluate ONLY technical/hard skills mentioned in CV vs. job requirements

    **EXPERIENCE ASSESSMENT (1-10) - WORK HISTORY FOCUS ONLY:**
    Evaluate ONLY professional work experience relevance and duration:

    **AFFORDABILITY ASSESSMENT (1-10):**
    IMPORTANT: First normalize salary formats before comparison:
    - If candidate expectation is >1000 (e.g., 34000, 45000): Treat as monthly salary in thousands, convert to LPA by dividing by 1000 and multiplying by 12
    - If candidate expectation is ≤100 (e.g., 34, 45): Treat as LPA (Lakhs Per Annum)
    - Apply same logic to job salary for comparison

    *After normalization, compare candidate's expected CTC with job salary*

    **OVERALL SUITABILITY (1-10):**
    - Consider all the scores, and calculate the overall score of candidate.

    CRITICAL INSTRUCTIONS:
    1. Each score must reflect the specific criteria above
    2. Be strict and objective - average candidates should receive 4-6 scores, not 7-8
    3. Skills score should ONLY consider technical abilities, not soft skills or education
    4. Experience score should ONLY consider relevant work history duration and domain match
    5. After normalization, compare candidate's expected CTC with job salary
    6. Make sure the notes does not reveal the salary indicators or salary amount in response. We will use salary info and normalization only in evaluation and calculating affordability score.
    8. **MANDATORY EVIDENCE LINKS - BE SPECIFIC & CONVINCING:**
       - DO NOT write "Resume Section: X" or "Found in Y section"
       - DO write detailed evidence with actual facts: company names, years, specific skills, numbers
       - Example: Instead of "Skills in resume", write "Lists React (5 yrs), Node.js (4 yrs) in Skills section; built e-commerce platform using React/Redux at TechCorp (2020-2024)"
       - Each evidence should convince an interviewer WHY your score is justified

    **EVIDENCE ATTRIBUTION IS MANDATORY - MUST BE CONVINCING:**
    - You MUST provide DETAILED, SPECIFIC evidence that JUSTIFIES each score
    - NEVER use generic phrases like "Resume Section: Skills" or "Found in Work Experience"
    - Include specific facts: company names, years, skills with experience duration, projects
    - Each evidenceLink must be 1-2 sentences with concrete details
    - IMPORTANT: Ensure all text in JSON values is properly escaped (use simple quotes, avoid special characters)
    - Example formats:
      ✓ Skills: "Lists React (5yrs), Node.js (4yrs), TypeScript (3yrs). Built payment gateway at FinTech Corp using React. Matches 8/10 required skills"
      ✓ Experience: "8 years total - 5 years at TechCorp as Senior Dev in fintech, 3 years at StartupXYZ in e-commerce. Domain relevant"
      ✓ Affordability: "Current 12 LPA, expects 15 LPA. Budget 12-18 LPA. Fits mid-range with 25% standard increment"

    CRITICAL: Return ONLY valid JSON, no additional text before or after. Ensure all strings are properly formatted. and All numeric fields must be numbers only. Never return strings like "Not specified". 
              If a numeric value is unknown, return 0.
 
    IMPORTANT RULE: 
    - Never use severity values other than "low", "medium", or "high".
    - Do NOT use: "critical", "severe", "major", "urgent", or any custom value.

    Return your evaluation in this JSON format:
    {
      "overall": // Overall suitability score (1-10) with brief justification
      "skills": // Technical skills match score (1-10) with specific skill gaps/matches noted
      "experience": // Work experience relevance score (1-10) with years and domain relevance noted
      "contact": // Parse and extract contact number from the CV in string format
      "affordability": // Salary alignment score (1-10) with calculation shown (include normalization logic)
      "strengths": // Maximum 4 bullet points of genuine strengths from CV
      "areas_for_improvement": // Maximum 4 bullet points of specific gaps or weaknesses
      "recommendation": // One of: "Strongly Recommend", "Recommend", "Consider with Reservations", "Not Recommended"
      "notes": // One liner notes Specific evidence from CV that influenced your scoring.
      "confidenceScores": { // Your confidence level (0-1) for each score
        "overall": 0.85, // How confident you are in the overall score
        "skills": 0.90, // Confidence in skills assessment
        "experience": 0.80, // Confidence in experience evaluation
        "affordability": 0.75 // Confidence in affordability calculation
      },
      "evidenceLinks": { // REQUIRED: 1-2 sentences with specific facts - companies, years, skills, numbers
        "overall": "Senior Developer at TechCorp (2019-2024) with React and Node.js matching our stack. Led 3 teams and 20+ projects. Expected 15 LPA fits budget range",
        "skills": "Lists React (5yrs), Node.js (5yrs), TypeScript (3yrs), AWS (2yrs) - matches 8/10 required. Built e-commerce platform and microservices API. Missing: Kubernetes, GraphQL",
        "experience": "8 years total - TechCorp (2019-2024, 5yrs) Senior Dev in fintech domain, StartupXYZ (2016-2019, 3yrs) in e-commerce. Shows clear progression",
        "affordability": "Current 12 LPA, expects 15 LPA (25% hike). Job budget 12-18 LPA. Fits mid-range with standard increment"
      },
      "redFlags": [ // Array of potential concerns (if any)
        {
          "type": "employment_gap", // Type: employment_gap, job_hopping, overqualification, salary_mismatch, missing_info, resume_quality
          "severity": "medium", // low, medium, high
          "description": "6-month gap between jobs in 2022",
          "evidence": "Employment timeline shows gap from Jan-Jun 2022"
        }
      ],
      "skillsMatrix": { // Detailed skills breakdown
        "requiredAndPresent": [
          {
            "skill": "React",
            "yearsOfExperience": 5,
            "proficiencyLevel": "Expert",
            "evidence": "Led React migration project, built component library"
          }
        ],
        "requiredButMissing": ["TypeScript", "AWS Lambda"], // Skills required but not in CV
        "presentButNotRequired": ["Python", "Docker"] // Additional skills candidate has
      },
     
    }

    SALARY NORMALIZATION EXAMPLES:
    - Candidate says "34000 expected": 34000 ÷ 1000 × 12 = 4.08 LPA
    - Candidate says "34 LPA expected": 34 LPA (no conversion needed)
    - Candidate says "45000 current, 50000 expected": 50000 ÷ 1000 × 12 = 6 LPA expected

    Below is the CV content for evaluation:
    `;
  }

  private static buildPromptWithCustomTemplate(
    customPrompt: string,
    jobData: JobForEvaluate,
    candidate: ICandidate,
  ): string {
    const jobDescription = jobData.description.replace(/<[^>]*>/g, ''); // Strip HTML
    const jobTitle = jobData.title;
    const jobSkills = jobData.skills.join(', ');
    const ctcRange = jobData.salary || 'Not specified';
    const experience = jobData.experience
      ? `${jobData.experience} years`
      : 'Not specified';

    // Replace placeholders with actual values
    let prompt = customPrompt
      .replace(/\{\{JOB_TITLE\}\}/g, jobTitle)
      .replace(/\{\{JOB_DESCRIPTION\}\}/g, jobDescription)
      .replace(/\{\{JOB_SALARY\}\}/g, ctcRange)
      .replace(/\{\{CTC_RANGE\}\}/g, ctcRange)
      .replace(/\{\{EXPERIENCE\}\}/g, experience)
      .replace(/\{\{REQUIRED_SKILLS\}\}/g, jobSkills)
      .replace(/\{\{CANDIDATE_CURRENT_CTC\}\}/g, String(candidate.currentCTC))
      .replace(
        /\{\{CANDIDATE_EXPECTED_CTC\}\}/g,
        String(candidate.expectedCTC),
      );

    // Ensure the JSON format instruction is always present at the end if not in custom prompt
    if (!prompt.includes('Return your evaluation in this JSON format')) {
      prompt += `

    IMPORTANT: Return your evaluation in this exact JSON format:
    {
      "overall": number (1-10),
      "skills": number (1-10),
      "experience": number (1-10),
      "contact": string,
      "affordability": number (1-10),
      "strengths": array of strings (max 4),
      "areas_for_improvement": array of strings (max 4),
      "recommendation": string,
      "notes": string,
      "confidenceScores": {
        "overall": number (0-1),
        "skills": number (0-1),
        "experience": number (0-1),
        "affordability": number (0-1)
      },
      "evidenceLinks": {
        "overall": "DETAILED evidence with facts - NOT just 'Resume Section: X'. Include companies, years, specific achievements that justify the score",
        "skills": "List SPECIFIC skills found, years of experience, projects. E.g., 'React (5yrs), Node.js (4yrs) listed; built payment gateway using React at FinTech Corp'",
        "experience": "Mention SPECIFIC companies, roles, years, domain relevance. E.g., '8 years: TechCorp (5yrs, fintech), StartupXYZ (3yrs, e-commerce)'",
        "affordability": "Show CALCULATION: 'Current 12 LPA, Expected 15 LPA (25% jump), Budget 12-18 LPA - fits mid-range'"
      },
      "redFlags": array of objects [
     {
    "type": string,
    "severity": string ("low" | "medium" | "high" ONLY — do NOT use any other values),
    "description": string,
    "evidence": string
   },
],

      "skillsMatrix": {
  "requiredAndPresent": array of objects [
    {
      "skill": string,
      "yearsOfExperience": number (0 if unknown; do NOT use strings),
      "proficiencyLevel": string(Not Present if unknown),
      "evidence": string
    }
  ],
  "requiredButMissing": array of strings,
  "presentButNotRequired": array of strings
}

    }`;
    }

    return prompt;
  }

  private static async getEvaluationMetadata(
    provider: AIProviderType,
    settings: any,
  ): Promise<string> {
    const now = new Date();

    // Get the user's timezone from settings, fallback to UTC
    const userTimezone = settings?.timeZone?.name || 'UTC';

    // Format date and time using user's timezone
    const dateStr = now.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: userTimezone,
    });
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: userTimezone,
    });

    const providerNames = {
      gemini: 'Google Gemini',
      openai: 'OpenAI',
      anthropic: 'Anthropic Claude',
      perplexity: 'Perplexity AI',
    };

    const providerName = providerNames[provider] || provider;

    return `\n\nEvaluated by ${providerName} ${this.modelUsed ? `using ${this.modelUsed}` : ''} on ${dateStr} at ${timeStr}`;
  }

  private static filterEvaluationBySettings(
    evaluation: EvaluationResult,
    config: any,
  ): EvaluationResult {
    // Remove fields that are disabled in settings
    if (config.enableConfidenceScores === false) {
      delete evaluation.confidenceScores;
      delete evaluation.evidenceLinks;
    }
    if (config.enableRedFlagsDetection === false) {
      delete evaluation.redFlags;
    }
    if (config.enableSkillsMatrix === false) {
      delete evaluation.skillsMatrix;
    }

    return evaluation;
  }

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
    // Normalize weights to sum to 100
    const totalWeight =
      weights.overall +
      weights.skills +
      weights.experience +
      weights.affordability;

    if (totalWeight === 0) {
      // If no weights set, return simple average
      return (
        (scores.overall +
          scores.skills +
          scores.experience +
          (scores.affordability || 0)) /
        4
      );
    }

    const normalizedWeights = {
      overall: weights.overall / totalWeight,
      skills: weights.skills / totalWeight,
      experience: weights.experience / totalWeight,
      affordability: weights.affordability / totalWeight,
    };

    // Calculate weighted score
    const weightedScore =
      scores.overall * normalizedWeights.overall +
      scores.skills * normalizedWeights.skills +
      scores.experience * normalizedWeights.experience +
      (scores.affordability || 0) * normalizedWeights.affordability;

    return Math.round(weightedScore * 100) / 100; // Round to 2 decimal places
  }
}
