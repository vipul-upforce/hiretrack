/* eslint-disable max-lines */
interface RedFlagWithType {
  type?: string | null;
}

interface CandidateWithScores {
  scores?: {
    redFlags?: RedFlagWithType[];
    notes?: string;
  };
}

interface MaskResult<T> {
  value: T;
  changed: boolean;
}

const SALARY_RELATED_TYPE_KEYWORDS = new Set([
  'salary',
  'ctc',
  'lpa',
  'compensation',
  'remuneration',
  'package',
  'pay',
  'payroll',
  'affordability',
  'expectation',
  'budget',
  'currentctc',
  'expectedctc',
]);

const SALARY_RELATED_TYPE_PHRASES = ['cost to company'];
const SALARY_UNIT_TOKENS = new Set(['lpa', 'ctc']);
const SALARY_CONTEXT_TOKENS = new Set([
  'salary',
  'ctc',
  'lpa',
  'compensation',
  'remuneration',
  'package',
  'budget',
  'currentctc',
  'expectedctc',
]);
const SALARY_CONNECTOR_TOKENS = new Set([
  'of',
  'is',
  'around',
  'about',
  'approx',
  'approximately',
]);
const SALARY_RANGE_WORD_CONNECTOR_TOKENS = new Set(['to']);

interface TextToken {
  value: string;
  lower: string;
  start: number;
  end: number;
}

interface MaskRange {
  start: number;
  end: number;
}

function normalizeTypeValue(type: string): string {
  return type.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function isAlphaNumericCharacter(char: string): boolean {
  const code = char.charCodeAt(0);
  const isDigit = code >= 48 && code <= 57;
  const isUpperAlpha = code >= 65 && code <= 90;
  const isLowerAlpha = code >= 97 && code <= 122;
  return isDigit || isUpperAlpha || isLowerAlpha;
}

function isTokenCharacter(char: string): boolean {
  return isAlphaNumericCharacter(char) || char === '.' || char === ',';
}

function tokenizeNote(text: string): TextToken[] {
  const tokens: TextToken[] = [];
  let index = 0;

  while (index < text.length) {
    if (isTokenCharacter(text[index])) {
      const start = index;
      while (index < text.length && isTokenCharacter(text[index])) {
        index += 1;
      }
      const end = index;
      const value = text.slice(start, end);

      tokens.push({
        value,
        lower: value.toLowerCase(),
        start,
        end,
      });
    } else {
      index += 1;
    }
  }

  return tokens;
}

function isNumericToken(token: string): boolean {
  if (!token) {
    return false;
  }

  let hasDigit = false;
  let dotCount = 0;

  for (let i = 0; i < token.length; i += 1) {
    const char = token[i];
    if (char >= '0' && char <= '9') {
      hasDigit = true;
    } else if (char === ',') {
      // Keep scanning
    } else if (char === '.') {
      dotCount += 1;
      if (dotCount > 1) {
        return false;
      }
    } else {
      return false;
    }
  }

  return hasDigit;
}

function normalizeLookupToken(tokenLower: string): string {
  return tokenLower.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '');
}

function normalizeSalaryUnitToken(tokenLower: string): string {
  return normalizeLookupToken(tokenLower);
}

function isSalaryConnectorToken(tokenLower: string): boolean {
  return SALARY_CONNECTOR_TOKENS.has(normalizeLookupToken(tokenLower));
}

function isSalaryRangeWordConnectorToken(tokenLower: string): boolean {
  return SALARY_RANGE_WORD_CONNECTOR_TOKENS.has(
    normalizeLookupToken(tokenLower),
  );
}

function isSalaryContextTokenAtIndex(tokens: TextToken[], index: number): boolean {
  const normalized = normalizeLookupToken(tokens[index]?.lower ?? '');
  if (SALARY_CONTEXT_TOKENS.has(normalized)) {
    return true;
  }

  return (
    normalized === 'cost' &&
    normalizeLookupToken(tokens[index + 1]?.lower ?? '') === 'to' &&
    normalizeLookupToken(tokens[index + 2]?.lower ?? '') === 'company'
  );
}

function isSalaryUnitToken(tokenLower: string): boolean {
  return SALARY_UNIT_TOKENS.has(normalizeSalaryUnitToken(tokenLower));
}

function getNumericCharacterOffsets(token: string): MaskRange | null {
  let firstDigitIndex = -1;
  let lastDigitIndex = -1;

  for (let i = 0; i < token.length; i += 1) {
    const char = token[i];
    if (char >= '0' && char <= '9') {
      if (firstDigitIndex === -1) {
        firstDigitIndex = i;
      }
      lastDigitIndex = i;
    }
  }

  if (firstDigitIndex === -1 || lastDigitIndex === -1) {
    return null;
  }

  return {
    start: firstDigitIndex,
    end: lastDigitIndex + 1,
  };
}

function getCombinedSalaryUnit(tokenLower: string): 'lpa' | 'ctc' | null {
  const trimmedTokenLower = tokenLower.replace(/[.,]+$/g, '');

  for (const unit of SALARY_UNIT_TOKENS) {
    if (trimmedTokenLower !== unit) {
      if (
        trimmedTokenLower.endsWith(unit) &&
        isNumericToken(
          trimmedTokenLower.slice(0, trimmedTokenLower.length - unit.length),
        )
      ) {
        return unit as 'lpa' | 'ctc';
      }

      if (
        trimmedTokenLower.startsWith(unit) &&
        isNumericToken(trimmedTokenLower.slice(unit.length))
      ) {
        return unit as 'lpa' | 'ctc';
      }
    }
  }

  return null;
}

function getNumericRangeForCombinedSalaryToken(
  token: TextToken,
  unitLower: 'lpa' | 'ctc',
): MaskRange | null {
  const unitLength = unitLower.length;
  const trimmedTokenValue = token.value.replace(/[.,]+$/g, '');
  const trimmedTokenLower = token.lower.replace(/[.,]+$/g, '');

  if (trimmedTokenLower.endsWith(unitLower)) {
    const numericPart = trimmedTokenValue.slice(
      0,
      trimmedTokenValue.length - unitLength,
    );
    if (isNumericToken(numericPart)) {
      const offsets = getNumericCharacterOffsets(numericPart);
      if (offsets) {
        return {
          start: token.start + offsets.start,
          end: token.start + offsets.end,
        };
      }
    }
  }

  if (trimmedTokenLower.startsWith(unitLower)) {
    const numericPart = trimmedTokenValue.slice(unitLength);
    if (isNumericToken(numericPart)) {
      const offsets = getNumericCharacterOffsets(numericPart);
      if (offsets) {
        return {
          start: token.start + unitLength + offsets.start,
          end: token.start + unitLength + offsets.end,
        };
      }
    }
  }

  return null;
}

function hasHyphenRangeSeparator(
  note: string,
  leftToken: TextToken,
  rightToken: TextToken,
): boolean {
  const separator = note.slice(leftToken.end, rightToken.start);
  return /^\s*(?:-|\u2013)\s*$/.test(separator);
}

function getSalaryRangeEndIndex(
  note: string,
  tokens: TextToken[],
  startNumericIndex: number,
  allowMissingTrailingUnit = false,
): number {
  if (
    startNumericIndex < 0 ||
    startNumericIndex >= tokens.length ||
    !isNumericToken(tokens[startNumericIndex].value)
  ) {
    return -1;
  }

  const firstNumericToken = tokens[startNumericIndex];
  const secondToken = tokens[startNumericIndex + 1];
  const thirdToken = tokens[startNumericIndex + 2];
  const fourthToken = tokens[startNumericIndex + 3];

  if (secondToken && isSalaryUnitToken(secondToken.lower)) {
    return startNumericIndex;
  }

  if (
    secondToken &&
    thirdToken &&
    isNumericToken(secondToken.value) &&
    isSalaryUnitToken(thirdToken.lower) &&
    hasHyphenRangeSeparator(note, firstNumericToken, secondToken)
  ) {
    return startNumericIndex + 1;
  }

  if (
    secondToken &&
    thirdToken &&
    fourthToken &&
    isSalaryRangeWordConnectorToken(secondToken.lower) &&
    isNumericToken(thirdToken.value) &&
    isSalaryUnitToken(fourthToken.lower)
  ) {
    return startNumericIndex + 2;
  }

  if (allowMissingTrailingUnit) {
    if (
      secondToken &&
      isNumericToken(secondToken.value) &&
      hasHyphenRangeSeparator(note, firstNumericToken, secondToken)
    ) {
      return startNumericIndex + 1;
    }

    if (
      secondToken &&
      thirdToken &&
      isSalaryRangeWordConnectorToken(secondToken.lower) &&
      isNumericToken(thirdToken.value)
    ) {
      return startNumericIndex + 2;
    }

    return startNumericIndex;
  }

  return -1;
}

function applyMaskRanges(note: string, ranges: MaskRange[]): string {
  if (ranges.length === 0) {
    return note;
  }

  const sortedRanges = [...ranges].sort((a, b) => a.start - b.start);
  const mergedRanges: MaskRange[] = [];

  for (const range of sortedRanges) {
    const lastRange = mergedRanges[mergedRanges.length - 1];
    if (!lastRange || range.start > lastRange.end) {
      mergedRanges.push({ ...range });
    } else if (range.end > lastRange.end) {
      lastRange.end = range.end;
    }
  }

  let result = '';
  let cursor = 0;

  for (const range of mergedRanges) {
    result += `${note.slice(cursor, range.start)}|||###|||`;
    cursor = range.end;
  }

  return `${result}${note.slice(cursor)}`;
}

export function maskSensitiveSalaryMentionsInNotes(note: string): string {
  if (!note) {
    return note;
  }

  const tokens = tokenizeNote(note);
  if (tokens.length === 0) {
    return note;
  }

  const maskRanges: MaskRange[] = [];

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];

    const combinedUnit = getCombinedSalaryUnit(token.lower);
    if (combinedUnit) {
      const numericRange = getNumericRangeForCombinedSalaryToken(
        token,
        combinedUnit,
      );
      if (numericRange) {
        maskRanges.push(numericRange);
      }
    }

    if (isSalaryUnitToken(token.lower)) {
      let numericIndex = i + 1;
      while (
        numericIndex < tokens.length &&
        isSalaryConnectorToken(tokens[numericIndex].lower)
      ) {
        numericIndex += 1;
      }

      const rangeEndIndex = getSalaryRangeEndIndex(
        note,
        tokens,
        numericIndex,
        true,
      );
      if (rangeEndIndex !== -1) {
        const startOffsets = getNumericCharacterOffsets(
          tokens[numericIndex].value,
        );
        const endOffsets = getNumericCharacterOffsets(
          tokens[rangeEndIndex].value,
        );
        if (startOffsets && endOffsets) {
          maskRanges.push({
            start: tokens[numericIndex].start + startOffsets.start,
            end: tokens[rangeEndIndex].start + endOffsets.end,
          });
        }
      }
    }

    if (isSalaryContextTokenAtIndex(tokens, i)) {
      let numericIndex = i + 1;
      while (
        numericIndex < tokens.length &&
        isSalaryConnectorToken(tokens[numericIndex].lower)
      ) {
        numericIndex += 1;
      }

      const rangeEndIndex = getSalaryRangeEndIndex(
        note,
        tokens,
        numericIndex,
        true,
      );
      if (rangeEndIndex !== -1) {
        const startOffsets = getNumericCharacterOffsets(
          tokens[numericIndex].value,
        );
        const endOffsets = getNumericCharacterOffsets(
          tokens[rangeEndIndex].value,
        );
        if (startOffsets && endOffsets) {
          maskRanges.push({
            start: tokens[numericIndex].start + startOffsets.start,
            end: tokens[rangeEndIndex].start + endOffsets.end,
          });
        }
      }
    }

    const rangeEndIndex = getSalaryRangeEndIndex(note, tokens, i);
    if (rangeEndIndex !== -1) {
      const startOffsets = getNumericCharacterOffsets(token.value);
      const endOffsets = getNumericCharacterOffsets(tokens[rangeEndIndex].value);

      if (startOffsets && endOffsets) {
        maskRanges.push({
          start: token.start + startOffsets.start,
          end: tokens[rangeEndIndex].start + endOffsets.end,
        });
      }

      if (rangeEndIndex > i) {
        i = rangeEndIndex;
      }
    }
  }

  return applyMaskRanges(note, maskRanges);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return Object.getPrototypeOf(value) === Object.prototype;
}

function maskSensitiveSalaryMentionsInValue(value: unknown): MaskResult<unknown> {
  if (typeof value === 'string') {
    const masked = maskSensitiveSalaryMentionsInNotes(value);
    return { value: masked, changed: masked !== value };
  }

  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((entry) => {
      const result = maskSensitiveSalaryMentionsInValue(entry);
      if (result.changed) {
        changed = true;
      }
      return result.value;
    });

    return changed ? { value: next, changed: true } : { value, changed: false };
  }

  if (!isPlainObject(value)) {
    return { value, changed: false };
  }

  let changed = false;
  const next: Record<string, unknown> = {};

  for (const [key, nestedValue] of Object.entries(value)) {
    if (key === 'redFlags') {
      next[key] = nestedValue;
    } else {
      const result = maskSensitiveSalaryMentionsInValue(nestedValue);
      if (result.changed) {
        changed = true;
      }
      next[key] = result.value;
    }
  }

  return changed ? { value: next, changed: true } : { value, changed: false };
}

function maskSensitiveSalaryMentionsInScores<T extends CandidateWithScores['scores']>(
  scores: T,
): MaskResult<T> {
  const result = maskSensitiveSalaryMentionsInValue(scores);
  return {
    value: result.value as T,
    changed: result.changed,
  };
}

export function isSalaryRelatedRedFlagType(
  type: string | null | undefined,
): boolean {
  if (!type) {
    return false;
  }

  const normalizedType = normalizeTypeValue(type);
  if (!normalizedType) {
    return false;
  }

  if (
    SALARY_RELATED_TYPE_PHRASES.some((phrase) =>
      normalizedType.includes(phrase),
    )
  ) {
    return true;
  }

  const tokens = normalizedType.split(' ');
  return tokens.some((token) => SALARY_RELATED_TYPE_KEYWORDS.has(token));
}

export function filterSensitiveRedFlagsForInterviewer<
  T extends CandidateWithScores,
>(candidate: T, role: string | undefined): T {
  if (role !== 'interviewer') {
    return candidate;
  }

  if (!candidate.scores) {
    return candidate;
  }

  const { scores } = candidate;
  const { redFlags } = scores;
  const hasRedFlags = Array.isArray(redFlags);
  const filteredRedFlags = hasRedFlags
    ? redFlags.filter((flag) => !isSalaryRelatedRedFlagType(flag?.type))
    : redFlags;
  const redFlagsChanged =
    hasRedFlags && filteredRedFlags?.length !== redFlags.length;

  const maskedScoresResult = maskSensitiveSalaryMentionsInScores(scores);
  const scoresTextChanged = maskedScoresResult.changed;
  const maskedScores = maskedScoresResult.value;

  if (!redFlagsChanged && !scoresTextChanged) {
    return candidate;
  }

  return {
    ...candidate,
    scores: {
      ...(maskedScores as typeof scores),
      ...(hasRedFlags ? { redFlags: filteredRedFlags } : {}),
    },
  } as T;
}

export function filterSensitiveRedFlagsForInterviewerList<
  T extends CandidateWithScores,
>(candidates: T[], role: string | undefined): T[] {
  if (role !== 'interviewer') {
    return candidates;
  }

  return candidates.map((candidate) =>
    filterSensitiveRedFlagsForInterviewer(candidate, role),
  );
}

