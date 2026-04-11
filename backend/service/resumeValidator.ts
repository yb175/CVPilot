import { validateParsedResume, ParsedResume } from "../validators/resume.schema.js";
import { logParsingEvent, logValidationResult } from "../lib/parseLogger.js";
import { callGeminiForResumeParsing } from "./geminiClient.js";
import { RESUME_REPAIR_PROMPT } from "../prompt/parser_prompt.js";
import { ZodError } from "zod";

/**
 * =====================================
 * ✔️ Resume Validator Service
 * =====================================
 *
 * Validates parsed resume data against schema.
 * Attempts repair via LLM if validation fails.
 */

/**
 * Post-processing sanitization rules
 * Catches edge cases and common issues after LLM parsing
 */
function sanitizeValidatedResume(resume: ParsedResume): ParsedResume {
  // Rule 1: Trim whitespace from name
  if (resume.name) {
    resume.name = resume.name.trim();
    // Rule 1b: If name contains newlines or multiple spaces, clean it
    resume.name = resume.name.replace(/\n/g, " ").replace(/\s+/g, " ");
    
    // Rule 1c: Check for field mixing (name + location)
    // If name contains comma + state/country pattern, it might be mixed
    if (resume.name.includes(",")) {
      const parts = resume.name.split(",");
      if (parts.length > 1 && !resume.location) {
        // Possible mixing detected: first part is likely name
        resume.name = parts[0].trim();
        // Don't set location from name - too risky
      }
    }
  }

  // Rule 2: Deduplicate and normalize skills (expanded list)
  if (resume.skills && Array.isArray(resume.skills)) {
    const skillNormalizations: Record<string, string> = {
      "node.js": "Node.js", "nodejs": "Node.js", "node": "Node.js",
      "react.js": "React", "reactjs": "React", "react": "React",
      "vue.js": "Vue", "vuejs": "Vue", "vue": "Vue",
      "angular.js": "Angular", "angularjs": "Angular", "angular": "Angular",
      "typescript": "TypeScript", "ts": "TypeScript",
      "javascript": "JavaScript", "js": "JavaScript",
      "python": "Python", "py": "Python",
      "java": "Java", "golang": "Go", "rust": "Rust",
      "c++": "C++", "cpp": "C++", "c#": "C#", "csharp": "C#",
      ".net": ".NET", "asp.net": "ASP.NET",
      "postgresql": "PostgreSQL", "postgres": "PostgreSQL",
      "mongodb": "MongoDB", "mongo": "MongoDB",
      "mysql": "MySQL", "mariadb": "MariaDB",
      "sql server": "SQL Server", "mssql": "SQL Server",
      "dynamodb": "DynamoDB", "firestore": "Firestore",
      "redis": "Redis", "memcached": "Memcached",
      "elasticsearch": "Elasticsearch", "elastic": "Elasticsearch",
      "docker": "Docker", "kubernetes": "Kubernetes", "k8s": "Kubernetes",
      "aws": "AWS", "amazon web services": "AWS",
      "gcp": "GCP", "google cloud": "GCP",
      "azure": "Azure", "microsoft azure": "Azure",
      "git": "Git", "github": "GitHub", "gitlab": "GitLab", "bitbucket": "Bitbucket",
      "rest api": "REST API", "graphql": "GraphQL",
      "jenkins": "Jenkins", "circleci": "CircleCI", "github actions": "GitHub Actions",
      "terraform": "Terraform", "ansible": "Ansible",
    };
    
    resume.skills = [...new Set(
      resume.skills.map((skill) => {
        const trimmed = skill.trim();
        const lower = trimmed.toLowerCase();
        return skillNormalizations[lower] || trimmed;
      })
    )];
  }

  // Rule 3: Improved seniority inference with title weighting
  if (resume.seniority || resume.experienceYears || resume.currentRole) {
    const inferredSeniority = inferSeniorityV2(
      resume.currentRole,
      resume.experienceYears,
      resume.seniority
    );
    
    // Only override if we have a stronger confidence inference
    if (inferredSeniority && resume.seniority !== inferredSeniority) {
      logParsingEvent("VALIDATION", "unknown", "info", {
        message: "ℹ️ Seniority adjusted based on title & experience",
        metadata: {
          original: resume.seniority,
          adjusted: inferredSeniority,
          role: resume.currentRole,
          years: resume.experienceYears,
        }
      });
      resume.seniority = inferredSeniority;
    }
  }

  // Rule 4: Validate location doesn't contain tech terms
  if (resume.location) {
    resume.location = resume.location.trim();
    const invalidLocationPatterns = [
      /^(aws|azure|gcp|cloud|devops|docker|kubernetes|terraform|jenkins|ci\/cd)$/i,
      /^[a-z\.\/\+\-]+@[a-z]+\.[a-z]+$/i, // Email address
      /^(https?:\/\/|www\.)/, // URL
    ];
    if (invalidLocationPatterns.some((pattern) => pattern.test(resume.location || ""))) {
      resume.location = null;
    }
  }

  // Rule 5: Remove empty education object
  if (resume.education &&
    !resume.education.degree &&
    !resume.education.institution) {
    resume.education = { degree: null, institution: null };
  }

  // Rule 6: Deduplicate keywords
  if (resume.keywords && Array.isArray(resume.keywords)) {
    resume.keywords = [...new Set(resume.keywords)];
  }

  // Rule 7: Remove projects with empty/invalid data
  if (resume.projects && Array.isArray(resume.projects)) {
    resume.projects = resume.projects.filter(
      (p) => p.name && p.name.trim() && p.description && p.description.trim()
    );
    if (resume.projects.length === 0) {
      resume.projects = null;
    }
  }

  // Rule 8: Ensure experienceYears is non-negative and reasonable
  if (resume.experienceYears !== null) {
    if (resume.experienceYears < 0 || resume.experienceYears > 70) {
      resume.experienceYears = null;
    }
  }

  // Rule 9: Normalize tech stack categories
  if (resume.techStack && typeof resume.techStack === "object") {
    const validCategories = ["frontend", "backend", "database", "cloud", "devops", "other"];
    const normalized: Record<string, string> = {};
    
    for (const [category, techs] of Object.entries(resume.techStack)) {
      // Only keep valid categories
      const catLower = category.toLowerCase();
      if (validCategories.includes(catLower)) {
        // If techs is a string, clean it; if array, join it
        const techString = Array.isArray(techs) ? techs.join(", ") : String(techs);
        if (techString.trim()) {
          normalized[catLower] = techString.trim();
        }
      }
    }
    
    resume.techStack = Object.keys(normalized).length > 0 ? normalized : null;
  }

  // Rule 10: Log low confidence fields if available
  if (resume.confidence && typeof resume.confidence === "object") {
    const lowConfidenceFields = Object.entries(resume.confidence)
      .filter(([_, score]) => typeof score === "number" && score > 0 && score < 40);
    
    if (lowConfidenceFields.length > 0) {
      logParsingEvent("VALIDATION", "unknown", "info", {
        message: "⚠️ Low confidence extraction detected",
        metadata: {
          lowConfidenceFields: lowConfidenceFields.map(([field, score]) => ({field, score})),
        }
      });
    }
  }

  return resume;
}

/**
 * Improved seniority inference V2
 * Considers title keywords + years together for better accuracy
 * 
 * @param currentRole - Job title from resume
 * @param experienceYears - Years of experience
 * @param currentSeniority - Current seniority level (from LLM)
 * @returns Inferred seniority level or null
 */
function inferSeniorityV2(
  currentRole: string | null,
  experienceYears: number | null,
  currentSeniority: string | null
): "Intern" | "Junior" | "Mid" | "Senior" | null {
  if (!currentRole && !experienceYears) {
    return null;
  }

  // Title keyword patterns for seniority levels
  const principalPatterns = /^(principal|staff|distinguished|architect|chief|vp|vice[- ]?president)/i;
  const seniorPatterns = /^(senior|lead|tech[- ]?lead|engineering manager|sr\\.)/i;
  const midPatterns = /^(mid[- ]?level|mid\\.)/i;
  const juniorPatterns = /^(junior|jr\\.?|graduate|trainee)/i;
  const internPatterns = /^(intern|student|apprentice)/i;

  const role = currentRole?.toLowerCase() || "";
  const years = experienceYears || 0;

  // Check title keywords first (highest weight)
  if (principalPatterns.test(role)) {
    return "Senior"; // Map Principal → Senior (enum limitation)
  }
  
  if (seniorPatterns.test(role)) {
    // Title says Senior - trust it, even with fewer years
    // But log if mismatched with experience
    if (years < 3 && years > 0) {
      logParsingEvent("VALIDATION", "unknown", "info", {
        message: "ℹ️ Senior title with <3 years experience",
        metadata: { role: currentRole, years }
      });
    }
    return "Senior";
  }

  if (midPatterns.test(role)) {
    return "Mid";
  }

  if (juniorPatterns.test(role)) {
    return "Junior";
  }

  if (internPatterns.test(role)) {
    return "Intern";
  }

  // No explicit title keywords - infer purely from years
  if (years >= 5) {
    return "Senior";
  } else if (years >= 2) {
    return "Mid";
  } else if (years > 0) {
    return "Junior";
  } else {
    return "Intern";
  }
}

/**
 * Validate and repair resume data
 * - First: attempt direct Zod validation
 * - If fails: send invalid JSON to LLM for repair (1 attempt max)
 * - If still fails: return null
 *
 * @param data - Raw data from LLM response
 * @param resumeId - Resume identifier for logging
 * @returns Valid ParsedResume or null if unfixable
 */
export const validateAndRepairResume = async (
  data: unknown,
  resumeId: string,
  options?: { userId?: string }
): Promise<ParsedResume | null> => {
  logParsingEvent("VALIDATION", resumeId, "start", {
    userId: options?.userId,
    message: "Starting resume validation",
  });

  // Step 1: Direct validation
  try {
    let validated = validateParsedResume(data);
    
    // Step 1b: Post-processing sanitization
    validated = sanitizeValidatedResume(validated);
    
    logValidationResult(resumeId, {
      userId: options?.userId,
      valid: true,
    });
    return validated;
  } catch (error) {
    const zodError = error as ZodError;
    const errorMessages = zodError.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`
    );

    logParsingEvent("VALIDATION", resumeId, "info", {
      userId: options?.userId,
      message: "Direct validation failed, attempting repair...",
      metadata: {
        errors: errorMessages,
      },
    });

    // Step 2: Attempt repair
    const repaired = await attemptRepair(data, resumeId, options?.userId);
    if (repaired) {
      // Apply sanitization to repaired data too
      const sanitized = sanitizeValidatedResume(repaired);
      logValidationResult(resumeId, {
        userId: options?.userId,
        valid: true,
        repairAttempted: true,
        repairSuccessful: true,
      });
      return sanitized;
    }

    // Step 3: Repair failed
    logValidationResult(resumeId, {
      userId: options?.userId,
      valid: false,
      repairAttempted: true,
      repairSuccessful: false,
      errors: errorMessages,
    });

    return null;
  }
};

/**
 * Attempt to repair invalid JSON via LLM
 */
async function attemptRepair(
  data: unknown,
  resumeId: string,
  userId?: string
): Promise<ParsedResume | null> {
  try {
    // Convert data to JSON string for LLM to see what's wrong
    const invalidJson = JSON.stringify(data, null, 2);

    // Try to get Zod errors for context
    let zodErrors = "Invalid JSON structure - unable to match schema";
    try {
      validateParsedResume(data);
    } catch (error) {
      if (error instanceof ZodError) {
        zodErrors = error.issues
          .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
          .join("\n");
      }
    }

    const repairPrompt = RESUME_REPAIR_PROMPT.replace("${invalidJson}", invalidJson).replace(
      "${errors}",
      zodErrors
    );

    logParsingEvent("VALIDATION", resumeId, "info", {
      userId,
      message: "Sending repair request to LLM",
    });

    const repairResponse = await callGeminiForResumeParsing(repairPrompt, resumeId, {
      maxRetries: 0, // No retries on repair to avoid infinite loops
      userId,
    });

    if (!repairResponse.success || !repairResponse.data) {
      logParsingEvent("VALIDATION", resumeId, "info", {
        userId,
        message: "LLM repair attempt failed",
        error: {
          type: "REPAIR_LLM_FAILED",
          message: repairResponse.error || "Unknown error",
        },
      });
      return null;
    }

    // Validate repaired data
    try {
      const validated = validateParsedResume(repairResponse.data);
      logParsingEvent("VALIDATION", resumeId, "success", {
        userId,
        message: "LLM repair successful - data is now valid",
      });
      return validated;
    } catch (error) {
      logParsingEvent("VALIDATION", resumeId, "info", {
        userId,
        message: "Repaired data still invalid",
        error: {
          type: "REPAIR_VALIDATION_FAILED",
          message: error instanceof Error ? error.message : String(error),
        },
      });
      return null;
    }
  } catch (error) {
    logParsingEvent("VALIDATION", resumeId, "failed", {
      userId,
      message: "Repair attempt threw unexpected error",
      error: {
        type: "REPAIR_ERROR",
        message: error instanceof Error ? error.message : String(error),
      },
    });
    return null;
  }
}
