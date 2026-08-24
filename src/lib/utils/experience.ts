/**
 * Experience input can be entered as:
 * - Decimal years (e.g. 3.83)
 * - Year-month shorthand (e.g. 3.10 => 3 years 10 months, 3.12 => 4 years)
 *
 * This helper normalizes both formats to decimal years for storage/comparison.
 */
export function normalizeExperienceToYears(value: unknown): number {
  if (value === null || value === undefined || value === '') {
    return Number.NaN;
  }

  const raw = String(value).trim();
  if (!raw) {
    return Number.NaN;
  }

  const match = raw.match(/^(\d+)(?:\.(\d+))?$/);
  if (!match) {
    const parsed = Number.parseFloat(raw);
    return Number.isNaN(parsed) ? Number.NaN : Number(parsed.toFixed(2));
  }

  const years = Number.parseInt(match[1], 10);
  const fractionPart = match[2];

  if (!fractionPart) {
    return years;
  }

  const monthsCandidate = Number.parseInt(fractionPart, 10);
  // Two-digit fraction only (e.g. 3.10 = 3y 10mo). Single digit is decimal years (1.5 = 1.5y).
  const isYearMonthNotation =
    fractionPart.length === 2 && monthsCandidate >= 0 && monthsCandidate <= 11;

  if (isYearMonthNotation) {
    const totalMonths = years * 12 + monthsCandidate;
    return Number((totalMonths / 12).toFixed(2));
  }

  const parsed = Number.parseFloat(raw);
  return Number.isNaN(parsed) ? Number.NaN : Number(parsed.toFixed(2));
}
