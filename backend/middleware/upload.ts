import multer from "multer";
import { Request } from "express";

const storage = multer.memoryStorage();

const allowedMimeTypes = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// Magic byte signatures for file validation
const MAGIC_BYTES = {
  pdf: Buffer.from([0x25, 0x50, 0x44, 0x46]), // %PDF
  docx: Buffer.from([0x50, 0x4b, 0x03, 0x04]), // PK..
};

/**
 * Validate file magic bytes (file signatures)
 * Prevents uploading renamed files with spoofed MIME types
 */
const validateMagicBytes = (buffer: Buffer, mimetype: string): boolean => {
  if (buffer.length < 4) {
    return false; // File too small to contain valid signature
  }

  const fileSignature = buffer.slice(0, 4);

  switch (mimetype) {
    case "application/pdf":
      // Check for %PDF signature
      return fileSignature.equals(MAGIC_BYTES.pdf);

    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      // Check for PK.. signature (ZIP-based format)
      return fileSignature.equals(MAGIC_BYTES.docx);

    default:
      return false;
  }
};

const fileFilter: multer.Options["fileFilter"] = (req: Request, file, cb) => {
  // 1. Check MIME type
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error("Only PDF and DOCX files are allowed!!"));
  }

  // 2. Check magic bytes when buffer is available
  // Note: fileFilter is called before file is fully buffered in stream mode
  // Since we use memoryStorage, the file will be buffered
  // We'll validate in a separate step or use a custom middleware
  cb(null, true);
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter,
});

export const uploadResume = upload.single("file");

/**
 * Additional validation middleware to check magic bytes
 * Use this AFTER multer processes the file
 */
export const validateFileMagicBytes = (
  req: Request,
  res: any,
  next: any
) => {
  if (!req.file) {
    return next();
  }

  const { mimetype, buffer } = req.file;

  if (!validateMagicBytes(buffer, mimetype)) {
    return res.status(400).json({
      error: "Invalid file format - file signature does not match MIME type",
    });
  }

  next();
};