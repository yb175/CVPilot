import type { ParsedResume } from "../../../validators/resume.schema.js";
import type { NormalizedJob } from "../../types/parsing.js";

/**
 * =====================================================
 * 🎯 EXPERT-GRADE JOB MATCHING PROMPT (v2)
 * =====================================================
 * 
 * Design Goals:
 * - EXPLICIT scoring formulas (not vague percentages)
 * - FEW-SHOT examples so model learns pattern
 * - STRICT JSON schema validation
 * - FALLBACK scoring for sparse profiles
 * - HIGH confidence scoring (target 95% accuracy)
 */

export function buildJobMatchingPromptV2(
  resume: ParsedResume,
  jobs: NormalizedJob[]
): string {
  const candidateSkills = (resume.skills || []).slice(0, 30);
  const candidateSkillsText = candidateSkills.join(", ") || "NOT_SPECIFIED";
  const techStackText = resume.techStack
    ? Object.entries(resume.techStack)
        .filter(([, val]) => !!val)
        .map(([cat, val]) => `${cat}: ${val}`)
        .join(" | ")
    : "NOT_SPECIFIED";

  const projectText = (resume.projects || [])
    .slice(0, 5)
    .map((p) => `${p.name}: ${p.description}`)
    .join(" | ");

  const jobsPayload = jobs.map((job) => {
    const cleanDescription = cleanJobDescription(job.description);
    const requiredSkills = extractRequiredSkills(cleanDescription, job.skills);
    const preferredSkills = extractPreferredSkills(cleanDescription, requiredSkills);

    return {
      jobId: job.job_id,
      title: job.title,
      company: job.company,
      location: job.location,
      requiredSkills,
      preferredSkills,
      normalizedSkills: job.skills.slice(0, 20),
      requiredExperienceYears: extractRequiredYears(cleanDescription),
      senioritySignals: extractSenioritySignals(job.title, cleanDescription),
      coreDescription: cleanDescription.slice(0, 1800),
    };
  });

  const jobsJSON = JSON.stringify(jobsPayload, null, 2);

  return `SYSTEM ROLE:
You are a strict recruiting evaluator. You must score each job independently using evidence from the provided profile and job data.

OBJECTIVE:
Produce deeply reasoned, high-variance relevance scores. Avoid safe defaults. If two jobs have different required skills, scores and reasons must differ accordingly.

CANDIDATE INPUT:
- Name: ${resume.name || "NOT_SPECIFIED"}
- Seniority: ${resume.seniority || "NOT_SPECIFIED"}
- ExperienceYears: ${resume.experienceYears ?? 0}
- CurrentRole: ${resume.currentRole || "NOT_SPECIFIED"}
- Location: ${resume.location || "NOT_SPECIFIED"}
- Remote: ${resume.remote ? "YES" : "NO"}
- Skills: ${candidateSkillsText}
- TechStack: ${techStackText}
- Projects: ${projectText || "NOT_SPECIFIED"}
- Keywords: ${(resume.keywords || []).slice(0, 20).join(", ") || "NOT_SPECIFIED"}

JOBS INPUT (PREPROCESSED JSON):
${jobsJSON}

MANDATORY INTERNAL REASONING STEPS (DO NOT OUTPUT THESE STEPS):
1. Extract required skills and experience constraints per job.
2. Compare with candidate skills, tech stack, role history, and years.
3. Compute overlap ratio and missing critical skills.
4. Compute rubric sub-scores exactly.
5. Generate one specific reason line referencing concrete matches and concrete gaps.

DETERMINISTIC RUBRIC (TOTAL 100):
1) Skill match (0-50)
- Let required = unique requiredSkills (fallback to normalizedSkills when requiredSkills is empty).
- Let overlap = count of required items present in candidate skills/tech stack (case-insensitive, semantic variants allowed).
- skillScore = round((overlap / max(requiredCount, 1)) * 50).

2) Experience relevance (0-20)
- Compare candidate ExperienceYears with requiredExperienceYears.
- If requiredExperienceYears is null, score by role complexity from description:
  - clearly advanced architecture/ownership: 8-14 unless candidate is senior with >=6 years then 15-18
  - standard IC delivery role: 12-18
  - entry role: 16-20 for <=3 years, 10-16 otherwise
- If requiredExperienceYears exists:
  - candidateYears >= requiredYears: 18-20
  - within 2 years gap: 12-17
  - gap > 2 years: 0-11

3) Role alignment (0-20)
- Infer job seniority from senioritySignals and title.
- Exact level match: 18-20
- One-level mismatch: 12-17
- Two-level mismatch: 5-11
- Major mismatch: 0-4

4) Bonus (projects/tools) (0-10)
- Award for project/tool evidence directly relevant to job stack and domain.
- 0-2: no supporting evidence
- 3-6: partial supporting evidence
- 7-10: multiple direct project/tool matches

TOTAL SCORE RULE:
score = skillScore + experienceScore + roleAlignmentScore + bonusScore
Clamp to integer [0, 100].

CONFIDENCE RULE (0-1):
- Base confidence from evidence quality, not optimism.
- High (0.85-0.98): clear required skills + explicit overlap + coherent description.
- Medium (0.65-0.84): partial requirements and moderate overlap.
- Low (0.40-0.64): sparse requirements or ambiguous profile.
- Minimum allowed confidence is 0.30.

ANTI-LAZINESS CONSTRAINTS:
- Never reuse the exact same reason text for different jobIds.
- Never assign identical confidence to all jobs unless evidence is truly identical.
- Never collapse all scores into a narrow band.
- Each reason must include at least one matched skill/tool and one missing or risk item.
- Forbidden generic reasons: "limited match", "significant gaps", "good fit", "poor fit".

STRICT OUTPUT JSON SCHEMA:
Return ONLY a JSON array. No markdown.
Each item must be:
{
  "jobId": "string",
  "score": number,
  "confidence": number,
  "matchedSkills": string[],
  "missingSkills": string[],
  "reason": string
}

RESPONSE CHECKLIST:
- jobId must exactly match input jobId.
- score integer 0-100.
- confidence float 0.3-1.0.
- matchedSkills and missingSkills must reflect actual comparison.
- reason must be job-specific and concrete.
`;
}

function cleanJobDescription(description: string): string {
  return description
    .replace(/\s+/g, " ")
    .replace(/(equal opportunity employer|apply now|click here|benefits include)[\s\S]*/gi, "")
    .trim();
}

function extractRequiredSkills(description: string, normalizedSkills: string[]): string[] {
  const requiredSectionMatch = description.match(
    /(required|requirements|must have|you have|what you bring)([\s\S]{0,500})/i
  );

  const source = requiredSectionMatch?.[2] || description;
  const tokens = source
    .split(/[\n,.;:()\-\/|]/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && t.length <= 40);

  const merged = new Set<string>([...normalizedSkills.slice(0, 20), ...tokens.slice(0, 40)]);
  return Array.from(merged).slice(0, 25);
}

function extractPreferredSkills(description: string, requiredSkills: string[]): string[] {
  const preferredSectionMatch = description.match(/(nice to have|preferred|bonus|plus)([\s\S]{0,300})/i);
  if (!preferredSectionMatch) return [];

  const requiredLower = new Set(requiredSkills.map((s) => s.toLowerCase()));

  return preferredSectionMatch[2]
    .split(/[\n,.;:()\-\/|]/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && t.length <= 40)
    .filter((t) => !requiredLower.has(t.toLowerCase()))
    .slice(0, 20);
}

function extractRequiredYears(description: string): number | null {
  const match = description.match(/(\d{1,2})\+?\s+years?/i);
  if (!match) return null;
  const years = Number(match[1]);
  return Number.isFinite(years) ? years : null;
}

function extractSenioritySignals(title: string, description: string): string[] {
  const signalPool = ["intern", "junior", "mid", "senior", "lead", "staff", "principal"];
  const text = `${title} ${description}`.toLowerCase();
  return signalPool.filter((token) => text.includes(token));
}
