import type { ParsedResume } from "../../../validators/resume.schema.js";
import type { NormalizedJob } from "../../types/parsing.js";

/**
 * Build deterministic prompt for job matching
 * Prompt must produce consistent JSON output
 */
export function buildJobMatchingPrompt(
  resume: ParsedResume,
  jobs: NormalizedJob[]
): string {
  // Safely extract data with defaults
  const skills = (resume.skills || []).slice(0, 15).join(", ") || "Not specified";
  const techStack = resume.techStack
    ? Object.entries(resume.techStack)
        .map(([cat, val]) => `${cat}: ${val}`)
        .join(" | ")
    : "Not specified";
  const projects = (resume.projects || [])
    .slice(0, 3)
    .map((p) => `${p.name}: ${p.description}`)
    .join(" | ");
  const keywords = (resume.keywords || []).slice(0, 10).join(", ") || "Not specified";

  const jobsJSON = jobs
    .map((job) => ({
      jobId: job.job_id,
      title: job.title,
      company: job.company,
      location: job.location,
      description: job.description.substring(0, 500), // Truncate to avoid token overrun
      skills: job.skills.slice(0, 10),
    }))
    .map((j) => JSON.stringify(j))
    .join(",\n");

  return `You are an expert job matching AI. Your task is to evaluate each job against the provided candidate profile.

CANDIDATE PROFILE:
- Seniority Level: ${resume.seniority || "Not specified"}
- Years of Experience: ${resume.experienceYears || 0}
- Current Role: ${resume.currentRole || "Not specified"}
- Location: ${resume.location || "Not specified"} | Remote: ${resume.remote ? "Yes" : "No"}
- Skills: ${skills}
- Tech Stack: ${techStack}
- Projects: ${projects || "Not specified"}
- Keywords/Certifications: ${keywords}
- Education: ${resume.education?.degree || "Not specified"} from ${resume.education?.institution || "Not specified"}

JOBS TO MATCH (max 5):
[
${jobsJSON}
]

SCORING RULES:
For each job, assign:
1. score (0-100):
   - 40% weight: Skill overlap (how many of candidate's skills match job requirements)
   - 30% weight: Tech stack alignment (candidate's tech experience vs job needs)
   - 20% weight: Seniority level fit (intern/junior/mid/senior alignment)
   - 10% weight: Location fit (remote, onsite, hybrid)

2. confidence (0-1):
   - 0.9-1.0: Explicit skill matches + strong alignment + clear description
   - 0.7-0.89: Mostly aligned with minor gaps
   - 0.4-0.69: Partial match or unclear job description
   - <0.4: Very low confidence, poor fit

3. reason (max 50 chars):
   - Brief explanation of the score
   - Highlight main strengths or gaps

IMPORTANT CONSTRAINTS:
1. Be objective and consistent
2. Do NOT favor company brand names
3. Do NOT hallucinate skills candidate doesn't have
4. Focus on actual skill match, not potential
5. Penalize seniority mismatches (intern shouldn't apply to staff roles)
6. Return ONLY valid JSON array, no markdown, no extra text

OUTPUT FORMAT (strict):
[
  {
    "jobId": "string",
    "score": number,
    "confidence": number,
    "reason": "short explanation"
  },
  ...
]`;
}
