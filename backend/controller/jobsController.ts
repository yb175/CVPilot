import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import type { ParsedResume } from "../validators/resume.schema.js";
import type { MatchResult } from "../service/types/parsing.js";
import * as atsGenerator from "../service/jobs/atsPromptGenerator.js";
import * as llmMatcherV2 from "../service/jobs/llmJobMatcherV2.js";
import * as regexMatcher from "../service/jobs/regexJobMatcher.js";
import * as cache from "../service/jobs/matchCache.js";
import * as jobMatchService from "../service/jobs/jobMatch.service.js";
import * as queue from "../service/jobs/matchQueue.js";
import { upsertJob } from "../service/jobs/jobs.service.js";
import { ActiveJobsProvider } from "../service/jobs/providers/activeJobs.provider.js";
import { normalizeActiveJobsDbJob } from "../service/jobs/jobNormalizer.js";
import { syncClerkUser } from "../service/user.service.js";

/**
 * Extract job URL from raw job data
 * Tries common URL field names used by job APIs
 */
function extractJobUrl(rawData: Record<string, any> | undefined): string | undefined {
  if (!rawData) return undefined;
  
  const urlFields = [
    "apply_url",
    "link_url",
    "job_url",
    "url",
    "apply_link",
    "link",
    "job_link",
    "external_url",
    "externalUrl",
  ];
  
  for (const field of urlFields) {
    const value = rawData[field];
    if (typeof value === "string" && value.startsWith("http")) {
      return value;
    }
  }
  
  return undefined;
}

/**
 * POST /jobs/match
 * Fetch jobs from Active Jobs API and match against user's resume
 * Returns ranked jobs with scores + confidence
 */
export async function matchJobsHandler(req: Request, res: Response): Promise<void> {
  const clerkUserId = req.auth?.userId;

  if (!clerkUserId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    logger.info("JOB_MATCH_REQUEST", { clerkUserId });

    const userId = await resolveInternalUserId(clerkUserId);

    // Step 1: Fetch user's resume
    const resume = await prisma.resume.findFirst({
      where: { userId: clerkUserId },
    });

    if (!resume?.parsedData) {
      res.status(400).json({ error: "Resume not found or not yet parsed" });
      return;
    }

    // Step 2: Fetch jobs from Active Jobs API (5 jobs), then fall back to DB cache if needed.
    const searchParams = buildJobSearchFromResume(resume.parsedData as ParsedResume);
    const jobsProvider = new ActiveJobsProvider();
    let normalizedJobs: Array<{
      job_id: string;
      title: string;
      company: string;
      location: string;
      description: string;
      source: string;
      externalId: string;
      skills: string[];
      rawData: unknown;
    }> = [];
    let sourceUsed: "active_jobs_db" | "db_fallback" = "active_jobs_db";
    let providerError: string | null = null;

    try {
      logger.info("FETCHING_FROM_ACTIVE_JOBS", { clerkUserId, userId, searchParams });

      let rawJobs = await jobsProvider.fetchJobs(searchParams);

      if (rawJobs.length === 0) {
        const relaxedParams = buildRelaxedJobSearch();
        logger.warn("ACTIVE_JOBS_EMPTY_RETRYING_WITH_RELAXED_FILTERS", {
          clerkUserId,
          userId,
          originalSearchParams: searchParams,
          relaxedParams,
        });

        rawJobs = await jobsProvider.fetchJobs(relaxedParams);
      }

      if (rawJobs.length > 0) {
        logger.info("ACTIVE_JOBS_FETCHED", {
          clerkUserId,
          userId,
          jobCount: rawJobs.length,
        });

        normalizedJobs = await Promise.all(
          rawJobs.map(async (rawJob) => {
            const normalized = normalizeActiveJobsDbJob(rawJob);
            const persistedJob = await upsertJob(normalized);

            return {
              job_id: persistedJob.job_id,
              title: persistedJob.title,
              company: persistedJob.company,
              location: persistedJob.location,
              description: persistedJob.description,
              source: persistedJob.source,
              externalId: persistedJob.externalId,
              skills: persistedJob.skills || [],
              rawData: persistedJob.rawData,
            };
          })
        );
      }
    } catch (error) {
      providerError = error instanceof Error ? error.message : String(error);
      logger.warn("ACTIVE_JOBS_PROVIDER_FAILED_USING_DB_FALLBACK", {
        clerkUserId,
        userId,
        error: providerError,
      });
    }

    if (normalizedJobs.length === 0) {
      const fallbackJobs = await prisma.job.findMany({
        orderBy: { updatedAt: "desc" },
        take: 10,
      });

      if (fallbackJobs.length > 0) {
        sourceUsed = "db_fallback";
        normalizedJobs = fallbackJobs.map((job) => ({
          job_id: job.job_id,
          title: job.title,
          company: job.company,
          location: job.location,
          description: job.description,
          source: job.source,
          externalId: job.externalId,
          skills: job.skills || [],
          rawData: job.rawData,
        }));

        logger.warn("USING_DB_JOB_FALLBACK", {
          clerkUserId,
          userId,
          jobCount: normalizedJobs.length,
        });
      }
    }

    if (normalizedJobs.length === 0) {
      if (providerError) {
        res.status(502).json({
          error: "Job provider unavailable",
          details: providerError,
        });
        return;
      }

      res.status(404).json({ error: "No jobs available from Active Jobs API or local fallback" });
      return;
    }

    // Step 4: Run LLM-first matcher (v2)
    const startTime = Date.now();

    const llmResults = await llmMatcherV2.matchJobsWithLLMV2(
      resume.parsedData as ParsedResume,
      normalizedJobs,
      userId
    );

    // Step 5: Run regex only for missing jobIds or when LLM returns no valid outputs.
    const finalResults = await mergeWithConditionalRegexFallback(
      llmResults,
      resume.parsedData as ParsedResume,
      normalizedJobs,
      userId
    );

    // Step 6: Persist to database for history
    await jobMatchService.persistMatchResults(userId, finalResults);

    // Step 7: Cache results
    for (const result of finalResults) {
      cache.setInCache(userId, result.jobId, result);
    }

    const duration = Date.now() - startTime;

    logger.info("JOB_MATCH_COMPLETE", {
      clerkUserId,
      userId,
      source: sourceUsed,
      jobCount: normalizedJobs.length,
      matchedJobs: finalResults.length,
      duration,
    });

    // Create a map for quick job lookup
    const jobsMap = new Map(
      normalizedJobs.map((job) => [job.job_id, job])
    );

    res.json({
      method: "sync",
      source: sourceUsed,
      jobsFetched: normalizedJobs.length,
      matchedJobs: finalResults.length,
      results: finalResults.slice(0, 5).map((r) => {
        const job = jobsMap.get(r.jobId);
        const jobUrl = extractJobUrl(job?.rawData as any);
        return {
          jobId: r.jobId,
          title: job?.title || "Job Title",
          company: job?.company || "Company",
          location: job?.location || "Remote",
          description: job?.description || "",
          skills: job?.skills || [],
          jobUrl,
          score: r.score,
          confidence: r.confidence,
          reason: r.reason,
        };
      }),
      duration,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    logger.error("JOB_MATCH_FAILED", {
      clerkUserId,
      error: message,
    });

    if (message.includes("Active Jobs API error") || message.includes("Active Jobs API error payload")) {
      res.status(502).json({
        error: "Job provider unavailable",
        details: message,
      });
      return;
    }

    res.status(500).json({ error: "Job matching failed" });
  }
}

/**
 * POST /jobs/match/batch
 * Explicit async batch matching
 * Returns queue ID for polling
 */
export async function batchMatchHandler(req: Request, res: Response): Promise<void> {
  const clerkUserId = req.auth?.userId;
  const { jobIds } = req.body as { jobIds?: string[] };

  if (!clerkUserId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
    res.status(400).json({ error: "jobIds array required" });
    return;
  }

  try {
    const userId = await resolveInternalUserId(clerkUserId);

    logger.info("BATCH_MATCH_REQUEST", {
      clerkUserId,
      userId,
      jobCount: jobIds.length,
    });

    // Fetch jobs
    const jobs = await prisma.job.findMany({
      where: {
        job_id: {
          in: jobIds,
        },
      },
    });

    if (jobs.length === 0) {
      res.status(404).json({ error: "No jobs found" });
      return;
    }

    // Normalize jobs
    const normalizedJobs = jobs.map((job) => ({
      job_id: job.job_id,
      title: job.title,
      company: job.company,
      location: job.location,
      description: job.description,
      source: job.source,
      externalId: job.externalId,
      skills: job.skills || [],
      rawData: job.rawData,
    }));

    // Enqueue
    const queueId = queue.enqueueMatchJob(userId, normalizedJobs);

    res.json({
      queueId,
      status: "queued",
      jobCount: jobs.length,
      statusUrl: `/jobs/match/batch/${queueId}`,
    });
  } catch (error) {
    logger.error("BATCH_MATCH_REQUEST_FAILED", {
      clerkUserId,
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({ error: "Batch match request failed" });
  }
}

/**
 * GET /jobs/match/batch/:queueId
 * Poll async matching status
 * Returns status and results when complete
 */
export async function matchStatusHandler(req: Request, res: Response): Promise<void> {
  const { queueId } = req.params as { queueId: string };

  try {
    const item = queue.getQueueStatus(queueId);

    if (!item) {
      res.status(404).json({ error: "Queue item not found" });
      return;
    }

    logger.info("QUEUE_STATUS_POLL", {
      queueId,
      status: item.status,
      age: Date.now() - item.createdAt.getTime(),
    });

    if (item.status === "completed" && item.results) {
      res.json({
        queueId,
        status: "completed",
        matchedJobs: item.results.length,
        results: item.results.slice(0, 20),
        completedAt: item.completedAt,
      });
    } else if (item.status === "failed") {
      res.json({
        queueId,
        status: "failed",
        error: item.error,
      });
    } else {
      res.json({
        queueId,
        status: item.status,
        createdAt: item.createdAt,
      });
    }
  } catch (error) {
    logger.error("QUEUE_STATUS_FAILED", {
      queueId,
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({ error: "Failed to fetch queue status" });
  }
}

/**
 * GET /jobs/:jobId/ats-prompt
 * Generate ATS optimization prompt for a specific job
 * No DB storage, returns formatted text
 */
export async function atsPromptHandler(req: Request, res: Response): Promise<void> {
  const { jobId } = req.params as { jobId: string };
  const clerkUserId = req.auth?.userId;

  if (!clerkUserId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    logger.info("ATS_PROMPT_REQUEST", { jobId, clerkUserId });

    // Fetch job
    const job = await prisma.job.findUnique({
      where: { job_id: jobId },
    });

    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    // Fetch user's resume
    const resume = await prisma.resume.findFirst({
      where: { userId: clerkUserId },
    });

    if (!resume?.parsedData) {
      res.status(400).json({ error: "Resume not found or not yet parsed" });
      return;
    }

    // Normalize job
    const normalizedJob = {
      job_id: job.job_id,
      title: job.title,
      company: job.company,
      location: job.location,
      description: job.description,
      source: job.source,
      externalId: job.externalId,
      skills: job.skills || [],
      rawData: job.rawData,
    };

    // Generate ATS prompt (using Gemini LLM)
    const prompt = await atsGenerator.generateATSPrompt(
      resume.parsedData as ParsedResume,
      normalizedJob
    );

    res.json({
      jobId,
      jobTitle: job.title,
      company: job.company,
      prompt,
      generatedAt: new Date(),
    });
  } catch (error) {
    logger.error("ATS_PROMPT_REQUEST_FAILED", {
      jobId,
      clerkUserId,
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(500).json({ error: "Failed to generate ATS prompt" });
  }
}

/**
 * Helper: Compare LLM and Regex results, pick best score
 * Logs comparison for debugging
 */
async function mergeWithConditionalRegexFallback(
  llmResults: MatchResult[],
  resume: ParsedResume,
  normalizedJobs: Array<{
    job_id: string;
    title: string;
    company: string;
    location: string;
    description: string;
    source: string;
    externalId: string;
    skills: string[];
    rawData: unknown;
  }>,
  userId: number
): Promise<MatchResult[]> {
  const llmByJob = new Map<string, MatchResult>(
    llmResults
      .filter((r) => Number.isFinite(r.score) && Number.isFinite(r.confidence))
      .map((result) => [result.jobId, { ...result, source: "llm" }])
  );

  const missingJobs = normalizedJobs.filter((job) => !llmByJob.has(job.job_id));
  if (missingJobs.length === 0) {
    return Array.from(llmByJob.values()).sort((a, b) => b.score - a.score);
  }

  logger.warn("LLM_RESULTS_INCOMPLETE_USING_REGEX_FALLBACK", {
    userId,
    llmCount: llmByJob.size,
    totalJobs: normalizedJobs.length,
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

async function resolveInternalUserId(clerkUserId: string): Promise<number> {
  const existingUser = await prisma.user.findUnique({
    where: { clerkId: clerkUserId },
  });

  if (existingUser) {
    return existingUser.id;
  }

  const createdUser = await syncClerkUser(clerkUserId, "");
  return createdUser.id;
}

function buildJobSearchFromResume(resume: ParsedResume): {
  offset: number;
  titleFilter: string;
  locationFilter: string;
  descriptionType: "text";
  limit: number;
} {
  const titleSeed =
    firstNonEmpty(resume.currentRole, resume.skills?.[0], resume.keywords?.[0]) ||
    "Software Engineer";
  const locationSeed = firstNonEmpty(resume.location) || "United States";

  return {
    offset: 0,
    titleFilter: `"${sanitizeFilterValue(titleSeed)}"`,
    locationFilter: `"${sanitizeFilterValue(locationSeed)}"`,
    descriptionType: "text",
    limit: 5,
  };
}

function buildRelaxedJobSearch(): {
  offset: number;
  titleFilter: string;
  locationFilter: string;
  descriptionType: "text";
  limit: number;
} {
  return {
    offset: 0,
    titleFilter: '"Software Engineer" OR "Data Engineer" OR "Backend Engineer"',
    locationFilter: '"United States" OR "United Kingdom" OR "India"',
    descriptionType: "text",
    limit: 5,
  };
}

function firstNonEmpty(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function sanitizeFilterValue(value: string): string {
  return value.replace(/"/g, "").trim();
}
