import type { ResumeSkills } from "@/lib/redux/types";
import type { ResumeSectionToLines } from "@/lib/parse-resume-from-pdf/types";
import { deepClone } from "@/lib/deep-clone";
import { initialFeaturedSkills } from "@/lib/redux/resumeSlice";

const SKILL_KEYWORDS = [
  "skills",
  "technical skills",
  "core competencies",
  "expertise",
  "proficiencies",
];
const SKILL_HEADER_PATTERNS = [
  /^(technical )?skills:?\s*/i,
  /^core competencies:?\s*/i,
  /^expertise:?\s*/i,
  /^proficiencies:?\s*/i,
];
const NOISE_WORDS = [
  "proficient in",
  "experienced with",
  "knowledge of",
  "familiar with",
];
const SKILL_DELIMITERS = [",", ";", "|", "•", "·", "-"];

// Pattern to detect comma-separated skill lists
const SKILL_LIST_PATTERN = /(?:skills:?)?\s*([\w\s]+(?:,\s*[\w\s]+)+)/i;

export const extractSkills = (sections: ResumeSectionToLines) => {
  // debugger
  let allSkills: string[] = [];

  const processSkillsFromText = (text: string) => {
    // Remove noise words
    NOISE_WORDS.forEach((noise) => {
      text = text.replace(new RegExp(`\\b${noise}\\b`, "gi"), "").trim();
    });

    let skills = [text];
    for (const delimiter of SKILL_DELIMITERS) {
      if (text.includes(delimiter)) {
        skills = text
          .split(delimiter)
          .map((s) => s.trim())
          .filter((s) => s.length > 1);
        break;
      }
    }

    skills.forEach((skill) => {
      // Remove extra spaces and common prefixes/suffixes
      skill = skill
        .replace(/\s+/g, " ")
        .replace(/^(?:-|\*|\+|\d+\.)\s*/, "")
        .trim();

      if (skill.length > 2 && !/^[^\w\s]+$/.test(skill)) {
        allSkills.push(skill);
      }
    });
  };

  const processSkillsFromLines = (lines: (typeof sections)[string]) => {
    lines.forEach((lineGroup) => {
      lineGroup.forEach((line) => {
        let text = line.text.trim();

        // Skip empty lines or lines that are too short
        if (!text || text.length < 2) return;

        const match = text.match(SKILL_LIST_PATTERN);
        if (match && match[1]) {
          processSkillsFromText(match[1]);
        } else {
          processSkillsFromText(text);
        }
      });
    });
  };

  const skillsSection = Object.entries(sections).find(([sectionName]) =>
    SKILL_KEYWORDS.some((keyword) =>
      sectionName.toLowerCase().includes(keyword)
    )
  );

  if (skillsSection) {
    const [, lines] = skillsSection;
    processSkillsFromLines(lines);
  }

  // Check for skills in content lines starting with "Skills:", "Technical Skills:", etc.
  Object.values(sections).forEach((lines) => {
    let isSkillsSection = false;
    let skillsLines: typeof lines = [];

    lines.forEach((lineGroup) => {
      if (isSkillsSection) {
        skillsLines.push(lineGroup);
      } else {
        const firstLine = lineGroup[0]?.text.trim();
        if (
          firstLine &&
          SKILL_HEADER_PATTERNS.some((pattern) => pattern.test(firstLine))
        ) {
          const matchedPattern = SKILL_HEADER_PATTERNS.find((p) =>
            p.test(firstLine)
          )!;
          const remainingText = firstLine.replace(matchedPattern, "").trim();

          if (remainingText) {
            processSkillsFromText(remainingText);
          }

          isSkillsSection = true;
        } else {
          const match = firstLine?.match(SKILL_LIST_PATTERN);
          if (match && match[1]) {
            processSkillsFromText(match[1]);
          }
        }
      }
    });

    if (skillsLines.length > 0) {
      processSkillsFromLines(skillsLines);
    }
  });

  // Remove duplicates while preserving order
  allSkills = [...new Set(allSkills)];

  const featuredSkills = deepClone(initialFeaturedSkills);
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
