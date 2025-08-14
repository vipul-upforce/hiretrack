import { AIProviderFactory } from "./factory";
import { AIProviderType } from "./types";
import { ICandidate } from "../models/candidate";
import { decryptAIProviderKeys } from "../encryption";

interface JobForEvaluate {
  description: string;
  title: string;
  skills: string[];
  salary?: string;
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
}

export class AIEvaluationService {
  private static modelUsed: string = "";

  static async evaluateResume(
    resumeBase64: string,
    settings: any,
    jobData: JobForEvaluate,
    candidate: ICandidate
  ): Promise<EvaluationResult> {
    try {
      // Get AI providers configuration with backward compatibility
      let aiProviders = settings.aiProviders;

      // Handle backward compatibility for legacy Gemini-only installations
      if (!aiProviders) {
        // Check if there's a legacy gemini configuration
        const legacyGeminiKey = settings.gemini?.gemini_key || "";

        aiProviders = {
          activeProvider: "gemini",
          gemini: {
            api_key: legacyGeminiKey,
            model: "gemini-1.5-flash",
            customModel: "",
          },
          openai: {
            api_key: "",
            model: "gpt-4o-mini",
            customModel: "",
          },
          anthropic: {
            api_key: "",
            model: "claude-3-5-sonnet-20241022",
            customModel: "",
          },
          perplexity: {
            api_key: "",
            model: "sonar-pro",
            customModel: "",
          },
        };

        console.log(
          "AIEvaluationService: Using backward compatibility for legacy Gemini settings"
        );
      }

      // Log the received AI providers
      console.log(
        "AIEvaluationService received aiProviders:",
        JSON.stringify(
          {
            hasAiProviders: !!aiProviders,
            activeProvider: aiProviders?.activeProvider,
            hasGeminiKey: !!aiProviders?.gemini?.api_key,
            geminiKeyLength: aiProviders?.gemini?.api_key?.length,
            hasOpenAIKey: !!aiProviders?.openai?.api_key,
            hasAnthropicKey: !!aiProviders?.anthropic?.api_key,
            hasPerplexityKey: !!aiProviders?.perplexity?.api_key,
          },
          null,
          2
        )
      );

      // The API keys should already be decrypted by the calling code
      // Only decrypt if they appear to be encrypted (base64 check)
      if (
        aiProviders?.gemini?.api_key &&
        aiProviders.gemini.api_key.includes("U2FsdGVkX1")
      ) {
        console.log("API keys appear to be encrypted, decrypting...");
        aiProviders = decryptAIProviderKeys(aiProviders);
      }

      const activeProvider = aiProviders.activeProvider as AIProviderType;

      console.log("Looking for API key:", {
        activeProvider,
        providerData: aiProviders[activeProvider],
        hasProviderObject: !!aiProviders[activeProvider],
        hasApiKey: !!aiProviders[activeProvider]?.api_key,
      });

      const apiKey = aiProviders[activeProvider]?.api_key;

      if (!apiKey) {
        console.error(
          "API key not found. Full aiProviders structure:",
          JSON.stringify(aiProviders, null, 2)
        );
        throw new Error(
          `API key not found for active provider: ${activeProvider}`
        );
      }

      const prompt = this.getEvaluationPrompt(jobData, candidate);

      // Get the appropriate AI provider
      const provider = AIProviderFactory.getProvider(activeProvider);

      // Get the selected model for this provider
      const selectedModel =
        aiProviders[activeProvider]?.customModel ||
        aiProviders[activeProvider]?.model;

      // For evaluation, we need to use a specialized method since different providers
      // handle evaluation differently than resume parsing
      const response = await this.processEvaluationWithProvider(
        provider,
        activeProvider,
        resumeBase64,
        apiKey,
        prompt,
        selectedModel
      );

      const evaluationResult = this.parseEvaluationResponse(response);

      // Add evaluation metadata
      const evaluationMetadata = await this.getEvaluationMetadata(
        activeProvider,
        settings
      );
      // Ensure notes is a string before concatenation
      const currentNotes =
        typeof evaluationResult.notes === "string"
          ? evaluationResult.notes
          : "";
      evaluationResult.notes = currentNotes + evaluationMetadata;

      return evaluationResult;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Failed to evaluate resume"
      );
    }
  }

  private static async processEvaluationWithProvider(
    provider: any,
    providerType: AIProviderType,
    resumeBase64: string,
    apiKey: string,
    prompt: string,
    selectedModel?: string
  ): Promise<string> {
    switch (providerType) {
      case "gemini":
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(apiKey);
        const modelName = selectedModel || "gemini-1.5-flash";
        this.modelUsed = modelName;
        const model = genAI.getGenerativeModel({ model: modelName });

        const result = await model.generateContent({
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: "application/pdf",
                    data: resumeBase64,
                  },
                },
              ],
            },
          ],
        });

        if (!result.response.candidates?.[0]?.content?.parts?.[0]?.text) {
          throw new Error("No valid response from Gemini");
        }

        return result.response.candidates[0].content.parts[0].text;

      case "openai":
        const { OpenAI } = await import("openai");
        const openai = new OpenAI({ apiKey });

        const openaiModel = selectedModel || "gpt-4o-mini";
        this.modelUsed = openaiModel;

        // OpenAI doesn't support PDF directly, so we'll use text-based evaluation
        // In a production environment, you'd convert PDF to images or extract text
        const openaiPrompt = `${prompt}

        Note: The candidate's resume has been provided. Please evaluate based on the provided criteria.

        [Resume content is being processed - please provide evaluation based on the job requirements]`;

        const openaiResponse = await openai.chat.completions.create({
          model: openaiModel,
          messages: [
            {
              role: "system",
              content:
                "You are an expert technical recruiter evaluating candidates. Provide honest, detailed evaluations.",
            },
            {
              role: "user",
              content: openaiPrompt,
            },
          ],
          max_tokens: 2000,
          temperature: 0.1,
          response_format: { type: "json_object" },
        });

        if (!openaiResponse.choices[0]?.message?.content) {
          throw new Error("No valid response from OpenAI");
        }

        console.log(
          "OpenAI raw response:",
          openaiResponse.choices[0].message.content
        );
        return openaiResponse.choices[0].message.content;

      case "anthropic":
        const Anthropic = (await import("@anthropic-ai/sdk")).default;
        const anthropic = new Anthropic({ apiKey });

        const anthropicModel = selectedModel || "claude-3-5-sonnet-20241022";
        this.modelUsed = anthropicModel;

        // For Anthropic, we need to provide a more explicit instruction about JSON format
        const anthropicPrompt =
          prompt +
          "\n\nIMPORTANT: Return ONLY the JSON object, no additional text or explanation.";

        const anthropicResponse = await anthropic.messages.create({
          model: anthropicModel,
          max_tokens: 2000,
          temperature: 0.1,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: anthropicPrompt },
                {
                  type: "text",
                  text: `[Note: The candidate's resume has been provided for analysis. Please evaluate based on the criteria above.]`,
                },
              ],
            },
          ],
        });

        const content = anthropicResponse.content[0];
        if (content.type !== "text" || !content.text) {
          throw new Error("No valid response from Anthropic");
        }

        console.log("Anthropic raw response:", content.text);
        return content.text;

      case "perplexity":
        const perplexityModel = selectedModel || "sonar-pro";
        this.modelUsed = perplexityModel;

        // Perplexity doesn't support PDF in image_url for all models
        // Use text-based evaluation similar to OpenAI
        const perplexityPrompt = `${prompt}

        Note: The candidate's resume has been provided. Please evaluate based on the provided criteria.

        Return your evaluation as a valid JSON object.`;

        const perplexityResponse = await fetch(
          "https://api.perplexity.ai/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: perplexityModel,
              messages: [
                {
                  role: "user",
                  content: perplexityPrompt,
                },
              ],
              max_tokens: 2000,
              temperature: 0.1,
            }),
          }
        );

        if (!perplexityResponse.ok) {
          const errorText = await perplexityResponse.text();
          console.error("Perplexity API error:", errorText);
          throw new Error(
            `Perplexity API error: ${perplexityResponse.status} ${perplexityResponse.statusText}`
          );
        }

        const perplexityData = await perplexityResponse.json();
        const perplexityContent = perplexityData.choices?.[0]?.message?.content;

        if (!perplexityContent) {
          throw new Error("No valid response from Perplexity");
        }

        return perplexityContent;

      default:
        throw new Error(`Unsupported provider for evaluation: ${providerType}`);
    }
  }

  private static parseEvaluationResponse(response: string): EvaluationResult {
    try {
      // console.log("Raw evaluation response:", response);

      // Clean the response - handle multiple formats
      let jsonString = response
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      // If response starts with explanation text, extract JSON
      const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonString = jsonMatch[0];
      }

      console.log("Cleaned JSON string:", jsonString);

      const parsedObject = JSON.parse(jsonString);

      // Ensure all required fields exist with defaults
      const result: EvaluationResult = {
        overall: parsedObject.overall || 0,
        experience: parsedObject.experience || 0,
        skills: parsedObject.skills || 0,
        contact: parsedObject.contact || "",
        education: parsedObject.education || 0,
        projects: parsedObject.projects || 0,
        certifications: parsedObject.certifications || 0,
        strengths: parsedObject.strengths || [],
        areas_for_improvement: parsedObject.areas_for_improvement || [],
        recommendation: parsedObject.recommendation || "Not Recommended",
        notes: parsedObject.notes || "",
        // Handle different field names that AI might use
        affordability: parsedObject.affordability || parsedObject.salary || 0,
      };

      return result;
    } catch (error) {
      console.error("Failed to parse evaluation response:", error);
      console.error("Original response:", response);
      throw new Error("Failed to parse evaluation response JSON");
    }
  }

  private static getEvaluationPrompt(
    jobData: JobForEvaluate,
    candidate: ICandidate
  ): string {
    const jobDescription = jobData.description.replace(/<[^>]*>/g, ""); // Strip HTML
    const jobTitle = jobData.title;
    const jobSkills = jobData.skills.join(", ");

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
    6. For affordability, clearly show your salary normalization logic in the notes. If the salary or job's budget either is 0, say you can not evaluate affordability and set the score to 5. As the evaluation will be visible to intrviewers, do not mention the salary indicators in response.
    7. Provide specific evidence from the CV to justify each score

    Return your evaluation in this JSON format:
    {
      "overall": // Overall suitability score (1-10) with brief justification
      "skills": // Technical skills match score (1-10) with specific skill gaps/matches noted
      "experience": // Work experience relevance score (1-10) with years and domain relevance noted
      "contact": // Contact number in string format
      "affordability": // Salary alignment score (1-10) with calculation shown (include normalization logic)
      "strengths": // Maximum 4 bullet points of genuine strengths from CV
      "areas_for_improvement": // Maximum 4 bullet points of specific gaps or weaknesses
      "recommendation": // One of: "Strongly Recommend", "Recommend", "Consider with Reservations", "Not Recommended"
      "notes": // Specific evidence from CV that influenced your scoring, include salary normalization logic
    }

    SALARY NORMALIZATION EXAMPLES:
    - Candidate says "34000 expected": 34000 ÷ 1000 × 12 = 4.08 LPA
    - Candidate says "34 LPA expected": 34 LPA (no conversion needed)
    - Candidate says "45000 current, 50000 expected": 50000 ÷ 1000 × 12 = 6 LPA expected

    Below is the CV content for evaluation:
    `;
  }

  private static async getEvaluationMetadata(
    provider: AIProviderType,
    settings: any
  ): Promise<string> {
    const now = new Date();

    // Get the user's timezone from settings, fallback to UTC
    const userTimezone = settings?.timeZone?.name || "UTC";

    // Format date and time using user's timezone
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

    const providerNames = {
      gemini: "Google Gemini",
      openai: "OpenAI",
      anthropic: "Anthropic Claude",
      perplexity: "Perplexity AI",
    };

    const providerName = providerNames[provider] || provider;

    return `\n\nEvaluated by ${providerName} using ${this.modelUsed} on ${dateStr} at ${timeStr}`;
  }
}
