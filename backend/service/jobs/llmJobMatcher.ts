import type { MatchResult, MatchSource, NormalizedJob } from "../types/parsing.js";
import type { ParsedResume } from "../../validators/resume.schema.js";
import { callGemini } from "../geminiClient.js";
import { validateAndClampMatchResult } from "./matchOutputValidator.js";
import { logger } from "../../lib/logger.js";
import { buildJobMatchingPrompt } from "./prompts/jobMatchingPrompt.js";

const LLM_TIMEOUT_MS = 30000; // 30 seconds
const MAX_JOBS_PER_CALL = 5;
const MAX_RETRIES = 1;

/**
 * Match jobs using Gemini LLM
 * Batches jobs to avoid token overrun
 * Returns array of MatchResult with score, confidence, reason
 */
export async function matchJobsWithLLM(
  resume: ParsedResume,
  jobs: NormalizedJob[],
  userId: number
): Promise<MatchResult[]> {
  const startTime = Date.now();

  logger.info("LLM_JOB_MATCHING_START", {
    userId,
    jobCount: jobs.length,
    batchCount: Math.ceil(jobs.length / MAX_JOBS_PER_CALL),
  });

  const results: MatchResult[] = [];
  const jobBatches = createBatches(jobs, MAX_JOBS_PER_CALL);

  for (let batchIndex = 0; batchIndex < jobBatches.length; batchIndex++) {
    const batch = jobBatches[batchIndex];

    try {
      const batchResults = await matchJobBatch(resume, batch, userId, batchIndex);
      results.push(...batchResults);
    } catch (error) {
      logger.error("LLM_BATCH_MATCHING_FAILED", {
        userId,
        batchIndex,
        jobCount: batch.length,
        error: error instanceof Error ? error.message : String(error),
      });
      // Continue with next batch even if one fails
    }
  }

  const duration = Date.now() - startTime;

  logger.info("LLM_JOB_MATCHING_COMPLETE", {
    userId,
    totalJobs: jobs.length,
    matchedJobs: results.length,
    duration,
    averageTimePerJob: Math.round(duration / jobs.length),
  });

  return results;
}

/**
 * Match a single batch of jobs (max 5)
 */
async function matchJobBatch(
  resume: ParsedResume,
  jobs: NormalizedJob[],
  userId: number,
  batchIndex: number
): Promise<MatchResult[]> {
  const batchStartTime = Date.now();

  // Build prompt
  const prompt = buildJobMatchingPrompt(resume, jobs);

  let retries = 0;
  let lastError: Error | null = null;

  while (retries <= MAX_RETRIES) {
    try {
      const response = await callGeminiWithTimeout(prompt, LLM_TIMEOUT_MS);

      logger.info("LLM_CALL_SUCCESS", {
        userId,
        batchIndex,
        jobCount: jobs.length,
        duration: Date.now() - batchStartTime,
        retry: retries,
      });

      // Parse JSON response
      const parsed = JSON.parse(response);

      if (!Array.isArray(parsed)) {
        throw new Error("LLM response is not an array");
      }

      // Validate and clamp each result
      const validated: MatchResult[] = [];
      for (const item of parsed) {
        const result = validateAndClampMatchResult(item);
        if (result) {
          result.source = "llm";
          validated.push(result);
        }
      }

      if (validated.length === 0) {
        throw new Error("All results failed validation");
      }

      return validated;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      logger.warn("LLM_CALL_RETRY", {
        userId,
        batchIndex,
        jobCount: jobs.length,
        retryNumber: retries,
        error: lastError.message,
      });

      retries++;

      if (retries <= MAX_RETRIES) {
        // Wait before retry (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, 500 * retries));
      }
    }
  }

  // All retries exhausted
  throw lastError || new Error("LLM matching failed after all retries");
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
 * Batch array into chunks of specified size
 */
function createBatches<T>(arr: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < arr.length; i += batchSize) {
    batches.push(arr.slice(i, i + batchSize));
  }
  return batches;
}

export { NormalizedJob };
