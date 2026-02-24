interface RedFlagWithType {
  type?: string | null;
  [key: string]: unknown;
}

interface CandidateWithScores {
  scores?: {
    redFlags?: RedFlagWithType[];
    notes?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
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
const SALARY_CONNECTOR_TOKENS = new Set([
  'of',
  'is',
  'around',
  'about',
  'approx',
  'approximately',
]);

interface TextToken {
  value: string;
  lower: string;
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

function isSalaryUnitToken(tokenLower: string): boolean {
  return SALARY_UNIT_TOKENS.has(tokenLower);
}

function getCombinedSalaryUnit(tokenLower: string): 'lpa' | 'ctc' | null {
  for (const unit of SALARY_UNIT_TOKENS) {
    if (tokenLower !== unit) {
      if (
        tokenLower.endsWith(unit) &&
        isNumericToken(tokenLower.slice(0, tokenLower.length - unit.length))
      ) {
        return unit as 'lpa' | 'ctc';
      }

      if (
        tokenLower.startsWith(unit) &&
        isNumericToken(tokenLower.slice(unit.length))
      ) {
        return unit as 'lpa' | 'ctc';
      }
    }
  }

  return null;
}

function maskedUnit(unitLower: string): string {
  return `** ${unitLower.toUpperCase()}`;
}

export function maskSensitiveSalaryMentionsInNotes(note: string): string {
  if (!note) {
    return note;
  }

  const tokens = tokenizeNote(note);
  if (tokens.length === 0) {
    return note;
  }

  let result = '';
  let cursor = 0;

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    let consumedUntilIndex = -1;
    let replacement = '';

    const combinedUnit = getCombinedSalaryUnit(token.lower);
    if (combinedUnit) {
      replacement = maskedUnit(combinedUnit);
      consumedUntilIndex = i;
    }

    if (consumedUntilIndex === -1 && isSalaryUnitToken(token.lower)) {
      let numericIndex = i + 1;
      while (
        numericIndex < tokens.length &&
        SALARY_CONNECTOR_TOKENS.has(tokens[numericIndex].lower)
      ) {
        numericIndex += 1;
      }

      if (
        numericIndex < tokens.length &&
        isNumericToken(tokens[numericIndex].value)
      ) {
        replacement = maskedUnit(token.lower);
        consumedUntilIndex = numericIndex;
      }
    }

    if (
      consumedUntilIndex === -1 &&
      isNumericToken(token.value) &&
      i + 1 < tokens.length &&
      isSalaryUnitToken(tokens[i + 1].lower)
    ) {
      replacement = maskedUnit(tokens[i + 1].lower);
      consumedUntilIndex = i + 1;
    }

    if (consumedUntilIndex !== -1) {
      result += `${note.slice(cursor, token.start)}${replacement}`;
      cursor = tokens[consumedUntilIndex].end;
      i = consumedUntilIndex;
    }
  }

  return `${result}${note.slice(cursor)}`;
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
  const { redFlags, notes } = scores;
  const hasRedFlags = Array.isArray(redFlags);
  const filteredRedFlags = hasRedFlags
    ? redFlags.filter((flag) => !isSalaryRelatedRedFlagType(flag?.type))
    : redFlags;
  const redFlagsChanged =
    hasRedFlags && filteredRedFlags?.length !== redFlags.length;

  const maskedNotes =
    typeof notes === 'string'
      ? maskSensitiveSalaryMentionsInNotes(notes)
      : notes;
  const notesChanged = typeof notes === 'string' && maskedNotes !== notes;

  if (!redFlagsChanged && !notesChanged) {
    return candidate;
  }

  return {
    ...candidate,
    scores: {
      ...scores,
      ...(hasRedFlags ? { redFlags: filteredRedFlags } : {}),
      ...(notesChanged ? { notes: maskedNotes } : {}),
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
