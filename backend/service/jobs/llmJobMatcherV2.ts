import type { MatchResult } from "../types/parsing.js";
import type { ParsedResume } from "../../validators/resume.schema.js";
import { callGemini } from "../geminiClient.js";
import {
  validateAndClampMatchResultsV2,
  isAnomalousScore,
  auditMatchBatchQuality,
} from "./matchOutputValidatorV2.js";
import { processResumeForLLM, calculateProfileCompleteness, isProfileTooSparse } from "./resumeProfilePreprocessor.js";
import { logger } from "../../lib/logger.js";
import { buildJobMatchingPromptV2 } from "./prompts/jobMatchingPromptV2.js";

const LLM_TIMEOUT_MS = 40000; // Increased from 30s for longer response
const MAX_JOBS_PER_CALL = 5;
const MAX_RETRIES = 1;

/**
 * =====================================================
 * LLM JOB MATCHER v2 (Improved)
 * =====================================================
 * 
 * Improvements:
 * - Uses V2 prompt with explicit scoring formulas + few-shot examples
 * - Preprocesses resume to normalize skills and validate data quality
 * - Detects and reports anomalous scores
 * - Fallback to regex if profile too sparse
 * - Enhanced logging for root cause analysis
 */

export async function matchJobsWithLLMV2(
  resume: ParsedResume,
  jobs: any[],
  userId: number
): Promise<MatchResult[]> {
  const startTime = Date.now();

  logger.info("LLM_JOB_MATCHING_START_V2", {
    userId,
    jobCount: jobs.length,
    batchCount: Math.ceil(jobs.length / MAX_JOBS_PER_CALL),
  });

  // ===== STEP 1: Preprocess resume =====
  const processedResume = processResumeForLLM(resume);
  const profileCompleteness = calculateProfileCompleteness(processedResume);

  logger.info("RESUME_PROFILE_ANALYSIS", {
    userId,
    dataQuality: processedResume.dataQuality,
    profileCompleteness: profileCompleteness.toFixed(2),
    skillsCount: processedResume.skills.length,
    profileToeSparse: isProfileTooSparse(processedResume),
  });

  // ===== STEP 2: Early exit if profile too sparse =====
  if (isProfileTooSparse(processedResume)) {
    logger.warn("PROFILE_TOO_SPARSE_FOR_LLM_MATCHING", {
      userId,
      completeness: profileCompleteness,
      recommendation: "Fall back to regex matching",
    });

    // Return empty array; caller will use regex fallback
    return [];
  }

  // ===== STEP 3: Match jobs in batches =====
  const results: MatchResult[] = [];
  const jobBatches = createBatches(jobs, MAX_JOBS_PER_CALL);

  for (let batchIndex = 0; batchIndex < jobBatches.length; batchIndex++) {
    const batch = jobBatches[batchIndex];

    try {
      const batchResults = await matchJobBatchV2(
        processedResume,
        batch,
        userId,
        batchIndex
      );
      results.push(...batchResults);
    } catch (error) {
      logger.error("LLM_BATCH_MATCHING_FAILED_V2", {
        userId,
        batchIndex,
        jobCount: batch.length,
        error: error instanceof Error ? error.message : String(error),
      });
      // Continue with next batch
    }
  }

  const duration = Date.now() - startTime;

  logger.info("LLM_JOB_MATCHING_COMPLETE_V2", {
    userId,
    totalJobs: jobs.length,
    matchedJobs: results.length,
    duration,
    averageTimePerJob: Math.round(duration / jobs.length),
  });

  return results;
}

/**
 * Match a single batch of jobs
 */
async function matchJobBatchV2(
  processedResume: any,
  jobs: any[],
  userId: number,
  batchIndex: number
): Promise<MatchResult[]> {
  const batchStartTime = Date.now();

  // Build V2 prompt with processed resume
  const basePrompt = buildJobMatchingPromptV2(processedResume as ParsedResume, jobs);

  let retries = 0;
  let lastError: Error | null = null;

  while (retries <= MAX_RETRIES) {
    try {
      const prompt = appendRetryFeedback(basePrompt, retries, lastError?.message);
      const response = await callGeminiWithTimeout(prompt, LLM_TIMEOUT_MS);

      const duration = Date.now() - batchStartTime;

      logger.info("LLM_CALL_SUCCESS_V2", {
        userId,
        batchIndex,
        jobCount: jobs.length,
        duration,
        retry: retries,
        responseChars: response.length,
      });

      // ===== Parse JSON response =====
      let parsed: any;
      try {
        // Clean response (strip markdown if present)
        let jsonText = response.trim();
        const jsonCodeBlockMatch = jsonText.match(/^```(?:json)?\n?([\s\S]*)\n?```$/);
        if (jsonCodeBlockMatch) {
          jsonText = jsonCodeBlockMatch[1].trim();
        }
        parsed = JSON.parse(jsonText);
      } catch (parseErr) {
        logger.error("LLM_JSON_PARSE_FAILED_V2", {
          userId,
          batchIndex,
          error: parseErr instanceof Error ? parseErr.message : String(parseErr),
          responsePreview: response.substring(0, 200),
        });
        throw new Error("Failed to parse LLM JSON response");
      }

      if (!Array.isArray(parsed)) {
        throw new Error(
          `LLM response is not an array; got ${typeof parsed}`
        );
      }

      // ===== Validate each result =====
      const validated = validateAndClampMatchResultsV2(parsed);

      if (validated.length === 0) {
        throw new Error("All results failed validation (empty response)");
      }

      const quality = auditMatchBatchQuality(validated);
      if (!quality.isAcceptable) {
        logger.warn("LLM_BATCH_QUALITY_REJECTED_V2", {
          userId,
          batchIndex,
          issues: quality.issues,
          sampleReasons: validated.slice(0, 3).map((r) => r.reason),
          scoreSpread: {
            min: Math.min(...validated.map((r) => r.score)),
            max: Math.max(...validated.map((r) => r.score)),
          },
        });

        throw new Error(
          `Rejected low-quality LLM batch output: ${quality.issues.map((i) => i.code).join(",")}`
        );
      }

      // ===== Diagnostic: Check for anomalies =====
      for (const result of validated) {
        const anomaly = isAnomalousScore(result);
        if (anomaly.isAnomaly) {
          logger.warn("ANOMALOUS_SCORE_DETECTED_V2", {
            jobId: result.jobId,
            score: result.score,
            confidence: result.confidence,
            matchedSkillsCount: result.matchedSkills?.length || 0,
            anomalyReason: anomaly.reason,
          });
        }
      }

      return validated.map((result) => ({
        ...result,
        source: "llm" as const,
      }));
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      logger.warn("LLM_CALL_RETRY_V2", {
        userId,
        batchIndex,
        jobCount: jobs.length,
        retryNumber: retries,
        error: lastError.message,
      });

      retries++;

      if (retries <= MAX_RETRIES) {
        // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, 500 * retries));
      }
    }
  }

  // All retries exhausted
  logger.error("LLM_BATCH_MATCHING_FAILED_FINAL_V2", {
    userId,
    batchIndex,
    jobCount: jobs.length,
    error: lastError?.message,
  });

  throw lastError || new Error("LLM matching failed after all retries");
}

function appendRetryFeedback(basePrompt: string, retry: number, lastError?: string): string {
  if (retry <= 0) {
    return basePrompt;
  }

  return `${basePrompt}\n\nRETRY FEEDBACK:\nYour previous response was rejected for low quality: ${lastError || "unknown"}.\nRegenerate with wider score distribution when evidence differs, non-generic reasons per jobId, and explicit matched/missing skills.`;
}

/**
 * Call Gemini with timeout
 */
async function callGeminiWithTimeout(
  prompt: string,
  timeoutMs: number
): Promise<string> {
  return Promise.race([
    callGemini(prompt),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("LLM_TIMEOUT")), timeoutMs)
    ),
  ]);
}

/**
 * Batch array into chunks
 */
function createBatches<T>(arr: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < arr.length; i += batchSize) {
    batches.push(arr.slice(i, i + batchSize));
  }
  return batches;
}

export { MatchResult };
