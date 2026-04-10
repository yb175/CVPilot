import { Request, Response } from "express";
import { generateFileHash } from "../lib/hash.js";
import { getResumeByUserId, upsertResume } from "../service/resumeService.js";
import { uploadResume, deleteResume } from "../service/cloudinaryService.js";
import { triggerResumeParsing } from "../service/parsingTrigger.js";
import { syncClerkUser } from "../service/user.service.js";

interface AuthRequest extends Request {
  auth: {
    userId: string
  } | null;
}

export const uploadResumeHandler = async (req: AuthRequest, res: Response) => {
  try {
    // 1. Get userId from req.auth (populated by protectedRoute middleware)
    const userId = req.auth?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    await syncClerkUser(userId,"")

    // 2. Validate file
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // ...existing code...

    const fileBuffer = req.file.buffer;

    // 3. Generate hash
    const fileHash = generateFileHash(fileBuffer);

    // 4. Get existing resume
    let existingResume = null;
    try {
      existingResume = await getResumeByUserId(userId);
      // existingResume is null if not found — that's expected!
    } catch (error) {
      // Only thrown when there's a REAL DB error
      console.error("DB error fetching existing resume:", error);
      return res.status(500).json({
        error: "Database error - please try again",
      });
    }

    // 5. If same file → skip everything
    if (existingResume && existingResume.fileHash === fileHash) {
      return res.status(200).json({
        message: "Resume unchanged",
        changed: false,
      });
    }

    // 6. Upload new file to Cloudinary
    let uploadResult;
    try {
      uploadResult = await uploadResume(fileBuffer, req.file.mimetype);
    } catch (error) {
      console.error("Cloudinary upload failed:", error);
      return res.status(500).json({
        error: "File upload failed",
      });
    }

    const { secureUrl, publicId } = uploadResult;

    // 7. Upsert DB (critical section)
    let updatedResume;
    try {
      updatedResume = await upsertResume({
        userId,
        fileUrl: secureUrl,
        publicId,
        fileHash,
        uploadedAt: new Date(),
      });
    } catch (error) {
      console.error("DB upsert failed:", error);

      // 🔥 rollback cloudinary upload if DB fails
      try {
        await deleteResume(publicId);
      } catch (rollbackError) {
        console.error(
          "Rollback (delete cloudinary file) failed:",
          rollbackError
        );
      }

      return res.status(500).json({
        error: "Failed to save resume in database",
      });
    }

    // 8. Delete old file (if exists) ONLY after DB success
    if (existingResume?.publicId) {
      try {
        await deleteResume(existingResume.publicId);
      } catch (err) {
        console.error("Failed to delete old resume:", err);
      }
    }

    // 9. Fire-and-forget parsing (pass file buffer to avoid re-download)
    console.log(`[CONTROLLER] Triggering parsing for userId: ${userId}, buffer size: ${fileBuffer.length}`);
    triggerResumeParsing(userId, secureUrl, fileBuffer).catch((err: any) =>
      console.error("[CONTROLLER] Parsing trigger failed:", err)
    );

    // 10. Success response
    return res.status(200).json({
      message: "Resume uploaded",
      changed: true,
      fileUrl: secureUrl,
    });
  } catch (error) {
    console.error("Resume upload error:", error);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
};

/**
 * GET /resume
 * Retrieve parsed resume data for authenticated user
 */
export const getResumeHandler = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.auth?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const resume = await getResumeByUserId(userId);

    if (!resume) {
      return res.status(404).json({ 
        error: "No resume found. Please upload a resume first." 
      });
    }

    // If parsing still in progress, parsedData will be null
    if (!resume.parsedData) {
      return res.status(202).json({
        message: "Resume uploaded but still parsing. Try again in a few seconds.",
        fileUrl: resume.fileUrl,
        uploadedAt: resume.uploadedAt,
      });
    }

    // Return parsed data
    return res.status(200).json({
      message: "Resume parsed successfully",
      parsedData: resume.parsedData,
      uploadedAt: resume.uploadedAt,
      fileUrl: resume.fileUrl,
    });
  } catch (error) {
    console.error("Get resume error:", error);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
};
