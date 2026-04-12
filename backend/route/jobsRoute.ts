import { Router } from "express";
import { protectedRoute } from "../middleware/auth.middleware.js";
import {
  matchJobsHandler,
  batchMatchHandler,
  matchStatusHandler,
  atsPromptHandler,
} from "../controller/jobsController.js";

const router = Router();

/**
 * POST /jobs/match
 * Match current user's resume against available jobs
 * Sync for small sets (<30), auto async for large sets
 * Returns ranked jobs with scores + confidence
 */
router.post("/match", protectedRoute, matchJobsHandler);

/**
 * POST /jobs/match/batch
 * Explicitly queue jobs for async matching
 * Returns queue ID for polling status
 */
router.post("/match/batch", protectedRoute, batchMatchHandler);

/**
 * GET /jobs/match/batch/:queueId
 * Poll status of async matching job
 * Returns results when complete
 */
router.get("/match/batch/:queueId", protectedRoute, matchStatusHandler);

/**
 * GET /jobs/:jobId/ats-prompt
 * Generate personalized ATS optimization prompt
 * Uses Gemini LLM to create actionable guide
 */
router.get("/:jobId/ats-prompt", protectedRoute, atsPromptHandler);

export default router;
