import pdfParse from "pdf-parse";
import { logParsingEvent, logPDFExtractionMetrics } from "../lib/parseLogger.js";
import { PDFExtractionOptions } from "./types/parsing.js";

/**
 * =====================================
 * 📄 PDF Extractor Service
 * =====================================
 *
 * Extracts text content from PDF buffers
 * with timeout handling and intelligent truncation.
 */

const DEFAULT_MAX_CHARS = 10000;
const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Extract text from PDF buffer
 *
 * @param buffer - PDF file buffer
 * @param resumeId - Resume identifier for logging
 * @param options - Extraction options
 * @returns Extracted text or null if extraction fails
 */
export const extractTextFromPDF = async (
  buffer: Buffer,
  resumeId: string,
  options?: PDFExtractionOptions & { userId?: string }
): Promise<string | null> => {
  const maxChars = options?.maxChars ?? DEFAULT_MAX_CHARS;
  const timeout = options?.timeout ?? DEFAULT_TIMEOUT_MS;
  const startTime = Date.now();

  logParsingEvent("PDF_EXTRACT", resumeId, "start", {
    userId: options?.userId,
    message: "Starting PDF text extraction",
  });

  try {
    // Set up timeout promise
    const extractionPromise = pdfParse(buffer);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("PDF_EXTRACTION_TIMEOUT")),
        timeout
      )
    );

    const result = await Promise.race([extractionPromise, timeoutPromise]);

    if (!result.text || result.text.trim().length === 0) {
      logParsingEvent("PDF_EXTRACT", resumeId, "failed", {
        userId: options?.userId,
        message: "PDF extraction returned empty text",
        error: {
          type: "EMPTY_PDF",
          message: "No text content found in PDF",
        },
      });
      return null;
    }

    let extractedText = result.text.trim();
    let wasTruncated = false;

    // Truncate intelligently if exceeds max chars
    if (extractedText.length > maxChars) {
      extractedText = truncateByParagraphs(extractedText, maxChars);
      wasTruncated = true;
    }

    const latencyMs = Date.now() - startTime;
    logPDFExtractionMetrics(resumeId, {
      userId: options?.userId,
      bytesExtracted: buffer.length,
      charactersExtracted: extractedText.length,
      latencyMs,
      truncated: wasTruncated,
    });

    logParsingEvent("PDF_EXTRACT", resumeId, "success", {
      userId: options?.userId,
      message: `PDF extraction successful: ${extractedText.length} chars extracted`,
    });

    return extractedText;
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorType =
      error instanceof Error && error.message === "PDF_EXTRACTION_TIMEOUT"
        ? "PDF_EXTRACTION_TIMEOUT"
        : "PDF_PARSE_ERROR";

    logParsingEvent("PDF_EXTRACT", resumeId, "failed", {
      userId: options?.userId,
      message: `PDF extraction failed: ${errorType}`,
      error: {
        type: errorType,
        message: error instanceof Error ? error.message : String(error),
        details: {
          latencyMs,
          bufferSize: buffer.length,
        },
      },
    });

    return null;
  }
};

/**
 * Intelligently truncate text by paragraphs
 * Prefers to break at paragraph boundaries rather than mid-word
 */
function truncateByParagraphs(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }

  // Split by double newlines (paragraphs)
  const paragraphs = text.split(/\n\n+/);
  let result = "";

  for (const para of paragraphs) {
    if ((result + para).length <= maxChars) {
      result += (result ? "\n\n" : "") + para;
    } else {
      break;
    }
  }

  // If no paragraphs fit, try line breaks
  if (!result && paragraphs.length > 0) {
    const lines = text.split("\n");
    for (const line of lines) {
      if ((result + line).length <= maxChars) {
        result += (result ? "\n" : "") + line;
      } else {
        break;
      }
    }
  }

  // If still nothing, just truncate at char boundary
  if (!result) {
    result = text.substring(0, maxChars);
  }

  return result;
}
