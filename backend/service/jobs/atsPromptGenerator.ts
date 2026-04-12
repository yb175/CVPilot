import type { NormalizedJob } from "../types/parsing.js";
import type { ParsedResume } from "../../validators/resume.schema.js";
import { buildATSOptimizationPrompt } from "./prompts/atsOptimizationPrompt.js";
import { callGeminiForATSOptimization } from "../geminiClient.js";
import { logger } from "../../lib/logger.js";

const ATS_TIMEOUT_MS = 20000; // 20 seconds (faster than matching)
const ATS_MAX_RETRIES = 1;

/**
 * Generate personalized ATS optimization prompt using Gemini LLM
 * Returns multi-section formatted text ready for copy-paste
 */
export async function generateATSPrompt(
  resume: ParsedResume,
  job: NormalizedJob
): Promise<string> {
  const startTime = Date.now();

  logger.info("ATS_PROMPT_GENERATION_START", {
    jobId: job.job_id,
    jobTitle: job.title,
    candidateName: resume.name,
  });

  try {
    const prompt = buildATSOptimizationPrompt(resume, job);
    const atsGuide = await callGeminiForATSOptimization(prompt, ATS_TIMEOUT_MS);

    const duration = Date.now() - startTime;

    logger.info("ATS_PROMPT_GENERATION_SUCCESS", {
      jobId: job.job_id,
      duration,
      outputLength: atsGuide.length,
    });

    return atsGuide;
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error("ATS_PROMPT_GENERATION_FAILED", {
      jobId: job.job_id,
      duration,
      error: error instanceof Error ? error.message : String(error),
    });

    // Return fallback template when LLM fails
    return buildATSFallbackTemplate(resume, job);
  }
}

/**
 * Fallback template when LLM generation fails
 * Returns a basic but usable template
 */
function buildATSFallbackTemplate(resume: ParsedResume, job: NormalizedJob): string {
  return `ATS OPTIMIZATION GUIDE
${job.title} @ ${job.company}

⚠️ This is a generated template (LLM unavailable). For better results, use ChatGPT/Claude.

**YOUR PROFILE:**
- Experience: ${resume.experienceYears || 0} years (${resume.seniority || "Professional"})
- Top Skills: ${(resume.skills || []).slice(0, 5).join(", ")}
- Location: ${resume.location || "Not specified"} | Remote: ${resume.remote ? "Yes" : "No"}

**JOB REQUIREMENTS:**
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}

**QUICK ATS TIPS:**
1. Add key job skills naturally to your resume
2. Match job keywords (from description) to your experience
3. Use standard formatting: no tables, no graphics, single column
4. Highlight relevant projects that show required skills
5. Use simple fonts (Arial, Calibri, Times New Roman only)

**RESUME CHECKLIST:**
✓ Skills section includes: JavaScript, React, Node.js
✓ Projects section highlights relevant work
✓ No graphics, special formatting, or tables
✓ Standard structure: Contact → Summary → Experience → Skills → Projects → Education
✓ PDF or DOCX format

**NEXT STEPS:**
Paste this template and your resume to ChatGPT for detailed optimization advice.`;
}
