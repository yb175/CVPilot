import { Router } from "express";
import { uploadResumeHandler } from "../controller/resumeController.js";
import { uploadResume } from "../middleware/upload.js";
import { protectedRoute } from "../middleware/auth.middleware.js";

const router = Router();

/**
 * POST /resume
 * Protected route with multer file upload
 * Middleware chain:
 *   1. protectedRoute (checks Clerk auth)
 *   2. uploadResume.single("file") (multer processes file)
 *   3. uploadResumeHandler (controller logic)
 */
router.post(
  "/",
  protectedRoute,
  uploadResume,
  uploadResumeHandler
);

export default router;