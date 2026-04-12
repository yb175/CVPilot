import type { MatchResult } from "../types/parsing.js";
import type { ParsedResume } from "../../validators/resume.schema.js";
import type { NormalizedJob } from "../types/parsing.js";
import { logger } from "../../lib/logger.js";

const REGEX_TIMEOUT_MS = 5000; // Should be instant, but safety timeout

/**
 * Match jobs using regex/heuristic fallback
 * Deterministic scoring based on skill match, tech stack, seniority, location
 */
export function matchJobsWithRegex(
  resume: ParsedResume,
  jobs: NormalizedJob[]
): MatchResult[] {
  const startTime = Date.now();

  logger.info("REGEX_JOB_MATCHING_START", {
    jobCount: jobs.length,
  });

  const results: MatchResult[] = [];

  for (const job of jobs) {
    try {
      const score = calculateJobScore(resume, job);
      results.push({
        jobId: job.job_id,
        score,
        confidence: 0.75, // Fixed confidence for regex (lower than LLM)
        reason: generateScoreReason(resume, job, score),
        source: "regex",
      });
    } catch (error) {
      logger.error("REGEX_MATCH_FAILED", {
        jobId: job.job_id,
        error: error instanceof Error ? error.message : String(error),
      });
      // Continue with other jobs
    }
  }

  const duration = Date.now() - startTime;

  logger.info("REGEX_JOB_MATCHING_COMPLETE", {
    totalJobs: jobs.length,
    matchedJobs: results.length,
    duration,
  });

  return results;
}

/**
 * Calculate score (0-100) based on multiple factors
 */
function calculateJobScore(resume: ParsedResume, job: NormalizedJob): number {
  let score = 0;

  // 1. Skill match (40 points)
  const skillScore = calculateSkillMatch(resume.skills || [], job.skills);
  score += skillScore * 0.4;

  // 2. Tech stack match (30 points)
  const techStackScore = calculateTechStackMatch(resume.techStack || {}, job.description);
  score += techStackScore * 0.3;

  // 3. Seniority fit (20 points)
  const seniorityScore = calculateSeniorityFit(resume.seniority || "Junior", job.title);
  score += seniorityScore * 0.2;

  // 4. Location match (10 points)
  const locationScore = calculateLocationMatch(resume, job);
  score += locationScore * 0.1;

  return Math.round(Math.min(100, Math.max(0, score)));
}

/**
 * Calculate skill match (0-100)
 * Uses Jaccard similarity: intersection / union
 */
function calculateSkillMatch(resumeSkills: string[], jobSkills: string[]): number {
  if (resumeSkills.length === 0 || jobSkills.length === 0) {
    return 0;
  }

  const normalized = resumeSkills.map(normalizeSkill);
  const normalized2 = jobSkills.map(normalizeSkill);

  const intersection = normalized.filter((skill) =>
    normalized2.some((js) => levenshteinDistance(skill, js) <= 2)
  );

  const union = new Set([...normalized, ...normalized2]).size;

  const jaccardSimilarity = intersection.length / union;
  return Math.round(jaccardSimilarity * 100);
}

/**
 * Calculate tech stack match (0-100)
 * Check if job description contains candidate's tech stack
 */
function calculateTechStackMatch(
  techStack: Record<string, string>,
  jobDescription: string
): number {
  const lowerDesc = jobDescription.toLowerCase();
  let matchCount = 0;
  let totalCount = 0;

  for (const [_category, tech] of Object.entries(techStack)) {
    if (!tech) continue;

    totalCount++;
    const techList = tech.split("|").map((t) => t.trim().toLowerCase());

    for (const t of techList) {
      if (lowerDesc.includes(t)) {
        matchCount++;
        break; // Count each category only once
      }
    }
  }

  if (totalCount === 0) return 0;

  return Math.round((matchCount / totalCount) * 100);
}

/**
 * Calculate seniority fit (0-100)
 * Intern candidate should prefer intern/entry-level roles
 * Senior shouldn't apply to junior roles
 */
function calculateSeniorityFit(candidateSeniority: string, jobTitle: string): number {
  const lowerTitle = jobTitle.toLowerCase();

  const isIntern = candidateSeniority === "Intern";
  const isJunior = candidateSeniority === "Junior";
  const isMid = candidateSeniority === "Mid";
  const isSenior = candidateSeniority === "Senior";

  const jobIsIntern =
    lowerTitle.includes("intern") ||
    lowerTitle.includes("entry") ||
    lowerTitle.includes("graduate");
  const jobIsJunior = lowerTitle.includes("junior") || lowerTitle.includes("entry-level");
  const jobIsMid =
    !lowerTitle.includes("senior") &&
    !lowerTitle.includes("lead") &&
    !lowerTitle.includes("intern") &&
    !lowerTitle.includes("junior");
  const jobIsSenior =
    lowerTitle.includes("senior") ||
    lowerTitle.includes("lead") ||
    lowerTitle.includes("principal") ||
    lowerTitle.includes("staff");

  // Perfect matches
  if (isIntern && jobIsIntern) return 100;
  if (isJunior && jobIsJunior) return 100;
  if (isMid && jobIsMid) return 90;
  if (isSenior && jobIsSenior) return 100;

  // Close matches
  if (isIntern && jobIsJunior) return 80;
  if (isJunior && jobIsMid) return 75;
  if (isMid && jobIsSenior) return 70;

  // One step away
  if (isIntern && jobIsMid) return 50;
  if (isJunior && jobIsSenior) return 40;

  // Significant mismatch (overqualified or underqualified)
  if (isIntern && jobIsSenior) return 20;
  if (isSenior && jobIsIntern) return 30;
  if (isSenior && jobIsJunior) return 40;

  return 60; // Default neutral fit
}

/**
 * Calculate location match (0-100)
 */
function calculateLocationMatch(resume: ParsedResume, job: NormalizedJob): number {
  // If no location preference specified, consider it flexible
  if (!resume.location) {
    return 100;
  }

  const lowerResume = resume.location.toLowerCase();
  const lowerJob = job.location.toLowerCase();

  // Remote is always a match if candidate wants it
  if (resume.remote && (lowerJob.includes("remote") || lowerJob.includes("wfh"))) {
    return 100;
  }

  // Hybrid is flexible
  if (
    lowerJob.includes("hybrid") ||
    lowerJob.includes("flexible") ||
    lowerJob.includes("remote")
  ) {
    return 90;
  }

  // Exact location match
  if (
    lowerResume.includes(lowerJob.split(",")[0]) ||
    lowerJob.includes(lowerResume.split(",")[0])
  ) {
    return 100;
  }

  // Country/state level match
  if (lowerResume.includes(lowerJob) || lowerJob.includes(lowerResume)) {
    return 85;
  }

  // Not remote but candidate prefers remote
  if (resume.remote) {
    return 40;
  }

  // Different locations
  return 50;
}

/**
 * Generate a short reason for the score
 */
function generateScoreReason(
  resume: ParsedResume,
  job: NormalizedJob,
  score: number
): string {
  const skillMatch = calculateSkillMatch(resume.skills || [], job.skills);
  const isGoodMatch = score >= 70;

  if (isGoodMatch && skillMatch >= 80) {
    return `Strong skill alignment (${skillMatch}% match)`;
  } else if (isGoodMatch) {
    return `Good match across skills and experience`;
  } else if (score >= 50) {
    return `Partial match, some skill gaps`;
  } else {
    return `Limited match, significant gaps`;
  }
}

/**
 * Normalize skill name for comparison
 */
function normalizeSkill(skill: string): string {
  return skill
    .toLowerCase()
    .replace(/[.\s-]/g, "")
    .replace(/\.js$/i, "")
    .replace(/\.ts$/i, "")
    .trim();
}

/**
 * Levenshtein distance for fuzzy matching
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = Array(b.length + 1)
    .fill(null)
    .map(() => Array(a.length + 1).fill(0));

  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }

  return matrix[b.length][a.length];
}
