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

  // Rule 2: Deduplicate and normalize skills
  if (resume.skills && Array.isArray(resume.skills)) {
    resume.skills = [...new Set(
      resume.skills.map((skill) =>
        skill
          .trim()
          .replace(/\.js$/i, ".js") // Normalize Node.js, React.js
          .replace(/^node\.js$/i, "Node.js")
          .replace(/^react\.js$/i, "React")
          .replace(/^react$/i, "React")
          .replace(/^typescript$/i, "TypeScript")
          .replace(/^javascript$/i, "JavaScript")
          .replace(/^python$/i, "Python")
          .replace(/^java$/i, "Java")
      )
    )];
  }

  // Rule 3: Validate seniority consistency
  if (resume.seniority && resume.experienceYears) {
    const years = resume.experienceYears;
    const seniority = resume.seniority;
    
    // If inconsistent, mark for review but keep LLM's judgment
    if (seniority === "Senior" && years < 5) {
      // Keep as-is but log concern
      logParsingEvent("VALIDATION", "unknown", "info", {
        message: "⚠️ Seniority-experience mismatch: Senior with <5 years",
        metadata: { years, seniority }
      });
    }
    
    if (seniority === "Intern" && years > 2) {
      // Likely wrong - should be at least Junior
      logParsingEvent("VALIDATION", "unknown", "info", {
        message: "⚠️ Seniority-experience mismatch: Intern with 2+ years",
        metadata: { years, seniority }
      });
    }
  }

  // Rule 4: Validate location doesn't contain tech terms
  if (resume.location) {
    resume.location = resume.location.trim();
    const invalidLocationPatterns = [
      /^(aws|azure|gcp|cloud|devops|docker|kubernetes)$/i,
      /^[a-z\.\+]+$/i, // Looks like a domain name or email
    ];
    if (invalidLocationPatterns.some((pattern) => pattern.test(resume.location || ""))) {
      resume.location = null;
    }
  }

  // Rule 5: Remove empty education object
  if (resume.education &&
    !resume.education.degree &&
    !resume.education.institution) {
    resume.education = null;
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

  // Rule 8: Ensure experienceYears is non-negative
  if (resume.experienceYears !== null && resume.experienceYears < 0) {
    resume.experienceYears = null;
  }

  return resume;
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
