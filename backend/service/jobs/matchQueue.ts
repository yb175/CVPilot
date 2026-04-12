import { randomUUID } from "crypto";
import type { MatchResult, NormalizedJob } from "../types/parsing.js";
import type { ParsedResume } from "../../validators/resume.schema.js";
import { logger } from "../../lib/logger.js";
import prisma from "../../lib/prisma.js";
import * as llmMatcherV2 from "./llmJobMatcherV2.js";
import * as regexMatcher from "./regexJobMatcher.js";
import * as jobMatchService from "./jobMatch.service.js";
import * as cache from "./matchCache.js";

// ===== Error Sanitization =====
/**
 * Sanitize internal error messages for client exposure
 * Hides Prisma/LLM/stack details, returns generic safe message or specific known error
 */
function sanitizeErrorMessage(rawError: string): string {
  // Map known internal errors to safe client messages
  if (
    rawError.includes("PrismaClientKnownRequestError") ||
    rawError.includes("Prisma") ||
    rawError.includes("SQL")
  ) {
    return "Database error occurred during processing";
  }
  if (rawError.includes("LLM_TIMEOUT") || rawError.includes("timed out")) {
    return "Processing took too long, please try again";
  }
  if (rawError.includes("API") || rawError.includes("api")) {
    return "External service temporarily unavailable";
  }
  if (rawError.includes("timeout")) {
    return "Processing timeout exceeded";
  }
  // Generic fallback for unknown errors
  if (rawError.length > 100 || rawError.includes("at ") || rawError.includes("stack")) {
    return "An internal error occurred during processing";
  }
  // Safe messages can pass through (e.g., "User not found or missing clerkId" is already generic)
  return rawError;
}
interface QueueItem {
  queueId: string;
  userId: number;
  jobs: NormalizedJob[];
  status: "queued" | "processing" | "completed" | "failed";
  results?: MatchResult[];
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

/**
 * In-memory queue for async job matching
 */
class MatchQueue {
  private queue: Map<string, QueueItem> = new Map();
  private processing = false;
  private maxQueueSize = 1000;

  /**
   * Enqueue a new matching job
   */
  enqueue(userId: number, jobs: NormalizedJob[]): string {
    const queueId = randomUUID();

    // Prevent unbounded queue growth
    if (this.queue.size >= this.maxQueueSize) {
      throw new Error("Queue is full");
    }

    const item: QueueItem = {
      queueId,
      userId,
      jobs,
      status: "queued",
      createdAt: new Date(),
    };

    this.queue.set(queueId, item);

    logger.info("MATCH_QUEUED", {
      queueId,
      userId,
      jobCount: jobs.length,
    });

    // Non-blocking: start processing if not already running
    if (!this.processing) {
      setImmediate(() => this.processQueue().catch(() => {})); // Fire and forget
    }

    return queueId;
  }

  /**
   * Get queue item status
   */
  getStatus(queueId: string): QueueItem | null {
    return this.queue.get(queueId) || null;
  }

  /**
   * Update queue item with results
   */
  setResults(queueId: string, results: MatchResult[]): void {
    const item = this.queue.get(queueId);
    if (item) {
      item.status = "completed";
      item.results = results;
      item.completedAt = new Date();

      logger.info("MATCH_COMPLETED", {
        queueId,
        jobCount: results.length,
        duration: item.completedAt.getTime() - item.createdAt.getTime(),
      });
    }
  }

  /**
   * Mark queue item as failed
   * Logs full error internally but stores sanitized message for client
   */
  setError(queueId: string, error: string, internalDetails?: Record<string, unknown>): void {
    const item = this.queue.get(queueId);
    if (item) {
      item.status = "failed";
      // Sanitize error message before storing (client-facing)
      item.error = sanitizeErrorMessage(error);
      item.completedAt = new Date();

      // Log full error details internally for debugging
      logger.error("MATCH_FAILED", {
        queueId,
        sanitizedError: item.error,
        rawError: error,
        ...internalDetails,
        duration: item.completedAt.getTime() - item.createdAt.getTime(),
      });
    }
  }

  /**
   * Process queue items (background worker)
   * Fetches resume, runs LLM + regex fallback, persists results
   */
  async processQueue(): Promise<void> {
    if (this.processing) return;

    this.processing = true;

    try {
      for (const [queueId, item] of this.queue.entries()) {
        if (item.status === "queued") {
          try {
            item.status = "processing";

            logger.info("MATCH_PROCESSING", {
              queueId,
              userId: item.userId,
              jobCount: item.jobs.length,
            });

            // Fetch user's resume
            const user = await prisma.user.findUnique({
              where: { id: item.userId },
            });

            if (!user?.clerkId) {
              throw new Error("User not found or missing clerkId");
            }

            const resume = await prisma.resume.findFirst({
              where: { userId: user.clerkId },
            });

            if (!resume?.parsedData) {
              throw new Error("Resume not found or not yet parsed");
            }

            // Step 1: Run LLM matcher (v2)
            const llmResults = await llmMatcherV2.matchJobsWithLLMV2(
              resume.parsedData as ParsedResume,
              item.jobs,
              item.userId
            );

            // Step 2: Merge with regex fallback for missing jobs
            const finalResults = await mergeWithConditionalRegexFallback(
              llmResults,
              resume.parsedData as ParsedResume,
              item.jobs,
              item.userId
            );

            // Step 3: Validate complete coverage before persisting
            const requestedJobIds = new Set(item.jobs.map((j) => j.job_id));
            const matchedJobIds = new Set(finalResults.map((r) => r.jobId));
            const missingJobs = Array.from(requestedJobIds).filter(
              (jobId) => !matchedJobIds.has(jobId)
            );

            if (missingJobs.length > 0) {
              const errorMsg = `Incomplete match results: ${missingJobs.length} of ${item.jobs.length} jobs unmatched`;
              logger.warn("QUEUE_INCOMPLETE_RESULTS", {
                queueId,
                userId: item.userId,
                requestedCount: item.jobs.length,
                matchedCount: finalResults.length,
                missingCount: missingJobs.length,
              });
              this.setError(queueId, "Processing could not complete for all jobs", {
                missingJobCount: missingJobs.length,
              });
              continue;
            }

            // Step 4: Persist to database
            await jobMatchService.persistMatchResults(item.userId, finalResults);

            // Step 5: Cache results
            for (const result of finalResults) {
              cache.setInCache(item.userId, result.jobId, result);
            }

            // Step 6: Mark as completed
            this.setResults(queueId, finalResults);

            logger.info("QUEUE_ITEM_PROCESSED", {
              queueId,
              userId: item.userId,
              resultsCount: finalResults.length,
            });
          } catch (error) {
            const errorMsg =
              error instanceof Error ? error.message : String(error);

            logger.error("QUEUE_ITEM_PROCESSING_FAILED", {
              queueId,
              userId: item.userId,
              error: errorMsg,
              errorType: error instanceof Error ? error.constructor.name : typeof error,
            });

            this.setError(queueId, errorMsg, {
              errorType: error instanceof Error ? error.constructor.name : typeof error,
            });
          }
        }
      }
    } catch (error) {
      logger.error("QUEUE_PROCESSING_ERROR", {
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.processing = false;
    }
  }

  /**
   * Clean up old completed items (older than 1 hour)
   */
  cleanup(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    let removed = 0;

    for (const [queueId, item] of this.queue.entries()) {
      if (
        item.completedAt &&
        item.completedAt.getTime() < oneHourAgo
      ) {
        this.queue.delete(queueId);
        removed++;
      }
    }

    if (removed > 0) {
      logger.info("QUEUE_CLEANUP", { itemsRemoved: removed });
    }
  }

  /**
   * Get queue stats
   */
  getStats() {
    let queued = 0;
    let processing = 0;
    let completed = 0;
    let failed = 0;

    for (const item of this.queue.values()) {
      if (item.status === "queued") queued++;
      else if (item.status === "processing") processing++;
      else if (item.status === "completed") completed++;
      else if (item.status === "failed") failed++;
    }

    return {
      size: this.queue.size,
      queued,
      processing,
      completed,
      failed,
    };
  }
}

// Singleton instance
const matchQueue = new MatchQueue();

// ===== Helper: Merge LLM + Regex Fallback =====
/**
 * Compare LLM and Regex results, fallback for missing jobs
 * Filters LLM results to only include requested job IDs (prevents hallucinated jobIds)
 */
async function mergeWithConditionalRegexFallback(
  llmResults: MatchResult[],
  resume: ParsedResume,
  jobs: NormalizedJob[],
  userId: number
): Promise<MatchResult[]> {
  // Build set of requested job IDs for validation
  const requestedJobIds = new Set(jobs.map((j) => j.job_id));

  // Filter LLM results: valid scores AND requested job IDs only (prevent hallucinated IDs)
  const llmByJob = new Map<string, MatchResult>(
    llmResults
      .filter(
        (r) =>
          Number.isFinite(r.score) &&
          Number.isFinite(r.confidence) &&
          requestedJobIds.has(r.jobId) // Only include if jobId was in the request
      )
      .map((result) => [result.jobId, { ...result, source: "llm" }])
  );

  const missingJobs = jobs.filter((job) => !llmByJob.has(job.job_id));
  if (missingJobs.length === 0) {
    return Array.from(llmByJob.values()).sort((a, b) => b.score - a.score);
  }

  logger.warn("LLM_RESULTS_INCOMPLETE_USING_REGEX_FALLBACK_QUEUE", {
    userId,
    llmCount: llmByJob.size,
    totalJobs: jobs.length,
    fallbackJobs: missingJobs.length,
  });

  const regexResults = regexMatcher.matchJobsWithRegex(resume, missingJobs);

  for (const regexResult of regexResults) {
    llmByJob.set(regexResult.jobId, {
      ...regexResult,
      source: "regex",
    });
  }

  return Array.from(llmByJob.values()).sort((a, b) => b.score - a.score);
}

// Periodic cleanup (every 30 minutes)
setInterval(() => {
  matchQueue.cleanup();
}, 30 * 60 * 1000);

export function enqueueMatchJob(userId: number, jobs: NormalizedJob[]): string {
  return matchQueue.enqueue(userId, jobs);
}

export function getQueueStatus(queueId: string): QueueItem | null {
  return matchQueue.getStatus(queueId);
}

export function setQueueResults(queueId: string, results: MatchResult[]): void {
  matchQueue.setResults(queueId, results);
}

export function setQueueError(queueId: string, error: string): void {
  matchQueue.setError(queueId, error);
}

export function getQueueStats() {
  return matchQueue.getStats();
}

export async function processQueue(): Promise<void> {
  return matchQueue.processQueue();
}
