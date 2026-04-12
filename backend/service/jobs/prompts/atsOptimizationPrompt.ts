import type { ParsedResume } from "../../../validators/resume.schema.js";
import type { NormalizedJob } from "../../types/parsing.js";

/**
 * Build prompt for ATS optimization guide generation
 * LLM generates personalized tips for resume and cover letter
 */
export function buildATSOptimizationPrompt(
  resume: ParsedResume,
  job: NormalizedJob
): string {
  const skills = (resume.skills || []).slice(0, 10).join(", ") || "Not provided";
  const projects = (resume.projects || [])
    .slice(0, 3)
    .map((p) => `${p.name}: ${p.description}`)
    .join(" | ");
  const techStack = resume.techStack
    ? Object.entries(resume.techStack)
        .map(([cat, val]) => `${cat}: ${val}`)
        .join("; ")
    : "Not specified";

  return `You are an expert ATS consultant and resume optimizer.

CANDIDATE PROFILE:
- Name: ${resume.name || "Candidate"}
- Seniority: ${resume.seniority || "Professional"}
- Experience: ${resume.experienceYears || 0} years
- Current Role: ${resume.currentRole || "Not specified"}
- Location: ${resume.location || "Not specified"} (Remote: ${resume.remote ? "Yes" : "No"})
- Top Skills: ${skills}
- Tech Stack: ${techStack}
- Top Projects: ${projects || "Not provided"}
- Keywords/Certs: ${(resume.keywords || []).slice(0, 5).join(", ") || "Not provided"}

JOB OPPORTUNITY:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Description:
${job.description.substring(0, 800)}

TASK:
Create a personalized ATS optimization guide with these sections:

1. **PROFILE ANALYSIS** (2-3 sentences)
   - How candidate aligns with job
   - Seniority match assessment
   - Location fit

2. **SKILL MATCH BREAKDOWN** (2-3 bullets)
   - Which of candidate's skills match job requirements (be specific)
   - Any critical missing skills (but learnable)

3. **RESUME OPTIMIZATION TIPS** (4-5 bullets)
   - Specific keywords from job posting to include naturally
   - How to position projects to match job needs
   - ATS-friendly formatting (no tables, single column, standard fonts)
   - Which experience to emphasize

4. **COVER LETTER TALKING POINTS** (3 specific suggestions)
   - Concrete connections between candidate background and job
   - Use actual job keywords, not generic phrases
   - Avoid common clichés

5. **ATS-FRIENDLY FORMATTING CHECKLIST** (4-5 items)
   - What to do (bullet points, standard fonts, etc.)
   - What to avoid (tables, graphics, special formatting)
   - Keywords to include

IMPORTANT:
- Keep it authentic (only use real skills/experience)
- Be hyper-specific to THIS job and candidate
- Actionable advice only
- Use candidate's exact skills as ground truth
- Total output: 300-400 words
- Format with markdown headers (**Header**) and bullets (- Item)
- Make it ready for copy-paste`;
}
