import { AIProviderFactory } from "./factory";
import { AIProviderType } from "./types";
import { ICandidate } from "../models/candidate";
import { decryptProviderKeys } from "../encryption";

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
    severity: "low" | "medium" | "high";
    description: string;
    evidence: string;
  }>;
  interviewQuestions?: Array<{
    category: string;
    question: string;
    reason: string;
    priority: "high" | "medium" | "low";
    suggestedAnswer?: string;
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
    rankingBasedOn: "overall" | "weighted";
  };
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
      // if (
      //   aiProviders?.gemini?.api_key &&
      //   aiProviders.gemini.api_key.includes("U2FsdGVkX1")
      // ) {
      //   console.log("API keys appear to be encrypted, decrypting...");
      //   aiProviders = decryptProviderKeys(
      //     aiProviders,
      //     candidate.organizationId
      //   );
      // }

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
            candidate
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
        evaluationConfig.temperature
      );

      let evaluationResult = this.parseEvaluationResponse(response);

      // Filter response based on enabled features
      evaluationResult = this.filterEvaluationBySettings(
        evaluationResult,
        evaluationConfig
      );

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

  // private static async processEvaluationWithProvider(
  //   provider: any,
  //   providerType: AIProviderType,
  //   resumeBase64: string,
  //   apiKey: string,
  //   prompt: string,
  //   selectedModel?: string
  // ): Promise<string> {
  //   switch (providerType) {
  //     case "gemini":
  //       const { GoogleGenerativeAI } = await import("@google/generative-ai");
  //       const genAI = new GoogleGenerativeAI(apiKey);
  //       const modelName = selectedModel || "gemini-1.5-flash";
  //       this.modelUsed = modelName;
  //       const model = genAI.getGenerativeModel({ model: modelName });

  //       const result = await model.generateContent({
  //         contents: [
  //           {
  //             role: "user",
  //             parts: [
  //               { text: prompt },
  //               {
  //                 inlineData: {
  //                   mimeType: "application/pdf",
  //                   data: resumeBase64,
  //                 },
  //               },
  //             ],
  //           },
  //         ],
  //       });

  //       if (!result.response.candidates?.[0]?.content?.parts?.[0]?.text) {
  //         throw new Error("No valid response from Gemini");
  //       }

  //       return result.response.candidates[0].content.parts[0].text;

  //     case "openai":
  //       const { OpenAI } = await import("openai");
  //       const openai = new OpenAI({ apiKey });

  //       const openaiModel = selectedModel || "gpt-4o-mini";
  //       this.modelUsed = openaiModel;

  //       // OpenAI doesn't support PDF directly, so we'll use text-based evaluation
  //       // In a production environment, you'd convert PDF to images or extract text
  //       const openaiPrompt = `${prompt}

  //       Note: The candidate's resume has been provided. Please evaluate based on the provided criteria.

  //       [Resume content is being processed - please provide evaluation based on the job requirements]`;

  //       const openaiResponse = await openai.chat.completions.create({
  //         model: openaiModel,
  //         messages: [
  //           {
  //             role: "system",
  //             content:
  //               "You are an expert technical recruiter evaluating candidates. Provide honest, detailed evaluations.",
  //           },
  //           {
  //             role: "user",
  //             content: openaiPrompt,
  //           },
  //         ],
  //         max_tokens: 2000,
  //         temperature: 0.1,
  //         response_format: { type: "json_object" },
  //       });

  //       if (!openaiResponse.choices[0]?.message?.content) {
  //         throw new Error("No valid response from OpenAI");
  //       }

  //       console.log(
  //         "OpenAI raw response:",
  //         openaiResponse.choices[0].message.content
  //       );
  //       return openaiResponse.choices[0].message.content;

  //     case "anthropic":
  //       const Anthropic = (await import("@anthropic-ai/sdk")).default;
  //       const anthropic = new Anthropic({ apiKey });

  //       const anthropicModel = selectedModel || "claude-3-5-sonnet-20241022";
  //       this.modelUsed = anthropicModel;

  //       // For Anthropic, we need to provide a more explicit instruction about JSON format
  //       const anthropicPrompt =
  //         prompt +
  //         "\n\nIMPORTANT: Return ONLY the JSON object, no additional text or explanation.";

  //       const anthropicResponse = await anthropic.messages.create({
  //         model: anthropicModel,
  //         max_tokens: 2000,
  //         temperature: 0.1,
  //         messages: [
  //           {
  //             role: "user",
  //             content: [
  //               { type: "text", text: anthropicPrompt },
  //               {
  //                 type: "text",
  //                 text: `[Note: The candidate's resume has been provided for analysis. Please evaluate based on the criteria above.]`,
  //               },
  //             ],
  //           },
  //         ],
  //       });

  //       const content = anthropicResponse.content[0];
  //       if (content.type !== "text" || !content.text) {
  //         throw new Error("No valid response from Anthropic");
  //       }

  //       console.log("Anthropic raw response:", content.text);
  //       return content.text;

  //     case "perplexity":
  //       const perplexityModel = selectedModel || "sonar-pro";
  //       this.modelUsed = perplexityModel;

  //       // Perplexity doesn't support PDF in image_url for all models
  //       // Use text-based evaluation similar to OpenAI
  //       const perplexityPrompt = `${prompt}

  //       Note: The candidate's resume has been provided. Please evaluate based on the provided criteria.

  //       Return your evaluation as a valid JSON object.`;

  //       const perplexityResponse = await fetch(
  //         "https://api.perplexity.ai/chat/completions",
  //         {
  //           method: "POST",
  //           headers: {
  //             Authorization: `Bearer ${apiKey}`,
  //             "Content-Type": "application/json",
  //           },
  //           body: JSON.stringify({
  //             model: perplexityModel,
  //             messages: [
  //               {
  //                 role: "user",
  //                 content: perplexityPrompt,
  //               },
  //             ],
  //             max_tokens: 2000,
  //             temperature: 0.1,
  //           }),
  //         }
  //       );

  //       if (!perplexityResponse.ok) {
  //         const errorText = await perplexityResponse.text();
  //         console.error("Perplexity API error:", errorText);
  //         throw new Error(
  //           `Perplexity API error: ${perplexityResponse.status} ${perplexityResponse.statusText}`
  //         );
  //       }

  //       const perplexityData = await perplexityResponse.json();
  //       const perplexityContent = perplexityData.choices?.[0]?.message?.content;

  //       if (!perplexityContent) {
  //         throw new Error("No valid response from Perplexity");
  //       }

  //       return perplexityContent;

  //     default:
  //       throw new Error(`Unsupported provider for evaluation: ${providerType}`);
  //   }
  // }

  private static parseEvaluationResponse(response: string): EvaluationResult {
    try {
      console.log("Raw evaluation response:", response);

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

      let parsedObject;
      try {
        // Try to parse the JSON directly first
        parsedObject = JSON.parse(jsonString);

        // Debug: Log raw interview questions from AI
        console.log(
          "🔍 Raw interviewQuestions from AI:",
          JSON.stringify(parsedObject.interviewQuestions, null, 2)
        );
      } catch (parseError) {
        console.error("JSON Parse Error:", parseError);
        console.error(
          "Failed JSON string (first 1000 chars):",
          jsonString.substring(0, 1000)
        );
        console.error(
          "Failed JSON string (last 500 chars):",
          jsonString.substring(Math.max(0, jsonString.length - 500))
        );

        // Attempt to fix common JSON parsing issues
        console.log("Attempting to fix malformed JSON...");

        // Fix 1: Try to repair truncated interview questions
        try {
          // Find where interviewQuestions array starts
          const interviewQuestionsMatch = jsonString.match(
            /"interviewQuestions"\s*:\s*\[/
          );
          if (interviewQuestionsMatch) {
            const startPos = interviewQuestionsMatch.index;
            if (startPos) {
              // Get the part before interviewQuestions
              const beforePart = jsonString.substring(0, startPos);

              // Create a simplified valid JSON by closing the structure
              const fixedJson = beforePart + '"interviewQuestions": []}';
              parsedObject = JSON.parse(fixedJson);
              console.log(
                "Successfully parsed JSON with truncated interviewQuestions"
              );

              // Set interviewQuestions to empty array since it was malformed
              parsedObject.interviewQuestions = [];
            }
          } else {
            // Fix 2: Try to extract the main evaluation data without problematic fields
            const regex =
              /\{\s*"overall"\s*:\s*(\d+)\s*,\s*"skills"\s*:\s*(\d+)\s*,\s*"experience"\s*:\s*(\d+)\s*,\s*"contact"\s*:\s*"([^"]*)"\s*,\s*"affordability"\s*:\s*(\d+)\s*,\s*"strengths"\s*:\s*(\[[^\[\]]*\])\s*,\s*"areas_for_improvement"\s*:\s*(\[[^\[\]]*\])\s*,\s*"recommendation"\s*:\s*"([^"]*)"\s*,\s*"notes"\s*:\s*"([^"]*)"\s*/;

            const match = jsonString.match(regex);
            if (match) {
              console.log(
                "Extracting core evaluation data from malformed JSON"
              );
              parsedObject = {
                overall: parseInt(match[1]),
                skills: parseInt(match[2]),
                experience: parseInt(match[3]),
                contact: match[4],
                affordability: parseInt(match[5]),
                strengths: JSON.parse(match[6]),
                areas_for_improvement: JSON.parse(match[7]),
                recommendation: match[8],
                notes: match[9],
              };
            } else {
              throw new Error("Could not extract core evaluation data");
            }
          }
        } catch (repairError) {
          console.error("Failed to repair JSON:", repairError);
          throw parseError; // Throw the original error if repair fails
        }
      }

      // Normalize interview questions priority and red flags severity to lowercase
      let interviewQuestions = parsedObject.interviewQuestions;
      if (interviewQuestions && Array.isArray(interviewQuestions)) {
        interviewQuestions = interviewQuestions.map((q: any) => {
          // Normalize field names (handle different casing from AI)
          const suggestedAnswer =
            q.suggestedAnswer ||
            q.suggested_answer ||
            q.SuggestedAnswer ||
            q.suggestedanswer;
          console.log("🔍 Processing interview question:", {
            hasQuestion: !!q.question,
            hasSuggestedAnswer: !!suggestedAnswer,
            originalKeys: Object.keys(q),
          });
          return {
            ...q,
            priority: q.priority ? q.priority.toLowerCase() : q.priority,
            suggestedAnswer: suggestedAnswer, // Ensure it's in camelCase
          };
        });
      }

      let redFlags = parsedObject.redFlags;
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
        // Enhanced evaluation fields
        confidenceScores: parsedObject.confidenceScores,
        evidenceLinks: parsedObject.evidenceLinks,
        redFlags: redFlags,
        skillsMatrix: parsedObject.skillsMatrix,
        interviewQuestions: interviewQuestions,
      };

      return result;
    } catch (error) {
      console.error("Failed to parse evaluation response:", error);
      console.error("Original response:", response);

      // Create a minimal valid response as fallback
      console.warn("Creating fallback evaluation response");
      return {
        overall: 5,
        experience: 5,
        skills: 5,
        contact: "",
        education: 0,
        projects: 0,
        certifications: 0,
        strengths: ["Could not parse AI response"],
        areas_for_improvement: ["Could not parse complete AI response"],
        recommendation: "AI evaluation failed - manual review required",
        notes:
          "The AI evaluation response could not be fully parsed. Please review the candidate manually. Error: " +
          (error instanceof Error ? error.message : "Unknown error"),
      };
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
    6. Make sure the notes does not reveal the salary indicators or salary amount in response. We will use salary info and normalization only in evaluation and calculating affordability score.
    7. **MANDATORY SCREENING QUESTIONS WITH SUGGESTED ANSWERS:**
       - Generate EXACTLY 5-6 relevant screening questions based on the candidate's profile
       - MINIMUM 5 QUESTIONS REQUIRED - DO NOT generate fewer than 5 questions
       - EVERY question MUST include a "suggestedAnswer" field
       - The suggestedAnswer should guide the interviewer on what to listen for in a strong response
       - Include specific technical details, metrics, or evidence the interviewer should expect
       - MUST include these question categories (minimum 5 total):
         * REQUIRED: 1 question about client communication experience (especially foreign/international clients)
         * REQUIRED: 1-2 technical skills questions based on the role
         * REQUIRED: 1 problem-solving or debugging question
         * REQUIRED: 1-2 behavioral or soft skills questions
         * Questions should be practical and help screen candidates effectively during initial rounds
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

    CRITICAL: Return ONLY valid JSON, no additional text before or after. Ensure all strings are properly formatted.

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
      "interviewQuestions": [
        {
          "category": "Client Communication",
          "question": "Have you worked directly with foreign or international clients? Can you describe your experience?",
          "reason": "To assess international client communication skills and cross-cultural collaboration",
          "priority": "high",
          "suggestedAnswer": "Look for: specific examples of working with clients from different countries/time zones, communication methods used (email, calls, video conferences), handling of language barriers or cultural differences, ability to understand and document client requirements clearly. Strong answer includes: client names/regions, project outcomes, communication frequency, and how they managed expectations."
        },
        {
          "category": "Technical Skills",
          "question": "Can you walk me through your most complex React project?",
          "reason": "Resume mentions React but lacks specific project details",
          "priority": "high",
          "suggestedAnswer": "Look for: discussion of component architecture, state management approach (Redux/Context), performance optimization, team collaboration. Strong answer includes specific metrics (load time improvements, user count) and technical challenges overcome."
        },
        {
          "category": "Problem Solving",
          "question": "Describe a challenging bug you fixed recently",
          "reason": "To assess debugging and problem-solving skills",
          "priority": "high",
          "suggestedAnswer": "Strong answer includes: systematic debugging approach, root cause analysis, technical details of the fix, preventive measures implemented. Look for mention of tools used and collaboration with team."
        },
        {
          "category": "Technical Skills",
          "question": "How do you approach performance optimization in your applications?",
          "reason": "To evaluate understanding of performance best practices",
          "priority": "medium",
          "suggestedAnswer": "Look for: specific optimization techniques used (code splitting, lazy loading, caching), performance monitoring tools, measurable improvements achieved. Strong answer includes real examples with metrics (load time reduced from X to Y)."
        },
        {
          "category": "Behavioral",
          "question": "Tell me about a time when you had to learn a new technology quickly for a project",
          "reason": "To assess adaptability and learning agility",
          "priority": "medium",
          "suggestedAnswer": "Look for: learning approach (documentation, tutorials, practice projects), time frame, how they applied the new knowledge, outcome of the project. Strong answer shows structured learning process and successful application."
        }
      ]
    }

    **CRITICAL - SCREENING QUESTIONS REQUIREMENTS:**
    1. MINIMUM 5 QUESTIONS REQUIRED - Generate at least 5 questions, preferably 5-6
    2. Every single question MUST have the "suggestedAnswer" field - DO NOT omit this field
    3. MUST include at least ONE question about client communication (especially foreign/international clients)
    4. Cover multiple categories: Client Communication, Technical Skills, Problem Solving, Behavioral
    5. Each suggestedAnswer should guide the interviewer on what to listen for in a strong response

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
    candidate: ICandidate
  ): string {
    const jobDescription = jobData.description.replace(/<[^>]*>/g, ""); // Strip HTML
    const jobTitle = jobData.title;
    const jobSkills = jobData.skills.join(", ");
    const ctcRange = jobData.salary || "Not specified";
    const experience = jobData.experience
      ? `${jobData.experience} years`
      : "Not specified";

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
        String(candidate.expectedCTC)
      );

    // Ensure the JSON format instruction is always present at the end if not in custom prompt
    if (!prompt.includes("Return your evaluation in this JSON format")) {
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
      "redFlags": array of objects [{type, severity, description, evidence}],
      "skillsMatrix": {
        "requiredAndPresent": array of objects [{skill, yearsOfExperience, proficiencyLevel, evidence}],
        "requiredButMissing": array of strings,
        "presentButNotRequired": array of strings
      },
      "interviewQuestions": [
        {
          "category": "string (e.g., 'Client Communication', 'Technical Skills', 'Problem Solving', 'Behavioral')",
          "question": "string",
          "reason": "string",
          "priority": "high|medium|low",
          "suggestedAnswer": "REQUIRED - Guide for what to listen for in a strong answer"
        }
        // MINIMUM 5 questions required, preferably 5-6
        // At least one MUST be about client communication (foreign/international clients)
      ]
    }

    CRITICAL REQUIREMENTS:
    1. Generate MINIMUM 5 QUESTIONS - do not generate fewer than 5
    2. Every screening question MUST include the suggestedAnswer field
    3. At least ONE question MUST be about client communication (especially foreign/international clients)
    4. Cover categories: Client Communication, Technical Skills (1-2), Problem Solving (1), Behavioral (1-2)`;
    }

    return prompt;
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

    return `\n\nEvaluated by ${providerName} ${this.modelUsed ? `using ${this.modelUsed}` : ""} on ${dateStr} at ${timeStr}`;
  }

  private static filterEvaluationBySettings(
    evaluation: EvaluationResult,
    config: any
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
    if (config.enableInterviewQuestions === false) {
      delete evaluation.interviewQuestions;
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
    }
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

  //   private static parseEvaluationResponse(response: string): EvaluationResult {
  //     try {
  //       // console.log("Raw evaluation response:", response);

  //       // Clean the response - handle multiple formats
  //       let jsonString = response
  //         .replace(/```json\n?/g, "")
  //         .replace(/```\n?/g, "")
  //         .trim();

  //       // If response starts with explanation text, extract JSON
  //       const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
  //       if (jsonMatch) {
  //         jsonString = jsonMatch[0];
  //       }

  //       console.log("Cleaned JSON string:", jsonString);

  //       const parsedObject = JSON.parse(jsonString);

  //       // Ensure all required fields exist with defaults
  //       const result: EvaluationResult = {
  //         overall: parsedObject.overall || 0,
  //         experience: parsedObject.experience || 0,
  //         skills: parsedObject.skills || 0,
  //         contact: parsedObject.contact || "",
  //         education: parsedObject.education || 0,
  //         projects: parsedObject.projects || 0,
  //         certifications: parsedObject.certifications || 0,
  //         strengths: parsedObject.strengths || [],
  //         areas_for_improvement: parsedObject.areas_for_improvement || [],
  //         recommendation: parsedObject.recommendation || "Not Recommended",
  //         notes: parsedObject.notes || "",
  //         // Handle different field names that AI might use
  //         affordability: parsedObject.affordability || parsedObject.salary || 0,
  //       };

  //       return result;
  //     } catch (error) {
  //       console.error("Failed to parse evaluation response:", error);
  //       console.error("Original response:", response);
  //       throw new Error("Failed to parse evaluation response JSON");
  //     }
  //   }

  //   private static getEvaluationPrompt(
  //     jobData: JobForEvaluate,
  //     candidate: ICandidate
  //   ): string {
  //     const jobDescription = jobData.description.replace(/<[^>]*>/g, ""); // Strip HTML
  //     const jobTitle = jobData.title;
  //     const jobSkills = jobData.skills.join(", ");

  //     return `
  //     As a seasoned senior technology leader with expertise in talent acquisition, you are conducting a rigorous evaluation of a candidate. You must evaluate each dimension independently and avoid giving similar scores across categories.

  //     Job Details:
  //     - Job Title: ${jobTitle}
  //     - Job Description: ${jobDescription}
  //     - Job Salary: ${jobData.salary}
  //     - Candidate's Current salary: ${candidate.currentCTC}
  //     - Candidate's Expected salary: ${candidate.expectedCTC}
  //     - Required Skills: ${jobSkills}

  //     EVALUATION FRAMEWORK - Each category must be scored independently:

  //     **SKILLS ASSESSMENT (1-10) - TECHNICAL FOCUS ONLY:**
  //     - Evaluate ONLY technical/hard skills mentioned in CV vs. job requirements

  //     **EXPERIENCE ASSESSMENT (1-10) - WORK HISTORY FOCUS ONLY:**
  //     Evaluate ONLY professional work experience relevance and duration:

  //     **AFFORDABILITY ASSESSMENT (1-10):**
  //     IMPORTANT: First normalize salary formats before comparison:
  //     - If candidate expectation is >1000 (e.g., 34000, 45000): Treat as monthly salary in thousands, convert to LPA by dividing by 1000 and multiplying by 12
  //     - If candidate expectation is ≤100 (e.g., 34, 45): Treat as LPA (Lakhs Per Annum)
  //     - Apply same logic to job salary for comparison

  //     *After normalization, compare candidate's expected CTC with job salary*

  //     **OVERALL SUITABILITY (1-10):**
  //     - Consider all the scores, and calculate the overall score of candidate.

  //     CRITICAL INSTRUCTIONS:
  //     1. Each score must reflect the specific criteria above
  //     2. Be strict and objective - average candidates should receive 4-6 scores, not 7-8
  //     3. Skills score should ONLY consider technical abilities, not soft skills or education
  //     4. Experience score should ONLY consider relevant work history duration and domain match
  //     5. After normalization, compare candidate's expected CTC with job salary
  //     6. For affordability, clearly show your salary normalization logic in the notes. If the salary or job's budget either is 0, say you can not evaluate affordability and set the score to 5. As the evaluation will be visible to intrviewers, do not mention the salary indicators in response.
  //     7. Provide specific evidence from the CV to justify each score

  //     Return your evaluation in this JSON format:
  //     {
  //       "overall": // Overall suitability score (1-10) with brief justification
  //       "skills": // Technical skills match score (1-10) with specific skill gaps/matches noted
  //       "experience": // Work experience relevance score (1-10) with years and domain relevance noted
  //       "contact": // Contact number in string format
  //       "affordability": // Salary alignment score (1-10) with calculation shown (include normalization logic)
  //       "strengths": // Maximum 4 bullet points of genuine strengths from CV
  //       "areas_for_improvement": // Maximum 4 bullet points of specific gaps or weaknesses
  //       "recommendation": // One of: "Strongly Recommend", "Recommend", "Consider with Reservations", "Not Recommended"
  //       "notes": // Specific evidence from CV that influenced your scoring, include salary normalization logic
  //     }

  //     SALARY NORMALIZATION EXAMPLES:
  //     - Candidate says "34000 expected": 34000 ÷ 1000 × 12 = 4.08 LPA
  //     - Candidate says "34 LPA expected": 34 LPA (no conversion needed)
  //     - Candidate says "45000 current, 50000 expected": 50000 ÷ 1000 × 12 = 6 LPA expected

  //     Below is the CV content for evaluation:
  //     `;
  //   }

  //   private static async getEvaluationMetadata(
  //     provider: AIProviderType,
  //     settings: any
  //   ): Promise<string> {
  //     const now = new Date();

  //     // Get the user's timezone from settings, fallback to UTC
  //     const userTimezone = settings?.timeZone?.name || "UTC";

  //     // Format date and time using user's timezone
  //     const dateStr = now.toLocaleDateString("en-US", {
  //       year: "numeric",
  //       month: "short",
  //       day: "numeric",
  //       timeZone: userTimezone,
  //     });
  //     const timeStr = now.toLocaleTimeString("en-US", {
  //       hour: "2-digit",
  //       minute: "2-digit",
  //       hour12: true,
  //       timeZone: userTimezone,
  //     });

  //     const providerNames = {
  //       gemini: "Google Gemini",
  //       openai: "OpenAI",
  //       anthropic: "Anthropic Claude",
  //       perplexity: "Perplexity AI",
  //     };

  //     const providerName = providerNames[provider] || provider;

  //     return `\n\nEvaluated by ${providerName} using ${this.modelUsed} on ${dateStr} at ${timeStr}`;
  //   }
}
