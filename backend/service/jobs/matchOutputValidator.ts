import type { MatchResult } from "../types/parsing.js";
import { logger } from "../../lib/logger.js";

/**
 * Validate and clamp match result from LLM
 * Returns null if invalid (should trigger retry)
 */
export function validateAndClampMatchResult(raw: unknown): MatchResult | null {
  if (!raw || typeof raw !== "object") {
    logger.warn("MATCH_VALIDATION_FAILED", {
      reason: "Not an object",
      rawType: typeof raw,
    });
    return null;
  }

  const obj = raw as Record<string, unknown>;

  // Validate jobId
  if (typeof obj.jobId !== "string" || !obj.jobId) {
    logger.warn("MATCH_VALIDATION_FAILED", { reason: "Missing or invalid jobId" });
    return null;
  }

  // Validate and clamp score (0-100)
  let score: number;
  if (typeof obj.score === "number") {
    score = obj.score;
  } else if (typeof obj.score === "string") {
    const parsed = parseFloat(obj.score);
    if (isNaN(parsed)) {
      logger.warn("MATCH_VALIDATION_FAILED", {
        reason: "score not parseable",
        scoreToParse: obj.score,
      });
      return null;
    }
    score = parsed;
  } else {
    logger.warn("MATCH_VALIDATION_FAILED", {
      reason: "score not a number or string",
      scoreType: typeof obj.score,
    });
    return null;
  }

  score = Math.max(0, Math.min(100, score));

  // Some model responses use 0-1 scale for score despite prompt asking 0-100.
  // Promote fractional scores to percentage scale.
  if (score > 0 && score <= 1) {
    score = score * 100;
  }

  // Validate and clamp confidence (0-1)
  let confidence: number;
  if (typeof obj.confidence === "number") {
    confidence = obj.confidence;
  } else if (typeof obj.confidence === "string") {
    const parsed = parseFloat(obj.confidence);
    if (isNaN(parsed)) {
      logger.warn("MATCH_VALIDATION_FAILED", {
        reason: "confidence not parseable",
        confidenceToParse: obj.confidence,
      });
      return null;
    }
    confidence = parsed;
  } else {
    logger.warn("MATCH_VALIDATION_FAILED", {
      reason: "confidence not a number or string",
      confidenceType: typeof obj.confidence,
    });
    // Default to 0.5 if missing (not strict error)
    confidence = 0.5;
  }

  // Some model responses use 0-100 confidence scale; normalize to 0-1.
  if (confidence > 1 && confidence <= 100) {
    confidence = confidence / 100;
  }

  confidence = Math.max(0, Math.min(1, confidence));

  // Validate reason
  let reason: string;
  if (typeof obj.reason === "string") {
    reason = obj.reason || "No reason provided";
  } else {
    logger.warn("MATCH_VALIDATION_FAILED", { reason: "reason not a string" });
    return null;
  }

  // Truncate reason if too long
  if (reason.length > 200) {
    reason = reason.substring(0, 200);
  }

  return {
    jobId: obj.jobId,
    score,
    confidence,
    reason,
  };
}

/**
 * Validate array of results from LLM
 */
export function validateAndClampMatchResults(raw: unknown): MatchResult[] {
  if (!Array.isArray(raw)) {
    logger.warn("RESULTS_VALIDATION_FAILED", { reason: "Not an array" });
    return [];
  }

  const results: MatchResult[] = [];
  for (const item of raw) {
    const validated = validateAndClampMatchResult(item);
    if (validated) {
      results.push(validated);
    }
  }

  return results;
}
