export interface JobExperience {
  min: number;
  max?: number;
  inText?: string;
}

/** Supports legacy jobs stored as a plain number. */
export function normalizeJobExperience(value: unknown): JobExperience | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return { min: value };
  }
  if (typeof value === 'object' && value !== null && 'min' in value) {
    const obj = value as JobExperience;
    if (typeof obj.min === 'number' && !Number.isNaN(obj.min)) {
      return obj;
    }
  }
  return null;
}

export function parseJobExperienceInput(input: string): JobExperience | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const rangeMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/);
  if (rangeMatch) {
    const min = Number.parseFloat(rangeMatch[1]);
    const max = Number.parseFloat(rangeMatch[2]);
    if (Number.isNaN(min) || Number.isNaN(max) || min < 0 || max < 0 || min > max) {
      return null;
    }
    return { min, max, inText: trimmed };
  }

  const single = Number.parseFloat(trimmed);
  if (!Number.isNaN(single) && single >= 0) {
    return { min: single, inText: trimmed };
  }
  return null;
}

export function jobExperienceToInput(value: unknown): string {
  const exp = normalizeJobExperience(value);
  if (!exp) return '';
  if (exp.inText?.trim()) return exp.inText.trim();
  if (exp.max != null && exp.max !== exp.min) return `${exp.min}-${exp.max}`;
  return String(exp.min);
}

export function formatJobExperience(value: unknown): string {
  const exp = normalizeJobExperience(value);
  if (!exp) return '';
  if (exp.max != null && exp.max !== exp.min) {
    return `${exp.min}-${exp.max} years`;
  }
  return `${exp.min} ${exp.min === 1 ? 'year' : 'years'}`;
}

export function getJobExperienceSortValue(value: unknown): number {
  const exp = normalizeJobExperience(value);
  return exp?.min ?? 0;
}

export function toStoredJobExperience(inText: string): JobExperience | null {
  const parsed = parseJobExperienceInput(inText);
  if (!parsed) return null;
  const trimmed = inText.trim();
  if (parsed.max != null && parsed.max !== parsed.min) {
    return { min: parsed.min, max: parsed.max, inText: trimmed };
  }
  return { min: parsed.min, inText: trimmed };
}

/**
 * Coerces legacy/partial experience values into the `{ min, max?, inText? }` shape
 * required by the Job schema. Returns null when coercion is not possible.
 */
export function coerceJobExperienceForStorage(
  value: unknown,
): JobExperience | null {
  const normalized = normalizeJobExperience(value);
  if (normalized) return normalized;

  if (typeof value === 'object' && value !== null && 'inText' in value) {
    const inText = (value as { inText?: string }).inText;
    if (typeof inText === 'string' && inText.trim()) {
      return toStoredJobExperience(inText);
    }
  }

  return null;
}
