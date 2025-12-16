import {
  EvaluationResult,
  ParsedEvaluationObject,
} from "./evaluation-types";
import {
  extractNumericScore,
} from "./evaluation-utils";
import { EVALUATION_CONSTANTS } from "./evaluation-constants";
import logger from "../logger";

/**
 * Cleans JSON response by removing markdown code blocks and extracting JSON
 * @param response - Raw response string
 * @returns Cleaned JSON string
 */
export function cleanJsonResponse(response: string): string {
  const jsonString = response
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
  return jsonMatch ? jsonMatch[0] : jsonString;
}

/**
 * Safely parses JSON with error handling
 * @param jsonString - JSON string to parse
 * @returns Parsed object or empty object on error
 */
export function parseJsonSafely(jsonString: string): ParsedEvaluationObject {
  try {
    return JSON.parse(jsonString) as ParsedEvaluationObject;
  } catch (parseError) {
    logger.error("JSON Parse Error:", parseError);
    logger.error(
      "Failed JSON string (first 1000 chars):",
      jsonString.substring(0, 1000)
    );
    logger.error(
      "Failed JSON string (last 500 chars):",
      jsonString.substring(Math.max(0, jsonString.length - 500))
    );
    return {} as ParsedEvaluationObject;
  }
}

/**
 * Normalizes red flags severity values
 * @param redFlags - Array of red flags
 * @returns Normalized red flags array
 */
export function normalizeRedFlags(
  redFlags?: Array<{
    type: string;
    severity?: string;
    description: string;
    evidence: string;
  }>
): EvaluationResult["redFlags"] {
  if (!Array.isArray(redFlags)) {
    return undefined;
  }

  return redFlags.map((flag) => ({
    ...flag,
    severity: flag.severity
      ? (flag.severity.toLowerCase() as "low" | "medium" | "high")
      : undefined,
  })) as EvaluationResult["redFlags"];
}

/**
 * Normalizes skills matrix to ensure yearsOfExperience is always a number
 * @param skillsMatrix - Skills matrix object from parsed response
 * @returns Normalized skills matrix with numeric yearsOfExperience
 */
export function normalizeSkillsMatrix(
  skillsMatrix?: ParsedEvaluationObject["skillsMatrix"]
): EvaluationResult["skillsMatrix"] {
  if (!skillsMatrix) {
    return undefined;
  }

  return {
    ...skillsMatrix,
    requiredAndPresent: Array.isArray(skillsMatrix.requiredAndPresent)
      ? skillsMatrix.requiredAndPresent.map((skill) => ({
          ...skill,
          yearsOfExperience: extractNumericScore(
            skill.yearsOfExperience,
            0
          ),
        }))
      : [],
    requiredButMissing: Array.isArray(skillsMatrix.requiredButMissing)
      ? skillsMatrix.requiredButMissing
      : [],
    presentButNotRequired: Array.isArray(skillsMatrix.presentButNotRequired)
      ? skillsMatrix.presentButNotRequired
      : [],
  };
}

/**
 * Creates a fallback evaluation result when parsing fails
 * @param error - Error that occurred during parsing
 * @returns Fallback evaluation result
 */
export function createFallbackEvaluation(error: unknown): EvaluationResult {
  const errorMessage =
    error instanceof Error ? error.message : "Unknown error";

  console.error("Failed to parse evaluation response:", error);

  return {
    overall: EVALUATION_CONSTANTS.DEFAULT_FALLBACK_SCORE,
    experience: EVALUATION_CONSTANTS.DEFAULT_FALLBACK_SCORE,
    skills: EVALUATION_CONSTANTS.DEFAULT_FALLBACK_SCORE,
    contact: "",
    education: 0,
    projects: 0,
    certifications: 0,
    strengths: ["Could not parse AI response"],
    areas_for_improvement: ["Could not parse complete AI response"],
    recommendation: "AI evaluation failed - manual review required",
    notes: `The AI evaluation response could not be fully parsed. Please review the candidate manually. Error: ${errorMessage}`,
  };
}

/**
 * Parses the AI evaluation response into a structured result
 * @param response - Raw AI response string
 * @returns Parsed evaluation result
 */
export function parseEvaluationResponse(response: string): EvaluationResult {
  try {
    const jsonString = cleanJsonResponse(response);
    const parsedObject = parseJsonSafely(jsonString);
    const redFlags = normalizeRedFlags(parsedObject.redFlags);
    const skillsMatrix = normalizeSkillsMatrix(parsedObject.skillsMatrix);

    return {
      overall: extractNumericScore(parsedObject.overall, 0),
      experience: extractNumericScore(parsedObject.experience, 0),
      skills: extractNumericScore(parsedObject.skills, 0),
      contact: parsedObject.contact || "",
      education: extractNumericScore(parsedObject.education, 0),
      projects: extractNumericScore(parsedObject.projects, 0),
      certifications: extractNumericScore(parsedObject.certifications, 0),
      strengths: Array.isArray(parsedObject.strengths)
        ? parsedObject.strengths
        : [],
      areas_for_improvement: Array.isArray(parsedObject.areas_for_improvement)
        ? parsedObject.areas_for_improvement
        : [],
      recommendation: parsedObject.recommendation || "Not Recommended",
      notes: parsedObject.notes || "",
      affordability: extractNumericScore(
        parsedObject.affordability || parsedObject.salary,
        0
      ),
      confidenceScores: parsedObject.confidenceScores,
      evidenceLinks: parsedObject.evidenceLinks,
      redFlags,
      skillsMatrix,
    };
  } catch (error) {
    return createFallbackEvaluation(error);
  }
}

