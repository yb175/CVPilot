/**
 * =====================================
 * 🎯 Resume Parsing Prompt V3 (Lean Chain-of-Thought)
 * =====================================
 *
 * Redesigned for accuracy with structured multi-step reasoning.
 * Single API call with confidence scoring per field.
 * Prioritizes: Work History → Skills → Education → Projects → Keywords
 */

export const RESUME_PARSING_PROMPT = `You are an expert resume parser. Extract structured resume data with HIGH ACCURACY.

=== YOUR TASK ===
Parse the resume below in 5 sequential steps. Return ONLY valid JSON (no markdown/explanation).

=== CRITICAL JSON OUTPUT RULES ===
• START response directly with { character
• END response with } character
• NO markdown code blocks (NO \`\`\`json wrapper)
• NO explanation text before or after JSON
• If you use markdown, the parsing WILL FAIL
• Example of WRONG: \`\`\`json\\n{...}\\n\`\`\`
• Example of RIGHT: {...}

=== STEP 1: IDENTIFY WORK HISTORY ===
Find employment history with dates/durations. Extract:
- Most recent job title → "currentRole"
- Total years worked (sum all positions) → "experienceYears"
- Infer seniority from title + years:
  * "Intern" or "Graduate" = Intern
  * 0-2 years = Junior (even if title is "Senior")
  * 2-5 years = Mid
  * 5+ years = Senior
  * Titles like "Principal", "Lead", "Staff" with any duration = Senior
  * No work history = Intern

=== STEP 2: EXTRACT SKILLS & TECH STACK ===
Find all technical skills (languages, frameworks, tools).
- Normalize duplicates: "React.js", "ReactJS", "react" ALL → "React"
- Tech Stack categories: frontend, backend, database, cloud, devops, other
- If no clear tech stack structure → leave null
- Skip soft skills ("teamwork", "communication")

=== STEP 3: EXTRACT EDUCATION ===
Find degree and institution (university/college name).
Keep separate: degree vs institution
If only one is mentioned, return the other as null.

=== STEP 4: EXTRACT PROJECTS & KEYWORDS ===
Work History → Projects:
- Look for accomplishments in employment descriptions
- Real projects: "Built X", "Created Y", "Developed Z"
- NOT generic responsibilities: "responsible for", "worked on"
Keywords: Certifications ("AWS Certified"), domains ("AI/ML"), methodologies

=== STEP 5: OTHER FIELDS (FAST) ===
- Name: first + last name only (NO location/email)
- Location: city, state, or country (NO tech terms like "AWS")
- Remote: "remote"/"WFH"=true, "on-site"=false, else null

=== OUTPUT SCHEMA (EXACT) ===
{
  "name": "string | null",
  "skills": ["string"] | null,
  "currentRole": "string | null",
  "experienceYears": "number | null",
  "seniority": "Intern | Junior | Mid | Senior | null",
  "location": "string | null",
  "remote": "boolean | null",
  "techStack": {"frontend": "...", "backend": "...", "database": "...", "cloud": "...", "devops": "...", "other": "..."} | null,
  "projects": [{"name": "string", "description": "string"}] | null,
  "keywords": ["string"] | null,
  "education": {"degree": "string | null", "institution": "string | null"},
  "confidence": {"name": 0-100, "skills": 0-100, "currentRole": 0-100, "experienceYears": 0-100, "seniority": 0-100, "location": 0-100, "remote": 0-100, "techStack": 0-100, "projects": 0-100, "keywords": 0-100, "education": 0-100}
}

Confidence meaning:
- 100 = explicitly stated in resume
- 70-99 = clearly inferred from multiple indicators
- 40-69 = reasonable inference with some ambiguity
- 10-39 = weak signal, uncertain
- 0-9 = guessed, very low confidence
- Return 0 if field is null

=== CRITICAL RULES ===
1. Return ONLY JSON (no preamble, no code blocks)
2. Name: NO location/email/title mixing
3. Skills: Technical only, deduplicated, normalized
4. Tech Stack: Use provided categories only
5. Projects: Real accomplishments from work history, name + 1-2 sentence description
6. currentRole: Most recent actual job title
7. experienceYears: Sum of all employment duration in YEARS (number, not string)
8. Seniority: Based on TITLE + YEARS combined, not years alone
9. Confidence: Honest scores (high for explicit, low for inferred)
10. Prefer null over incorrect/guessed data

=== EXAMPLES ===

INPUT:
John Smith, Senior Engineer at Google (2022-2026)
Previously: Mid-level Dev at StartupX (2019-2022)
Skills: JavaScript, React, Node.js, PostgreSQL, Docker, AWS
Led microservices redesign (2024)
BS Computer Science, Stanford

OUTPUT (PARSING RESULT):
{
  "name": "John Smith",
  "skills": ["JavaScript", "React", "Node.js", "PostgreSQL", "Docker", "AWS"],
  "currentRole": "Senior Engineer",
  "experienceYears": 7,
  "seniority": "Senior",
  "location": null,
  "remote": null,
  "techStack": {"frontend": "JavaScript, React", "backend": "Node.js", "database": "PostgreSQL", "cloud": "AWS", "devops": "Docker"},
  "projects": [{"name": "Microservices Redesign", "description": "Led architectural redesign improving system resilience"}],
  "keywords": ["Microservices Architecture"],
  "education": {"degree": "BS Computer Science", "institution": "Stanford"},
  "confidence": {"name": 100, "skills": 100, "currentRole": 100, "experienceYears": 95, "seniority": 100, "location": 0, "remote": 0, "techStack": 90, "projects": 85, "keywords": 70, "education": 95}
}

---

NOW PARSE THIS RESUME:

\${resumeText}

=== FINAL INSTRUCTION ===
Return ONLY the JSON object. No markdown, no code blocks, no wrapping with backticks.
REQUIRED: Start with { and end with }. Nothing else.
INVALID: \`\`\`json....\`\`\`
VALID: {...}`;

/**
 * Repair prompt - used when JSON validation fails
 */
export const RESUME_REPAIR_PROMPT = `Fix this resume JSON to match the schema. Replace broken data with null.
CRITICAL: Return ONLY JSON. No markdown, no code blocks, no backticks.

INVALID JSON:
\${invalidJson}

ERRORS:
\${errors}

REQUIRED SCHEMA:
- name, skills (array), currentRole, experienceYears (number), seniority (Intern/Junior/Mid/Senior/null)
- location, remote (boolean/null), techStack (obj or null), projects (array or null), keywords (array or null)
- education: {degree: string|null, institution: string|null}
- confidence: {field: 0-100, ...}

FIX RULES:
1. "5" (string) → 5 (number)
2. ["item"] should NOT contain objects
3. seniority must be: Intern, Junior, Mid, Senior, or null
4. If broken beyond repair → use null
5. Keep confidence scores honest

Return ONLY valid JSON.`;

