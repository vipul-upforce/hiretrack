import { JobForEvaluate } from "./evaluation-types";
import { ICandidate } from "../models/candidate";
import { stripHtml } from "./evaluation-utils";

/**
 * Gets JSON format instruction template
 * @returns JSON format instruction string
 */
export function getJsonFormatInstruction(): string {
  return `

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
      "yearsOfExperience": number,
            // CRITICAL: MUST be a NUMBER type (integer or decimal), NEVER a string.
            // FORBIDDEN: "N/A", "Not specified", "Unknown", "Approx 1 year", "1+ yr", "~2 years", or any text.
            // If experience cannot be determined, return 0 (zero) as a NUMBER.
            // Examples: 5 (correct), 2.5 (correct), 0 (correct if unknown), "N/A" (WRONG - will cause validation error)
      "proficiencyLevel": string (Not Specified if unknown),
      "evidence": string
    }
  ],
  "requiredButMissing": array of strings,
  "presentButNotRequired": array of strings
}

    }`;
}

/**
 * Generates the default evaluation prompt
 * @param jobData - Job details
 * @param candidate - Candidate information
 * @returns Evaluation prompt string
 */
export function getEvaluationPrompt(
  jobData: JobForEvaluate,
  candidate: ICandidate
): string {
  const jobDescription = stripHtml(jobData.description);
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
              All numeric fields must be numbers only. Never return strings like "Not specified", "N/A", or "Unknown". 
              If a numeric value is unknown, return 0 (as a number, not a string).
              IMPORTANT: In skillsMatrix.requiredAndPresent[].yearsOfExperience, ALWAYS return a NUMBER type. 
              If years of experience cannot be determined, return 0 (not "0" or "N/A"). 
              Any string value will cause validation errors.
 
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
            "yearsOfExperience": 5, // MUST be a number: 5, 2.5, or 0 if unknown. NEVER "N/A" or any string.
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

/**
 * Builds evaluation prompt from custom template
 * @param customPrompt - Custom prompt template
 * @param jobData - Job details
 * @param candidate - Candidate information
 * @returns Formatted prompt string
 */
export function buildPromptWithCustomTemplate(
  customPrompt: string,
  jobData: JobForEvaluate,
  candidate: ICandidate
): string {
  const jobDescription = stripHtml(jobData.description);
  const jobTitle = jobData.title;
  const jobSkills = jobData.skills.join(", ");
  const ctcRange = jobData.salary || "Not specified";
  const experience = jobData.experience
    ? `${jobData.experience} years`
    : "Not specified";  
  const replacements: Record<string, string> = {
    "{{JOB_TITLE}}": jobTitle,
    "{{JOB_DESCRIPTION}}": jobDescription,  
    "{{JOB_SALARY}}": ctcRange,
    "{{CTC_RANGE}}": ctcRange,
    "{{EXPERIENCE}}": experience,
    "{{REQUIRED_SKILLS}}": jobSkills,
    "{{CANDIDATE_CURRENT_CTC}}": String(candidate.currentCTC),
    "{{CANDIDATE_EXPECTED_CTC}}": String(candidate.expectedCTC),
  };

  let prompt = customPrompt;
  // Use replaceAll to avoid dynamic RegExp construction
  for (const [placeholder, value] of Object.entries(replacements)) {
    prompt = prompt.replaceAll(placeholder, value);
  }

  if (!prompt.includes("Return your evaluation in this JSON format")) {
    prompt += getJsonFormatInstruction();
  }

  return prompt;
}

