import { extractTextFromPDF } from "./pdfExtractor.js";
import { extractTextFromDOCX } from "./docxExtractor.js";
import { logParsingEvent, logPDFExtractionMetrics } from "../lib/parseLogger.js";
import { PDFExtractionOptions } from "./types/parsing.js";

/**
 * =====================================
 * 📄 Unified Document Extractor
 * =====================================
 *
 * Extracts text from various document formats (PDF, DOCX)
 * Routes to appropriate extractor based on MIME type.
 */

/**
 * Extract text from document buffer
 * Supports: PDF, DOCX
 *
 * @param buffer - Document file buffer
 * @param resumeId - Resume identifier for logging
 * @param mimeType - MIME type of the document
 * @param options - Extraction options
 * @returns Extracted text or null if extraction fails
 */
export const extractTextFromDocument = async (
  buffer: Buffer,
  resumeId: string,
  mimeType: string,
  options?: PDFExtractionOptions & { userId?: string }
): Promise<string | null> => {
  logParsingEvent("DOCUMENT_EXTRACT", resumeId, "start", {
    userId: options?.userId,
    message: `Starting document extraction (type: ${mimeType})`,
  });

  // Determine file type and route to appropriate extractor
  if (
    mimeType === "application/pdf" ||
    mimeType.includes("pdf")
  ) {
    return await extractTextFromPDF(buffer, resumeId, options);
  } else if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType.includes("wordprocessingml") ||
    mimeType.includes("word") ||
    mimeType === "application/msword"
  ) {
    return await extractTextFromDOCX(buffer, resumeId, options);
  } else {
    logParsingEvent("DOCUMENT_EXTRACT", resumeId, "failed", {
      userId: options?.userId,
      message: `Unsupported document format: ${mimeType}`,
      error: {
        type: "UNSUPPORTED_FORMAT",
        message: `Cannot extract from MIME type: ${mimeType}`,
      },
    });
    return null;
  }
};
