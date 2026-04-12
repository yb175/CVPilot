import type { ParsedResume } from "../../validators/resume.schema.js";
import { logger } from "../../lib/logger.js";

/**
 * =====================================================
 * PROFILE PREPROCESSOR FOR LLM INPUT
 * =====================================================
 * 
 * Purpose: Normalize and validate candidate profile before LLM
 * - Clean skill formatting
 * - Deduplicate and normalize tech stack
 * - Flag missing critical fields
 * - Enrich with inferred data where safe
 */

export interface ProcessedResumeProfile {
  name: string;
  seniority: string;
  experienceYears: number;
  currentRole: string;
  location: string;
  remote: boolean;
  skills: string[];
  techStack: Record<string, string>;
  projects: Array<{ name: string; description: string }>;
  keywords: string[];
  education: { degree: string; institution: string };
  
  // Diagnostics
  dataQuality: "high" | "medium" | "low";
  missingFields: string[];
}

const SKILL_NORMALIZATION_MAP: Record<string, string> = {
  "react.js": "React",
  "reactjs": "React",
  "react js": "React",
  "node.js": "Node.js",
  "nodejs": "Node.js",
  "node js": "Node.js",
  "typescript": "TypeScript",
  "type script": "TypeScript",
  "python": "Python",
  "java": "Java",
  "javascript": "JavaScript",
  "js": "JavaScript",
  "angular": "Angular",
  "vue": "Vue",
  "express": "Express",
  "django": "Django",
  "flask": "Flask",
  "spring": "Spring",
  "postgres": "PostgreSQL",
  "postgresql": "PostgreSQL",
  "mongo": "MongoDB",
  "mongodb": "MongoDB",
  "aws": "AWS",
  "azure": "Azure",
  "gcp": "Google Cloud",
  "docker": "Docker",
  "kubernetes": "Kubernetes",
  "k8s": "Kubernetes",
  "graphql": "GraphQL",
  "rest api": "REST API",
  "sql": "SQL",
  "nosql": "NoSQL",
  "git": "Git",
  "github": "GitHub",
  "gitlab": "GitLab",
  "ci/cd": "CI/CD",
  "devops": "DevOps",
  "machine learning": "Machine Learning",
  "ml": "Machine Learning",
  "ai": "AI",
  "deep learning": "Deep Learning",
};

/**
 * Normalize a single skill name
 */
function normalizeSkill(skill: string): string {
  const lower = skill.toLowerCase().trim();
  return SKILL_NORMALIZATION_MAP[lower] || skill;
}

/**
 * Process and clean resume for LLM input
 */
export function processResumeForLLM(resume: ParsedResume): ProcessedResumeProfile {
  const missingFields: string[] = [];

  // ===== BASIC INFO =====
  const name = resume.name?.trim() || "Candidate";
  if (!resume.name) missingFields.push("name");

  const seniority = resume.seniority || "Junior";
  if (!resume.seniority) missingFields.push("seniority");

  const experienceYears = resume.experienceYears ?? 0;
  if (!resume.experienceYears) missingFields.push("experienceYears");

  const currentRole = resume.currentRole?.trim() || "Software Developer";
  if (!resume.currentRole) missingFields.push("currentRole");

  const location = resume.location?.trim() || "Not specified";
  if (!resume.location) missingFields.push("location");

  const remote = resume.remote ?? false;

  // ===== SKILLS =====
  let skills: string[] = [];
  if (resume.skills && resume.skills.length > 0) {
    skills = Array.from(new Set(resume.skills.map(normalizeSkill)))
      .filter((s) => s.trim().length > 0)
      .slice(0, 25);
  } else {
    missingFields.push("skills");
  }

  // ===== TECH STACK =====
  let techStack: Record<string, string> = {};
  if (resume.techStack) {
    for (const [cat, val] of Object.entries(resume.techStack)) {
      if (val && typeof val === "string") {
        // Parse comma/pipe separated values and normalize each
        const techs = val
          .split(/[,|]/)
          .map((t) => t.trim())
          .map(normalizeSkill)
          .filter((t) => t.length > 0);

        if (techs.length > 0) {
          techStack[cat] = techs.join(", ");
        }
      }
    }
  }
  if (Object.keys(techStack).length === 0) missingFields.push("techStack");

  // ===== PROJECTS =====
  let projects: Array<{ name: string; description: string }> = [];
  if (resume.projects && resume.projects.length > 0) {
    projects = resume.projects
      .filter((p) => p.name && p.description)
      .slice(0, 5);
  }
  if (projects.length === 0) missingFields.push("projects");

  // ===== KEYWORDS =====
  let keywords: string[] = [];
  if (resume.keywords && resume.keywords.length > 0) {
    keywords = Array.from(new Set(resume.keywords.filter((k) => k.trim().length > 0)))
      .slice(0, 15);
  }

  // ===== EDUCATION =====
  const education = {
    degree: resume.education?.degree?.trim() || "Not specified",
    institution: resume.education?.institution?.trim() || "Not specified",
  };
  if (!resume.education?.degree || !resume.education?.institution) {
    missingFields.push("education");
  }

  // ===== DATA QUALITY =====
  const filledFields = 7 - missingFields.length;
  const dataQuality: "high" | "medium" | "low" =
    filledFields >= 6 ? "high" : filledFields >= 4 ? "medium" : "low";

  const processed: ProcessedResumeProfile = {
    name,
    seniority,
    experienceYears,
    currentRole,
    location,
    remote,
    skills,
    techStack,
    projects,
    keywords,
    education,
    dataQuality,
    missingFields,
  };

  // Log profile quality
  logger.info("RESUME_PREPROCESSED", {
    name,
    dataQuality,
    skillsCount: skills.length,
    techStackCategories: Object.keys(techStack).length,
    projectsCount: projects.length,
    missingFieldsCount: missingFields.length,
  });

  return processed;
}

/**
 * Profile completeness score (0-1)
 * Used to anchor confidence calculation
 */
export function calculateProfileCompleteness(
  processed: ProcessedResumeProfile
): number {
  const requiredFields = 7; // seniority, skills, techStack, projects, keywords, education, location
  const filledFields = requiredFields - processed.missingFields.length;
  return filledFields / requiredFields;
}

/**
 * Diagnostic: Check if profile is too sparse for reliable LLM matching
 */
export function isProfileTooSparse(processed: ProcessedResumeProfile): boolean {
  const issues: string[] = [];

  if (processed.skills.length === 0) issues.push("No skills");
  if (Object.keys(processed.techStack).length === 0) issues.push("No tech stack");
  if (processed.experienceYears === 0) issues.push("No experience");
  if (processed.seniority === "Junior" && processed.skills.length < 3)
    issues.push("Junior with <3 skills");

  if (issues.length >= 2) {
    logger.warn("PROFILE_TOO_SPARSE_FOR_LLM", {
      issues,
      completeness: calculateProfileCompleteness(processed),
    });
    return true;
  }

  return false;
}
