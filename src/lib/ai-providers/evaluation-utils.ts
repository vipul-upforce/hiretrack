import { ScoreObject } from "./evaluation-types";

/**
 * Type guard to check if value is a score object
 */
export function isScoreObject(value: unknown): value is ScoreObject {
  return (
    value !== null &&
    typeof value === "object" &&
    "score" in value &&
    typeof (value as ScoreObject).score === "number"
  );
}

/**
 * Type guard to check if value is a valid number
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value) && isFinite(value);
}

/**
 * Extracts numeric score from either a number or an object with a score property.
 * Handles cases where AI returns scores as { score: number, justification: string }
 * @param value - The value to extract score from (number or object)
 * @param defaultValue - Default value if extraction fails (default: 0)
 * @returns The numeric score value
 */
export function extractNumericScore(
  value: unknown,
  defaultValue: number = 0
): number {
  if (isValidNumber(value)) {
    return value;
  }

  if (isScoreObject(value)) {
    return isValidNumber(value.score) ? value.score : defaultValue;
  }

  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return isValidNumber(parsed) ? parsed : defaultValue;
  }

  return defaultValue;
}

/**
 * Strips HTML tags from text
 * @param text - Text with potential HTML
 * @returns Text without HTML tags
 */
export function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, "");
}

