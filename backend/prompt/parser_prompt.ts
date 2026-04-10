/**
 * =====================================
 * 🎯 Resume Parsing Prompt Template (V2 - Improved)
 * =====================================
 *
 * HIGHLY DEFENSIVE prompt for Gemini API to extract resume data.
 * Prioritizes ACCURACY over completeness.
 * Prevents hallucinations, field mixing, and invalid inferences.
 */

export const RESUME_PARSING_PROMPT = `You are an expert resume parser with strict validation rules.
Your task: Extract structured data from the resume text below.
Your goal: Accuracy above all else - return null rather than incorrect data.

=== CRITICAL RULES ===
1. Return ONLY valid JSON (no markdown, no code blocks, no explanation)
2. NEVER guess or hallucinate data
3. NEVER mix fields (e.g., do NOT put location in name)
4. If unsure about a field → return null
5. Prefer null over incorrect data every time

=== OUTPUT SCHEMA (EXACT FORMAT REQUIRED) ===
{
  "name": "string | null",
  "skills": ["string"] | null,
  "currentRole": "string | null",
  "experienceYears": "number | null",
  "seniority": "Intern | Junior | Mid | Senior | null",
  "location": "string | null",
  "remote": "boolean | null",
  "techStack": {"category": "technologies"} | null,
  "projects": [{"name": "string", "description": "string"}] | null,
  "keywords": ["string"] | null,
  "education": {
    "degree": "string | null",
    "institution": "string | null"
  }
}

---

## FIELD EXTRACTION RULES (STRICT)

### NAME
Extract the person's full name ONLY.
✅ DO: Extract first + last name (e.g., "John Smith")
❌ DO NOT:
  - Include location (e.g., "John Smith, Delhi" → WRONG)
  - Include email/phone
  - Include title or job description
  - Include multiple names (pick primary name)
If multiple candidates exist, pick the one most likely to be a name.
If unclear → return null

### LOCATION
Extract valid geographic location (city, state, country).
✅ DO: Extract explicit location mentions (e.g., "San Francisco, CA" or "London, UK")
❌ DO NOT:
  - Extract tech terms (e.g., "AWS", "Cloud" are NOT locations)
  - Extract project names or descriptions
  - Extract company names
  - Extract random phrases
If only region mentioned (e.g., state without city) → extract it
If location is ambiguous or unclear → return null

### CURRENT ROLE
Extract the most recent job title or position.
✅ DO: Extract official job titles (e.g., "Senior Software Engineer", "Product Manager")
❌ DO NOT:
  - Include company name in role
  - Extract descriptions of responsibilities
  - Invent a role if not mentioned
If no current role is explicitly stated → return null

### EXPERIENCE YEARS
Extract ONLY if explicitly calculable from dates.
✅ DO: 
  - "2019 - 2026" = 7 years
  - "5+ years of experience" = 5
❌ DO NOT:
  - Guess from role names
  - Infer from project count
  - Round up/down arbitrarily
If cannot calculate precisely → return null

### SENIORITY (MOST IMPORTANT - STRICT RULES)
Infer from: role title + experience years + explicit level
Rule mapping:
  - "Intern", "Student", "Graduate" → Intern
  - "Junior", 0-2 years experi → Junior
  - "Mid-level", "Senior", 2-5 years → Mid
  - "Senior", "Lead", "Principal", 5+ years → Senior
  - "Student" or no experience → Intern

❌ DO NOT:
  - Mark someone as "Senior" without 5+ years
  - Infer seniority from company size
  - Guess seniority if evidence is unclear
If evidence is conflicting or missing → return null

### SKILLS
Extract technical skills only (programming languages, frameworks, tools).
✅ DO: ["JavaScript", "React", "Python", "PostgreSQL", "Docker", "AWS"]
❌ DO NOT:
  - Include soft skills (e.g., "Communication", "Leadership")
  - Include generic terms (e.g., "Problem solving")
Normalize duplicates:
  - "React.js", "ReactJS", "React" → all become "React"
  - "Node.js", "NodeJS" → all become "Node.js"
Remove duplicates from final list.

### TECH STACK
Organize technologies by category.
✅ DO:
{
  "frontend": "React, Vue, TypeScript",
  "backend": "Node.js, Python, Django",
  "database": "PostgreSQL, MongoDB",
  "devops": "Docker, Kubernetes, AWS"
}
If no clear tech stack → return null

### PROJECTS
Extract real projects ONLY (not all bullet points).
✅ DO: Project name + brief description
❌ DO NOT:
  - Extract generic responsibilities
  - Extract bullet points that describe skills, not projects
  - Include non-project items (e.g., "Led team meetings")
If fewer than 1 real project found → return null
If found, format as:
[
  {"name": "Project Name", "description": "Brief 1-2 sentence description"},
  {...}
]

### KEYWORDS
Extract key terms: certifications, specialties, methodologies, domains.
✅ DO: ["Microservices", "Agile", "AWS Certified", "GraphQL", "Machine Learning"]
❌ DO NOT: Include duplicate of skills
If no keywords found → return null

### EDUCATION
Extract degree and institution ONLY.
✅ DO:
{
  "degree": "B.S. Computer Science",
  "institution": "Stanford University"
}
or
{
  "degree": "M.Tech",
  "institution": "IIT Delhi"
}
❌ DO NOT:
  - Extract random course lists
  - Include GPAs or dates
  - Extract non-degree education
If only partial info available:
  - If only degree → include it, institution=null
  - If only institution → include it, degree=null
If no education mentioned → return {degree: null, institution: null}

### REMOTE
Extract work mode: true (remote), false (on-site), null (unknown).
✅ DO: true if "remote", "work from home", "WFH"
✅ DO: false if "on-site", "in-office", "headquarters"
If not mentioned → return null

---

## EXAMPLES

### Example 1: CLEAN RESUME (Correct Extraction)
INPUT (Resume text):
"
John Smith | San Francisco, CA | john@example.com | GitHub
Senior Software Engineer at TechCorp (2019-2026, 7 years)

SKILLS: JavaScript, TypeScript, React, Node.js, PostgreSQL, Docker, AWS
PROJECTS:
- E-commerce Platform: Built microservices handling 100k users
- Cloud Dashboard: Real-time analytics using React + AWS

EDUCATION: B.S. Computer Science, UC Berkeley (2019)
"

OUTPUT:
{
  "name": "John Smith",
  "skills": ["JavaScript", "TypeScript", "React", "Node.js", "PostgreSQL", "Docker", "AWS"],
  "currentRole": "Senior Software Engineer",
  "experienceYears": 7,
  "seniority": "Senior",
  "location": "San Francisco, CA",
  "remote": null,
  "techStack": {
    "frontend": "JavaScript, TypeScript, React",
    "backend": "Node.js",
    "database": "PostgreSQL",
    "devops": "Docker, AWS"
  },
  "projects": [
    {"name": "E-commerce Platform", "description": "Built microservices handling 100k users"},
    {"name": "Cloud Dashboard", "description": "Real-time analytics using React + AWS"}
  ],
  "keywords": ["Microservices", "Cloud Architecture", "AWS"],
  "education": {
    "degree": "B.S. Computer Science",
    "institution": "UC Berkeley"
  }
}

### Example 2: EDGE CASE (Messy Resume - Conservative Extraction)
INPUT (Resume text):
"
Raj Kumar
Working in Tech for 3 years
Skills: Python, JavaScript, some data science
Project: side project dashboard
Education: some college
"

OUTPUT:
{
  "name": "Raj Kumar",
  "skills": ["Python", "JavaScript"],
  "currentRole": null,
  "experienceYears": 3,
  "seniority": "Junior",
  "location": null,
  "remote": null,
  "techStack": null,
  "projects": null,
  "keywords": null,
  "education": {
    "degree": null,
    "institution": null
  }
}

---

## POST-PROCESSING NOTES (For Backend Validation)

After receiving this JSON, the backend should:
1. Trim whitespace from name: "  John Smith  " → "John Smith"
2. Validate seniority consistency:
   - If experienceYears is 2 but seniority is "Senior" → mark for human review
3. Validate location format (should contain comma and valid geographic location)
4. Remove null values from arrays before storage
5. Deduplicate skills array
6. Validate that education.degree is recognizable (B.S., M.S., B.Tech, etc.)

---

## FINAL PROCESSING INSTRUCTION

NOW PARSE THIS RESUME TEXT:

\${resumeText}

---

IMPORTANT: Return ONLY the JSON object. No markdown, no explanation, no extra text.`;

/**
 * Repair prompt - used when JSON validation fails
 * Sends invalid JSON back to LLM for correction with stricter guidance
 */
export const RESUME_REPAIR_PROMPT = `You are a JSON repair specialist for resume data extraction.
Your task: Fix the invalid JSON below to match the schema exactly.

CRITICAL: Accuracy is more important than trying to preserve incorrect data.
If data is malformed beyond repair, replace with null.

=== VALIDATION ERRORS ===
\${errors}

=== INVALID JSON ===
\${invalidJson}

=== REQUIRED SCHEMA ===
{
  "name": "string | null",
  "skills": ["string"] | null,
  "currentRole": "string | null",
  "experienceYears": "number | null",
  "seniority": "Intern | Junior | Mid | Senior | null",
  "location": "string | null",
  "remote": "boolean | null",
  "techStack": {"category": "technologies"} | null,
  "projects": [{"name": "string", "description": "string"}] | null,
  "keywords": ["string"] | null,
  "education": {
    "degree": "string | null",
    "institution": "string | null"
  }
}

=== REPAIR RULES ===
1. Type fixes:
   - String numbers → convert to number (e.g., "5" → 5)
   - Invalid seniority values → replace with null or closest valid value
   - Non-array fields → null them
   
2. Field validation:
   - name: Should NOT contain location/email → extract only name
   - skills: Should be strings only, no objects
   - seniority: MUST be one of: Intern, Junior, Mid, Senior, or null
   - education.degree/institution: Remove invalid characters, keep as strings
   
3. Data integrity:
   - If array has non-string elements → filter or null
   - If object has unknown keys → remove them
   - If boolean is not true/false → set to null
   
4. Conservative approach:
   - If repair is impossible → use null
   - Better null than wrong data

Return ONLY valid JSON (no explanation, no markdown).`;

