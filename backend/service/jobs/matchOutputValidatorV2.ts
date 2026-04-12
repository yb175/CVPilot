import type { MatchResult } from "../types/parsing.js";
import { logger } from "../../lib/logger.js";

/**
 * =====================================================
 * MATCH RESULT v2 (Extended Schema)
 * =====================================================
 */
export interface MatchResultV2 extends MatchResult {
  matchedSkills: string[];
  missingSkills: string[];
  scoreBreakdown?: {
    skillMatch: number;
    techMatch: number;
    seniorityFit: number;
    locationFit: number;
  };
}

/**
 * Validate and clamp match result from LLM v2
 * Returns null if invalid
 * 
 * CRITICAL: Never accept confidence=0; minimum 0.3
 */
export function validateAndClampMatchResultV2(raw: unknown): MatchResultV2 | null {
  if (!raw || typeof raw !== "object") {
    logger.warn("MATCH_VALIDATION_FAILED_V2", {
      reason: "Not an object",
      rawType: typeof raw,
    });
    return null;
  }

  const obj = raw as Record<string, unknown>;

  // Validate jobId
  if (typeof obj.jobId !== "string" || !obj.jobId) {
    logger.warn("MATCH_VALIDATION_FAILED_V2", { reason: "Missing or invalid jobId" });
    return null;
  }

  // ===== SCORE VALIDATION =====
  let score: number;
  if (typeof obj.score === "number") {
    score = obj.score;
  } else if (typeof obj.score === "string") {
    const parsed = parseFloat(obj.score);
    if (isNaN(parsed)) {
      logger.warn("MATCH_VALIDATION_FAILED_V2", {
        reason: "score not parseable",
        scoreToParse: obj.score,
      });
      return null;
    }
    score = parsed;
  } else {
    logger.warn("MATCH_VALIDATION_FAILED_V2", {
      reason: "score not a number or string",
      scoreType: typeof obj.score,
    });
    return null;
  }

  // Scale normalization (LLM might use 0-1 instead of 0-100)
  if (score > 0 && score <= 1) {
    logger.info("SCORE_SCALE_NORMALIZATION", {
      jobId: obj.jobId,
      original: score,
      normalized: score * 100,
    });
    score = score * 100;
  }

  // Clamp to 0-100
  score = Math.max(0, Math.min(100, Math.round(score)));

  // ===== CONFIDENCE VALIDATION =====
  let confidence: number;
  if (typeof obj.confidence === "number") {
    confidence = obj.confidence;
  } else if (typeof obj.confidence === "string") {
    const parsed = parseFloat(obj.confidence);
    if (isNaN(parsed)) {
      logger.warn("MATCH_VALIDATION_FAILED_V2", {
        reason: "confidence not parseable",
        confidenceToParse: obj.confidence,
      });
      return null;
    }
    confidence = parsed;
  } else {
    logger.warn("MATCH_VALIDATION_FAILED_V2", {
      reason: "confidence not a number or string",
      confidenceType: typeof obj.confidence,
    });
    // Default to 0.5 if missing
    confidence = 0.5;
  }

  // Scale normalization (LLM might use 0-100 instead of 0-1)
  if (confidence > 1 && confidence <= 100) {
    logger.info("CONFIDENCE_SCALE_NORMALIZATION", {
      jobId: obj.jobId,
      original: confidence,
      normalized: confidence / 100,
    });
    confidence = confidence / 100;
  }

  // Clamp and ENFORCE MINIMUM (critical fix)
  confidence = Math.max(0.3, Math.min(1, confidence));

  // ===== MATCHED SKILLS =====
  let matchedSkills: string[] = [];
  if (Array.isArray(obj.matchedSkills)) {
    matchedSkills = (obj.matchedSkills as any[])
      .filter((s) => typeof s === "string" && s.trim().length > 0)
      .map((s) => s.trim())
      .slice(0, 20);
  } else {
    logger.warn("MATCH_VALIDATION_FAILED_V2", {
      reason: "matchedSkills not an array",
      type: typeof obj.matchedSkills,
    });
  }

  // ===== MISSING SKILLS =====
  let missingSkills: string[] = [];
  if (Array.isArray(obj.missingSkills)) {
    missingSkills = (obj.missingSkills as any[])
      .filter((s) => typeof s === "string" && s.trim().length > 0)
      .map((s) => s.trim())
      .slice(0, 20);
  } else {
    logger.warn("MATCH_VALIDATION_FAILED_V2", {
      reason: "missingSkills not an array",
      type: typeof obj.missingSkills,
    });
  }

  // ===== REASON =====
  let reason: string;
  if (typeof obj.reason === "string") {
    reason = obj.reason || "No reason provided";
  } else {
    logger.warn("MATCH_VALIDATION_FAILED_V2", { reason: "reason not a string" });
    return null;
  }

  if (reason.length > 200) {
    reason = reason.substring(0, 200);
  }

  // ===== DIAGNOSTIC LOGGING =====
  if (score === 0 && matchedSkills.length === 0) {
    logger.info("ZERO_SCORE_WITH_NO_MATCHED_SKILLS", {
      jobId: obj.jobId,
      reason,
      missingSkillsCount: missingSkills.length,
    });
  }

  return {
    jobId: obj.jobId,
    score,
    confidence,
    matchedSkills,
    missingSkills,
    reason,
  };
}

/**
 * Validate array of results from LLM v2
 */
export function validateAndClampMatchResultsV2(raw: unknown): MatchResultV2[] {
  if (!Array.isArray(raw)) {
    logger.warn("RESULTS_VALIDATION_FAILED_V2", { reason: "Not an array" });
    return [];
  }

  const results: MatchResultV2[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    const validated = validateAndClampMatchResultV2(item);
    if (validated) {
      results.push(validated);
    } else {
      logger.warn("INDIVIDUAL_RESULT_VALIDATION_FAILED", {
        index: i,
        providedJobId: (item as any)?.jobId,
      });
    }
  }

  return results;
}

export interface MatchBatchQualityIssue {
  code:
    | "ALL_SCORES_ZERO"
    | "LOW_SCORE_VARIANCE"
    | "UNIFORM_CONFIDENCE"
    | "REPEATED_GENERIC_REASON"
    | "LOW_SKILL_SIGNAL";
  message: string;
}

export function auditMatchBatchQuality(results: MatchResultV2[]): {
  isAcceptable: boolean;
  issues: MatchBatchQualityIssue[];
} {
  const issues: MatchBatchQualityIssue[] = [];

  if (results.length === 0) {
    return {
      isAcceptable: false,
      issues: [
        {
          code: "LOW_SKILL_SIGNAL",
          message: "No validated LLM results",
        },
      ],
    };
  }

  const scores = results.map((r) => r.score);
  const confidences = results.map((r) => Number(r.confidence.toFixed(2)));
  const reasons = results.map((r) => normalizeReason(r.reason));

  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const scoreRange = maxScore - minScore;

  if (scores.every((s) => s === 0)) {
    issues.push({
      code: "ALL_SCORES_ZERO",
      message: "All LLM scores are 0, likely model collapse or parsing failure",
    });
  }

  if (results.length >= 3 && scoreRange < 8) {
    issues.push({
      code: "LOW_SCORE_VARIANCE",
      message: `Score spread too narrow (${minScore}-${maxScore})`,
    });
  }

  if (results.length >= 3 && new Set(confidences).size <= 1) {
    issues.push({
      code: "UNIFORM_CONFIDENCE",
      message: "Confidence is identical across jobs",
    });
  }

  const genericReasonCount = reasons.filter(isGenericReason).length;
  if (genericReasonCount >= Math.ceil(results.length * 0.6)) {
    issues.push({
      code: "REPEATED_GENERIC_REASON",
      message: `Generic reasoning detected in ${genericReasonCount}/${results.length} results`,
    });
  }

  const lowSignalCount = results.filter((r) => r.matchedSkills.length === 0).length;
  if (lowSignalCount >= Math.ceil(results.length * 0.8)) {
    issues.push({
      code: "LOW_SKILL_SIGNAL",
      message: `Insufficient matched skill evidence in ${lowSignalCount}/${results.length} results`,
    });
  }

  return {
    isAcceptable: issues.length === 0,
    issues,
  };
}

/**
 * Diagnostic: Check if score seems anomalous
 */
export function isAnomalousScore(result: MatchResultV2): {
  isAnomaly: boolean;
  reason: string;
} {
  // Score=0 with no skills to match
  if (result.score === 0 && result.matchedSkills.length === 0) {
    return {
      isAnomaly: true,
      reason: "Score 0 with zero matched skills (expected if no overlap)",
    };
  }

  // Score=0 but has matched skills (contradiction)
  if (result.score === 0 && result.matchedSkills.length > 0) {
    return {
      isAnomaly: true,
      reason: "Score 0 but has matched skills (formula error)",
    };
  }

  // Very high score but low confidence (suspicious)
  if (result.score > 80 && result.confidence < 0.5) {
    return {
      isAnomaly: true,
      reason: "High score + low confidence (contradictory)",
    };
  }

  // Confidence below minimum threshold
  if (result.confidence < 0.3) {
    return {
      isAnomaly: true,
      reason: "Confidence below 0.3 minimum",
    };
  }

  return {
    isAnomaly: false,
    reason: "Normal result",
  };
}

function normalizeReason(reason: string): string {
  return reason
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isGenericReason(reason: string): boolean {
  const genericPhrases = [
    "limited match significant gaps",
    "limited match",
    "significant gaps",
    "partial match",
    "good fit",
    "poor fit",
  ];

  return genericPhrases.some((phrase) => reason.includes(phrase));
}
