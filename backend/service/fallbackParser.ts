import { ParsedResume } from "../validators/resume.schema.js";
import { logParsingEvent } from "../lib/parseLogger.js";
import { FallbackParsingOptions } from "./types/parsing.js";

/**
 * =====================================
 * 🔄 Fallback Parser (Rule-based)
 * =====================================
 *
 * Basic keyword-based extraction when LLM fails.
 * Focuses on reliability over completeness.
 */

// Common technical skills keywords
const SKILLS_KEYWORDS = [
  // Languages
  "javascript",
  "typescript",
  "python",
  "java",
  "csharp",
  "cpp",
  "ruby",
  "php",
  "go",
  "rust",
  "kotlin",
  "swift",

  // Frontend
  "react",
  "vue",
  "angular",
  "svelte",
  "nextjs",
  "gatsby",
  "html",
  "css",
  "sass",
  "tailwind",
  "bootstrap",
  "webpack",
  "vite",

  // Backend
  "nodejs",
  "node.js",
  "express",
  "fastapi",
  "django",
  "flask",
  "rails",
  "laravel",
  "spring",
  "dotnet",

  // Databases
  "sql",
  "postgresql",
  "mysql",
  "mongodb",
  "firebase",
  "redis",
  "elasticsearch",
  "cassandra",
  "dynamodb",

  // DevOps & Tools
  "docker",
  "kubernetes",
  "aws",
  "gcp",
  "azure",
  "gitlab",
  "github",
  "jenkins",
  "terraform",
  "ansible",
  "nginx",
  "apache",
  "git",

  // Other
  "graphql",
  "rest",
  "api",
  "microservices",
  "agile",
  "scrum",
  "jira",
  "linux",
  "macos",
  "windows",
];

// Education keywords
const EDUCATION_KEYWORDS = [
  "b.s.",
  "b.a.",
  "m.s.",
  "m.a.",
  "m.b.a.",
  "ph.d.",
  "bachelor",
  "master",
  "doctorate",
  "diploma",
  "certification",
];

// Seniority indicators
const SENIORITY_MAPPING: Record<string, "Senior" | "Mid" | "Junior" | "Intern"> = {
  "principal engineer": "Senior",
  "staff engineer": "Senior",
  "senior engineer": "Senior",
  "senior developer": "Senior",
  "senior software": "Senior",
  "lead engineer": "Senior",
  "architect": "Senior",
  "senior manager": "Senior",

  "mid-level": "Mid",
  "mid level": "Mid",
  "engineer": "Mid",
  "developer": "Mid",
  "software engineer": "Mid",

  "junior engineer": "Junior",
  "junior developer": "Junior",
  "associate engineer": "Junior",

  "intern": "Intern",
  "graduate": "Intern",
};

/**
 * Fallback parsing - extract what we can reliably extract
 */
export const fallbackParsing = (
  resumeText: string,
  resumeId: string,
  options?: FallbackParsingOptions & { userId?: string }
): ParsedResume => {
  logParsingEvent("FALLBACK_PARSE", resumeId, "start", {
    userId: options?.userId,
    message: "Starting fallback rule-based parsing",
  });

  const extractSkills = options?.extractSkills !== false;
  const extractEducation = options?.extractEducation !== false;

  const result: ParsedResume = {
    name: null,
    skills: null,
    currentRole: null,
    experienceYears: null,
    seniority: null,
    location: null,
    remote: null,
    techStack: null,
    projects: null,
    keywords: null,
    education: { degree: null, institution: null },
  };

  // Extract name - first line or first capitalized phrase
  const nameMatch = resumeText.match(/^([A-Z][a-z]+\s)+[A-Z][a-z]+/m);
  if (nameMatch) {
    result.name = nameMatch[0].trim();
  }

  // Extract skills by keyword matching
  if (extractSkills) {
    const extractedSkills = extractSkillsFromText(resumeText);
    if (extractedSkills.length > 0) {
      result.skills = extractedSkills;
    }
  }

  // Extract education
  if (extractEducation) {
    const extractedEducation = extractEducationFromText(resumeText);
    if (extractedEducation) {
      result.education = {
        degree: extractedEducation.degree || null,
        institution: extractedEducation.institution || null
      };
    }
  }

  // Extract seniority from title/keywords
  const seniorityExtracted = extractSeniorityFromText(resumeText);
  if (seniorityExtracted) {
    result.seniority = seniorityExtracted;
  }

  // Extract experience years - look for "X years of experience" pattern
  const yearsMatch = resumeText.match(/(\d+)\+?\s+years?/i);
  if (yearsMatch) {
    result.experienceYears = parseInt(yearsMatch[1], 10);
  }

  // Extract current role from common patterns
  const roleMatch = resumeText.match(
    /(Currently|working as|position:)\s+([A-Za-z\s]+?)(?:\n|$)/i
  );
  if (roleMatch) {
    result.currentRole = roleMatch[2].trim();
  }

  // Check for remote work mentions
  if (/remote|distributed|work from home/i.test(resumeText)) {
    result.remote = true;
  } else if (/on.?site|onsite|office|in-office/i.test(resumeText)) {
    result.remote = false;
  }

  // Extract location (basic - look for city/state patterns)
  const locationMatch = resumeText.match(
    /(?:Location:|Based in|From|Located in)\s+([A-Za-z\s,]+?)(?:\n|$)/i
  );
  if (locationMatch) {
    result.location = locationMatch[1].trim();
  }

  logParsingEvent("FALLBACK_PARSE", resumeId, "success", {
    userId: options?.userId,
    message: "Fallback parsing complete",
    metadata: {
      fieldsExtracted: Object.keys(result).filter((k) => result[k as keyof ParsedResume] != null),
    },
  });

  return result;
};

/**
 * Extract skills by keyword matching
 */
function extractSkillsFromText(text: string): string[] {
  const lowerText = text.toLowerCase();
  const foundSkills = new Set<string>();

  for (const skill of SKILLS_KEYWORDS) {
    // Match whole words only
    const regex = new RegExp(`\\b${skill}\\b`, "gi");
    if (regex.test(lowerText)) {
      foundSkills.add(skill);
    }
  }

  // Return as array, maintaining original case where possible
  return Array.from(foundSkills)
    .map((skill) => {
      // Try to find original case in text
      const originalMatch = text.match(new RegExp(skill, "i"));
      return originalMatch ? originalMatch[0] : skill;
    })
    .filter((s, idx, arr) => arr.indexOf(s) === idx); // Remove duplicates
}

/**
 * Extract education from text
 */
function extractEducationFromText(text: string): { degree: string | null; institution: string | null } | null {
  // Look for degree patterns like "B.S. in Computer Science"
  const degreePatterns = [
    /([A-Z]\.?[A-Z]\.)\s+(?:in|of)?\s+([A-Za-z\s]+?)(?:\n|,|from)/i,
    /(Bachelor|Master|Doctor|Diploma)(?:'s)?\s+(?:of|in)\s+([A-Za-z\s]+?)(?:\n|,|from)/i,
  ];

  for (const pattern of degreePatterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        degree: match[1],
        institution: match[2]?.trim() || null,
      };
    }
  }

  return null;
}

/**
 * Extract seniority level from text
 */
function extractSeniorityFromText(text: string): "Senior" | "Mid" | "Junior" | "Intern" | null {
  const lowerText = text.toLowerCase();

  for (const [keyword, level] of Object.entries(SENIORITY_MAPPING)) {
    if (lowerText.includes(keyword)) {
      return level;
    }
  }

  return null;
}
