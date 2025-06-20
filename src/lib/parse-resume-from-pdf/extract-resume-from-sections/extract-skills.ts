import type { ResumeSkills } from "@/lib/redux/types";
import type { ResumeSectionToLines } from "@/lib/parse-resume-from-pdf/types";
import { deepClone } from "@/lib/deep-clone";
import { getSectionLinesByKeywords } from "@/lib/parse-resume-from-pdf/extract-resume-from-sections/lib/get-section-lines";
import { initialFeaturedSkills } from "@/lib/redux/resumeSlice";
import {
  getBulletPointsFromLines,
  getDescriptionsLineIdx,
} from "@/lib/parse-resume-from-pdf/extract-resume-from-sections/lib/bullet-points";

// Common skill keywords to help identify skill-related content
const SKILL_KEYWORDS = [
  "javascript",
  "python",
  "java",
  "react",
  "node",
  "angular",
  "vue",
  "html",
  "css",
  "sql",
  "mongodb",
  "postgresql",
  "mysql",
  "git",
  "docker",
  "kubernetes",
  "aws",
  "azure",
  "gcp",
  "typescript",
  "php",
  "ruby",
  "go",
  "rust",
  "swift",
  "flutter",
  "django",
  "flask",
  "spring",
  "express",
  "figma",
  "photoshop",
  "illustrator",
  "sketch",
  "agile",
  "scrum",
  "jira",
  "confluence",
  "tensorflow",
  "pytorch",
  "opencv",
  "numpy",
  "pandas",
  "communication",
  "leadership",
  "teamwork",
  "problem solving",
];

export const extractSkills = (sections: ResumeSectionToLines) => {
  // Get all lines from the resume
  const allLines = Object.values(sections).flat();

  // Extract featured skills using pattern detection
  const featuredSkills = extractFeaturedSkillsFromPatterns(allLines);

  // Get skill-specific sections for descriptions
  const skillLines = getSectionLinesByKeywords(sections, [
    "skill",
    "skills",
    "technical skills",
    "core competencies",
    "technologies",
    "programming languages",
    "tools",
  ]);

  const descriptionsLineIdx = getDescriptionsLineIdx(skillLines) ?? 0;
  const descriptionsLines = skillLines.slice(descriptionsLineIdx);
  const descriptions = getBulletPointsFromLines(descriptionsLines);

  const skills: ResumeSkills = {
    featuredSkills,
    descriptions,
  };

  return { skills };
};

/**
 * Determines minimum number of items needed for different separators
 */
const getMinItemsForSeparator = (separator: string): number => {
  switch (separator) {
    case ",":
    case ";":
      // Comma and semicolon lists need at least 4 items to be considered skills
      // 2-3 items are usually: "City, State", "First, Last", etc.
      return 4;
    case "|":
    case "•":
    case "·":
      // Pipe and bullet separators can be valid with fewer items
      // These are less commonly used for addresses/names
      return 2;
    case "/":
    case "\\":
      // Slash separators often used for tech stacks, can be shorter
      return 2;
    default:
      return 3;
  }
};

/**
 * Extracts featured skills by finding comma/pipe/semicolon separated patterns
 */
const extractFeaturedSkillsFromPatterns = (allLines: any[]) => {
  const featuredSkills = deepClone(initialFeaturedSkills);

  // Collect all potential skill lists from the resume
  const skillCandidates = findSkillPatterns(allLines);

  // Score and rank the candidates
  const rankedSkills = rankSkillCandidates(skillCandidates);

  // Fill featured skills with top candidates
  for (let i = 0; i < Math.min(rankedSkills.length, 6); i++) {
    featuredSkills[i].skill = rankedSkills[i].skill;
  }

  return featuredSkills;
};

/**
 * Finds patterns of skills separated by common delimiters
 */
const findSkillPatterns = (allLines: any[]): SkillCandidate[] => {
  const skillCandidates: SkillCandidate[] = [];

  for (const line of allLines) {
    for (const item of line) {
      if (!item?.text) continue;

      const text = item.text.trim();
      if (text.length < 3) continue;

      // Find separated lists using different delimiters
      const separators = [",", "|", ";", "•", "·", "/", "\\"];

      for (const separator of separators) {
        if (text.includes(separator)) {
          const parts = text
            .split(separator)
            .map((part) => part.trim())
            .filter((part) => part.length > 1 && part.length < 30); // Reasonable skill name length

          if (parts.length >= 2) {
            // Check if this looks like a skills list
            const skillScore = calculateSkillListScore(parts, text);

            if (skillScore > 0) {
              parts.forEach((part) => {
                skillCandidates.push({
                  skill: cleanSkillText(part),
                  score: skillScore,
                  context: text,
                  separator: separator,
                });
              });
            }
          }
        }
      }

      // Also check for space-separated skills in skill-related sections
      if (isLikelySkillContext(text)) {
        const words = text
          .split(/\s+/)
          .map((word) => word.trim())
          .filter((word) => word.length > 2 && word.length < 20);

        if (words.length >= 2 && words.length <= 8) {
          const skillScore = calculateWordListScore(words, text);

          if (skillScore > 0) {
            words.forEach((word) => {
              skillCandidates.push({
                skill: cleanSkillText(word),
                score: skillScore * 0.7, // Lower score for space-separated
                context: text,
                separator: " ",
              });
            });
          }
        }
      }
    }
  }

  return skillCandidates;
};

/**
 * Calculates how likely a list of parts represents skills
 */
const calculateSkillListScore = (parts: string[], fullText: string): number => {
  let score = 0;

  // Check if parts contain known skill keywords
  const skillMatches = parts.filter((part) =>
    SKILL_KEYWORDS.some((keyword) =>
      part.toLowerCase().includes(keyword.toLowerCase())
    )
  ).length;

  score += skillMatches * 2; // +2 for each skill match

  // Bonus for skill-related context
  if (isLikelySkillContext(fullText)) {
    score += 3;
  }

  // Bonus for consistent capitalization (common in skill lists)
  const properCaseCount = parts.filter(
    (part) => /^[A-Z][a-z]/.test(part) || /^[A-Z]+$/.test(part)
  ).length;

  if (properCaseCount >= parts.length * 0.7) {
    score += 2;
  }

  // Penalty for very long parts (likely not skills)
  const longParts = parts.filter((part) => part.length > 25).length;
  score -= longParts;

  // Penalty for parts with many spaces (likely sentences)
  const sentenceParts = parts.filter(
    (part) => part.split(" ").length > 4
  ).length;
  score -= sentenceParts * 2;

  return Math.max(0, score);
};

/**
 * Calculates score for space-separated word lists
 */
const calculateWordListScore = (words: string[], fullText: string): number => {
  let score = 0;

  // Check for known skills
  const skillMatches = words.filter((word) =>
    SKILL_KEYWORDS.some((keyword) =>
      word.toLowerCase().includes(keyword.toLowerCase())
    )
  ).length;

  score += skillMatches * 1.5;

  // Must be in skill context for space-separated to be valid
  if (!isLikelySkillContext(fullText)) {
    return 0;
  }

  score += 2; // Bonus for skill context

  // Check for tech-like patterns (camelCase, PascalCase, etc.)
  const techPatterns = words.filter(
    (word) => /[A-Z]/.test(word) || word.includes(".") || word.includes("+")
  ).length;

  score += techPatterns * 0.5;

  return score;
};

/**
 * Checks if text appears in a skill-related context
 */
const isLikelySkillContext = (text: string): boolean => {
  const lowerText = text.toLowerCase();

  const skillContextKeywords = [
    "skill",
    "technology",
    "programming",
    "language",
    "framework",
    "tool",
    "software",
    "platform",
    "database",
    "library",
    "proficient",
    "experience",
    "familiar",
    "knowledge",
    "technical",
    "core competencies",
    "expertise",
  ];

  return skillContextKeywords.some((keyword) => lowerText.includes(keyword));
};

/**
 * Cleans and normalizes skill text
 */
const cleanSkillText = (skill: string): string => {
  return skill
    .replace(/[^\w\s.+#-]/g, "") // Remove special chars except common ones in tech
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
};

/**
 * Ranks skill candidates by score and removes duplicates
 */
const rankSkillCandidates = (
  candidates: SkillCandidate[]
): SkillCandidate[] => {
  // Group by skill name (case-insensitive)
  const skillGroups = new Map<string, SkillCandidate[]>();

  candidates.forEach((candidate) => {
    const normalizedSkill = candidate.skill.toLowerCase();
    if (!skillGroups.has(normalizedSkill)) {
      skillGroups.set(normalizedSkill, []);
    }
    skillGroups.get(normalizedSkill)!.push(candidate);
  });

  // Get best candidate for each skill
  const bestCandidates: SkillCandidate[] = [];

  skillGroups.forEach((group, skillName) => {
    // Sort by score and pick the best one
    group.sort((a, b) => b.score - a.score);
    const best = group[0];

    // Only include if score is reasonable and skill name is valid
    if (best.score > 1 && best.skill.length > 1 && best.skill.length < 25) {
      bestCandidates.push(best);
    }
  });

  // Sort by score and return top candidates
  return bestCandidates.sort((a, b) => b.score - a.score).slice(0, 12); // Get top 12 candidates
};

interface SkillCandidate {
  skill: string;
  score: number;
  context: string;
  separator: string;
}

/**
 * Alternative extraction method that's more aggressive
 */
export const extractSkillsAggressive = (sections: ResumeSectionToLines) => {
  const allLines = Object.values(sections).flat();
  const allText = allLines
    .flat()
    .map((item) => item?.text || "")
    .join(" ");

  // Find all potential skill patterns using regex
  const patterns = [
    // Comma-separated lists
    /(?:skills?|technologies?|tools?|languages?)[:\s]*([a-zA-Z0-9\s,+#.-]+)/gi,
    // Lists after colons
    /([A-Z][a-zA-Z\s]*?):\s*([a-zA-Z0-9\s,|;+#.-]+)/g,
    // Bullet point lists
    /(?:•|·|\*)\s*([a-zA-Z0-9\s,+#.-]+)/g,
  ];

  const skillCandidates: SkillCandidate[] = [];

  patterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(allText)) !== null) {
      const skillText = match[match.length - 1]; // Last capture group

      if (skillText && skillText.length > 3) {
        const separators = [",", "|", ";", "•", "·"];

        for (const sep of separators) {
          if (skillText.includes(sep)) {
            const skills = skillText
              .split(sep)
              .map((s) => cleanSkillText(s))
              .filter((s) => s.length > 1 && s.length < 25);

            skills.forEach((skill) => {
              skillCandidates.push({
                skill,
                score: 2,
                context: match[0],
                separator: sep,
              });
            });
            break;
          }
        }
      }
    }
  });

  const rankedSkills = rankSkillCandidates(skillCandidates);
  const featuredSkills = deepClone(initialFeaturedSkills);

  for (let i = 0; i < Math.min(rankedSkills.length, 6); i++) {
    featuredSkills[i].skill = rankedSkills[i].skill;
  }

  // Get descriptions from skill sections
  const skillLines = getSectionLinesByKeywords(sections, [
    "skill",
    "skills",
    "technical skills",
  ]);

  const descriptionsLineIdx = getDescriptionsLineIdx(skillLines) ?? 0;
  const descriptionsLines = skillLines.slice(descriptionsLineIdx);
  const descriptions = getBulletPointsFromLines(descriptionsLines);

  return {
    skills: {
      featuredSkills,
      descriptions,
    },
  };
};
