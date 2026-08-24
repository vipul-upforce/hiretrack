import type { ResumeSkills, FeaturedSkill } from '@/lib/redux/types';
import type { ResumeSectionToLines } from '@/lib/parse-resume-from-pdf/types';
import { deepClone } from '@/lib/deep-clone';
import { initialFeaturedSkills } from '@/lib/redux/resumeSlice';

const SKILL_KEYWORDS = [
  'skills',
  'technical skills',
  'core competencies',
  'expertise',
  'proficiencies',
  'technologies',
  'programming languages',
  'tools',
];
const SKILL_HEADER_PATTERNS = [
  /^(technical )?skills:?\s*/i,
  /^core competencies:?\s*/i,
  /^expertise:?\s*/i,
  /^proficiencies:?\s*/i,
  /^technologies:?\s*/i,
  /^programming languages:?\s*/i,
  /^tools:?\s*/i,
];
const NOISE_WORDS = [
  'proficient in',
  'experienced with',
  'knowledge of',
  'familiar with',
  'working knowledge',
  'experience in',
  'skilled in',
];
const SKILL_DELIMITERS = [',', ';', '|', '•', '·', '-'];

// Common non-skill terms that should be excluded
const NON_SKILL_PATTERNS = [
  /\b\d{4}\b/, // Years (2020, 2021, etc.)
  /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/, // Dates
  /\b\d{1,2}-\d{1,2}-\d{2,4}\b/, // Dates
  /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i, // Months
  /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i, // Month abbreviations
  /\b\d+\s*(years?|months?|weeks?|days?)\b/i, // Duration
  /\b(present|current|ongoing)\b/i, // Time indicators
  /\b[A-Z][a-z]+,\s*[A-Z]{2}\b/, // City, State format
  /\b[A-Z][a-z]+,\s*[A-Z][a-z]+\b/, // City, Country format
  /\b\d{5}(-\d{4})?\b/, // ZIP codes
  /\b\+?\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/, // Phone numbers
  /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/, // Email addresses
  /\bhttps?:\/\/\S+\b/, // URLs
  /\b(bachelor|master|phd|doctorate|degree|university|college|school)\b/i, // Education terms
  /\b(manager|director|senior|junior|lead|principal|associate|intern)\b/i, // Job titles
  /\b(company|corporation|inc|llc|ltd|co)\b/i, // Company terms
];

// Pattern to detect comma-separated skill lists
const SKILL_LIST_PATTERN = /(?:skills:?)?\s*([\w\s]+(?:,\s*[\w\s]+)+)/i;

export const extractSkills = (sections: ResumeSectionToLines) => {
  let allSkills: string[] = [];

  // Helper function to check if text is likely a skill
  const isLikelySkill = (text: string): boolean => {
    const trimmed = text.trim();

    // Basic validation
    if (trimmed.length < 2 || trimmed.length > 30) return false;
    if (!/[a-zA-Z]/.test(trimmed)) return false;
    if (/^\d+$/.test(trimmed)) return false;
    if (trimmed.split(/\s+/).length > 3) return false;

    // Check against non-skill patterns
    if (NON_SKILL_PATTERNS.some((pattern) => pattern.test(trimmed)))
      return false;

    // Exclude common non-skill terms
    const nonSkillTerms = [
      'experience',
      'years',
      'months',
      'level',
      'proficient',
      'familiar',
      'knowledge',
      'working',
      'hands',
      'strong',
      'solid',
      'extensive',
      'responsible',
      'duties',
      'tasks',
      'projects',
      'worked',
      'developed',
      'created',
      'managed',
      'led',
      'team',
      'project',
      'client',
      'customer',
      'company',
      'organization',
      'department',
      'position',
      'role',
      'job',
    ];

    if (nonSkillTerms.includes(trimmed.toLowerCase())) return false;

    return true;
  };

  const processSkillsFromText = (text: string) => {
    // Remove noise words first
    let cleanText = text;
    NOISE_WORDS.forEach((noise) => {
      cleanText = cleanText
        .replace(new RegExp(`\\b${noise}\\b`, 'gi'), '')
        .trim();
    });

    // Try to split by delimiters
    let skills = [cleanText];
    for (const delimiter of SKILL_DELIMITERS) {
      if (cleanText.includes(delimiter)) {
        skills = cleanText
          .split(delimiter)
          .map((s) => s.trim())
          .filter((s) => s.length > 1);
        break;
      }
    }

    // Process each potential skill
    skills.forEach((skill) => {
      // Clean up the skill text
      const cleanSkill = skill
        .replace(/\s+/g, ' ')
        .replace(/^(?:-|\*|\+|\d+\.)\s*/, '')
        .replace(/[^\w\s]/g, ' ') // Replace special chars with spaces
        .trim();

      if (isLikelySkill(cleanSkill)) {
        allSkills.push(cleanSkill);
      }
    });
  };

  const processSkillsFromLines = (lines: (typeof sections)[string]) => {
    lines.forEach((lineGroup) => {
      lineGroup.forEach((line) => {
        const text = line.text.trim();

        // Skip empty lines, very short lines, or lines that look like headers/dates
        if (!text || text.length < 2) return;
        if (/^\d{4}$/.test(text)) return; // Skip years
        if (
          /^(january|february|march|april|may|june|july|august|september|october|november|december)/i.test(
            text,
          )
        )
          return;
        if (/^[A-Z][a-z]+,\s*[A-Z]{2}$/.test(text)) return; // Skip "City, ST"

        // Check if it matches skill list pattern
        const match = text.match(SKILL_LIST_PATTERN);
        if (match && match[1]) {
          processSkillsFromText(match[1]);
        } else if (
          !/\b(manager|director|engineer|developer|analyst|specialist|coordinator|assistant)\b/i.test(
            text,
          )
        ) {
          processSkillsFromText(text);
        }
      });
    });
  };

  // Step 1: Look for dedicated skills sections first
  const skillsSection = Object.entries(sections).find(([sectionName]) =>
    SKILL_KEYWORDS.some((keyword) =>
      sectionName.toLowerCase().includes(keyword.toLowerCase()),
    ),
  );

  if (skillsSection) {
    const [, lines] = skillsSection;
    processSkillsFromLines(lines);
  }

  // Step 2: Look for inline skills headers (like "Skills: JavaScript, Python")
  if (allSkills.length < 3) {
    // Only if we didn't find much in dedicated section
    Object.entries(sections).forEach(([sectionName, lines]) => {
      // Skip sections that are definitely not skills-related
      const excludeSections = [
        'profile',
        'experience',
        'education',
        'work',
        'employment',
        'projects',
        'project',
        'job',
        'career',
        'history',
        'background',
        'summary',
        'objective',
        'contact',
        'personal',
        'reference',
        'award',
        'achievement',
        'certification',
      ];

      if (
        excludeSections.some((section) =>
          sectionName.toLowerCase().includes(section),
        )
      ) {
        return;
      }

      lines.forEach((lineGroup) => {
        lineGroup.forEach((line) => {
          const text = line.text.trim();

          // Look for lines that start with skill headers
          if (SKILL_HEADER_PATTERNS.some((pattern) => pattern.test(text))) {
            const matchedPattern = SKILL_HEADER_PATTERNS.find((p) =>
              p.test(text),
            )!;
            const remainingText = text.replace(matchedPattern, '').trim();

            if (remainingText && remainingText.length > 3) {
              processSkillsFromText(remainingText);
            }
          }
        });
      });
    });
  }

  // Remove duplicates while preserving order
  allSkills = [...new Set(allSkills)];

  const featuredSkills: FeaturedSkill[] = deepClone(initialFeaturedSkills);
  allSkills.slice(0, 9).forEach((skill, i) => {
    featuredSkills[i].skill = skill;
  });

  const descriptions = allSkills.slice(9);

  const skills: ResumeSkills = {
    featuredSkills,
    descriptions,
  };

  return { skills };
};
