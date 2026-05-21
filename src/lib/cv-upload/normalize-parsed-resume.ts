import { randomUUID } from 'crypto';
import type { ProcessedResumeData } from '@/lib/ai-providers/types';

/** Shared prefix for auto-filled name/email when AI omits required fields. */
export const CV_IMPORT_PLACEHOLDER_PREFIX = 'Unknown';

export const CV_IMPORT_PLACEHOLDER_EMAIL_DOMAIN = 'imports.hiretrack.in';

const SIMPLE_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Short unique suffix (8 hex chars) for placeholder values. */
function shortImportId(): string {
  return randomUUID().replace(/-/g, '').slice(0, 8);
}

function isBlank(value: unknown): boolean {
  return typeof value !== 'string' || value.trim() === '';
}

function coerceNonNegativeNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return Math.max(0, value);
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return Math.max(0, parsed);
    }
  }
  return fallback;
}

function withImportPrefix(label: string): string {
  const trimmed = label.trim();
  const prefixed = `${CV_IMPORT_PLACEHOLDER_PREFIX}-`;
  if (trimmed.startsWith(prefixed)) {
    return trimmed.slice(0, 80);
  }
  return `${prefixed}${trimmed}`.slice(0, 80);
}

function nameFromFilename(filename: string, importId: string): string {
  const base = filename
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (base.length >= 2) {
    return withImportPrefix(base);
  }
  return `${CV_IMPORT_PLACEHOLDER_PREFIX}-${importId}`;
}

function placeholderEmail(importId: string): string {
  return `${CV_IMPORT_PLACEHOLDER_PREFIX}.${importId}@${CV_IMPORT_PLACEHOLDER_EMAIL_DOMAIN}`;
}

export function isCvImportPlaceholderEmail(email: string): boolean {
  const lower = email.toLowerCase();
  return (
    lower.startsWith(`${CV_IMPORT_PLACEHOLDER_PREFIX}.`)
    && lower.endsWith(`@${CV_IMPORT_PLACEHOLDER_EMAIL_DOMAIN}`)
  );
}

/**
 * Fill Mongo-required fields when AI returned a resume-shaped payload but omitted
 * name/email/etc. Skipped when `parsed.error` is set (invalid CV).
 */
export function ensureParsedResumeForPersistence(
  parsed: ProcessedResumeData,
  ctx: { filename: string },
): ProcessedResumeData {
  if (parsed.error) {
    return parsed;
  }

  const importId = shortImportId();

  const normalized: ProcessedResumeData = {
    ...parsed,
    name: isBlank(parsed.name)
      ? nameFromFilename(ctx.filename, importId)
      : parsed.name.trim(),
    location: isBlank(parsed.location) ? '' : parsed.location.trim(),
    contact: isBlank(parsed.contact) ? '' : parsed.contact.trim(),
    experience: coerceNonNegativeNumber(parsed.experience),
    relevantExperience: coerceNonNegativeNumber(parsed.relevantExperience),
    currentCTC: coerceNonNegativeNumber(parsed.currentCTC),
    expectedCTC: coerceNonNegativeNumber(parsed.expectedCTC),
    noticePeriod: coerceNonNegativeNumber(parsed.noticePeriod),
    skills: Array.isArray(parsed.skills)
      ? parsed.skills.filter((skill): skill is string => typeof skill === 'string')
      : [],
  };

  const email = typeof parsed.email === 'string' ? parsed.email.trim() : '';
  if (isBlank(email) || !SIMPLE_EMAIL_RE.test(email)) {
    normalized.email = placeholderEmail(importId);
  } else {
    normalized.email = email;
  }

  return normalized;
}
