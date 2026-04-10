import { Router } from "express";
import { uploadResumeHandler } from "../controller/resumeController.js";
import { uploadResume } from "../middleware/upload.js";


const router = Router();

/**
 * POST /api/resume
 */
router.post(
  "/",
  uploadResume,
  uploadResumeHandler
);

export default router;