import mammoth from "mammoth";
import { logParsingEvent, logPDFExtractionMetrics } from "../lib/parseLogger.js";
import { PDFExtractionOptions } from "./types/parsing.js";

/**
 * =====================================
 * 📝 DOCX Extractor Service
 * =====================================
 *
 * Extracts text content from DOCX files using Mammoth.
 * Handles modern Word documents (.docx format).
 */

const DEFAULT_MAX_CHARS = 10000;
const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Extract text from DOCX buffer
 *
 * @param buffer - DOCX file buffer
 * @param resumeId - Resume identifier for logging
 * @param options - Extraction options
 * @returns Extracted text or null if extraction fails
 */
export const extractTextFromDOCX = async (
  buffer: Buffer,
  resumeId: string,
  options?: PDFExtractionOptions & { userId?: string }
): Promise<string | null> => {
  const maxChars = options?.maxChars ?? DEFAULT_MAX_CHARS;
  const timeout = options?.timeout ?? DEFAULT_TIMEOUT_MS;
  const startTime = Date.now();

  logParsingEvent("DOCX_EXTRACT", resumeId, "start", {
    userId: options?.userId,
    message: "Starting DOCX text extraction",
  });

  try {
    // Set up timeout promise
    const extractionPromise = mammoth.extractRawText({ buffer });
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("DOCX_EXTRACTION_TIMEOUT")),
        timeout
      )
    );

    const result = await Promise.race([extractionPromise, timeoutPromise]);

    if (!result.value || result.value.trim().length === 0) {
      logParsingEvent("DOCX_EXTRACT", resumeId, "failed", {
        userId: options?.userId,
        message: "DOCX extraction returned empty text",
        error: {
          type: "EMPTY_DOCX",
          message: "No text content found in DOCX",
        },
      });
      return null;
    }

    let extractedText = result.value.trim();
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

    logParsingEvent("DOCX_EXTRACT", resumeId, "success", {
      userId: options?.userId,
      message: `DOCX extraction successful: ${extractedText.length} chars extracted`,
    });

    return extractedText;
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorType =
      error instanceof Error && error.message === "DOCX_EXTRACTION_TIMEOUT"
        ? "DOCX_EXTRACTION_TIMEOUT"
        : "DOCX_PARSE_ERROR";

    logParsingEvent("DOCX_EXTRACT", resumeId, "failed", {
      userId: options?.userId,
      message: `DOCX extraction failed: ${errorType}`,
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
