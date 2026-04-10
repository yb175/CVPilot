import { Request, Response } from "express";
import { generateFileHash } from "../lib/hash.js";
import { getResumeByUserId, upsertResume } from "../service/resumeService.js";
import { uploadResume, deleteResume } from "../service/cloudinaryService.js";
import { triggerResumeParsing } from "../service/parsingTrigger.js";



/**
 * ============================
 * 📄 RESUME UPLOAD API CONTRACT
 * ============================
 *
 * Endpoint:
 *   POST /api/resume
 *
 * Auth:
 *   Currently DISABLED (auth-free dev mode)
 *   - userId is taken from req.body.userId
 *   - fallback: "test-user"
 *
 * Request Type:
 *   multipart/form-data
 *
 * Fields:
 *   - file: File (PDF or DOCX) [required]
 *   - userId: string [optional in dev mode]
 *
 * Middleware Flow:
 *   1. multer (uploadResume.single("file"))
 *   2. file.buffer becomes available in req.file.buffer
 *
 * Processing Steps:
 *   1. Generate SHA-256 hash of uploaded file
 *   2. Fetch existing resume from DB (by userId)
 *   3. Compare hash to detect changes
 *   4. If unchanged → return early response
 *   5. Upload file to Cloudinary (if changed)
 *   6. Upsert resume metadata in PostgreSQL via Prisma
 *   7. Delete previous Cloudinary file (if exists)
 *   8. Trigger resume parsing in background (fire-and-forget)
 *
 * Success Responses:
 *
 * 200 OK (unchanged file):
 * {
 *   message: "Resume unchanged",
 *   changed: false
 * }
 *
 * 200 OK (new/updated resume):
 * {
 *   message: "Resume uploaded",
 *   changed: true,
 *   fileUrl: string
 * }
 *
 * Error Responses:
 *
 * 400 Bad Request:
 * {
 *   error: "No file uploaded"
 * }
 *
 * 500 Internal Server Error:
 * {
 *   error: "Internal server error"
 * }
 *
 * Notes for Frontend:
 * - Always send file field as "file"
 * - Do NOT resend same file if unchanged (backend will detect anyway)
 * - fileUrl is the public Cloudinary URL to display/download resume
 * - parsing happens asynchronously and is NOT included in response
 */

/**
 * Upload / Update Resume Controller
 */

export const uploadResumeHandler = async (req: Request, res: Response) => {
  try {
    // 1. Get userId from Clerk auth
    const userId = req.body.userId ;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // 2. Validate file
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileBuffer = req.file.buffer;

    // 3. Generate hash
    const fileHash = generateFileHash(fileBuffer);

    // 4. Get existing resume
    const existingResume = await getResumeByUserId(userId);

    if (!existingResume){
        console.log("No existing resume found-creating new one")
    }

    // 5. If same file → skip everything
    if (existingResume && existingResume.fileHash === fileHash) {
      return res.status(200).json({
        message: "Resume unchanged",
        changed: false,
      });
    }

    // 6. Upload new file to Cloudinary
    const { secureUrl, publicId } = await uploadResume(
      fileBuffer,
      req.file.mimetype
    );

    // 7. Upsert DB
    const updatedResume = await upsertResume({
      userId,
      fileUrl: secureUrl,
      publicId,
      fileHash,
      uploadedAt: new Date(),
    });

    // 8. Delete old file (if exists)
    if (existingResume?.publicId) {
      await deleteResume(existingResume.publicId);
    }

    // 9. Fire-and-forget parsing
    triggerResumeParsing(userId,secureUrl).catch((err:any) =>
      console.error("Parsing failed:", err)
    );

    // 10. Response
    return res.status(200).json({
      message: "Resume uploaded",
      changed: true,
      fileUrl: secureUrl,
    });
  } catch (error) {
    console.log(error)
    return res.status(500).json({
      
      error: "Internal server error",
    });
  }
};