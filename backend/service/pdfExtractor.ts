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

const DEFAULT_MAX_CHARS = 25000;
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
 * Intelligently truncate text by paragraphs with section awareness
 * Prioritizes: Work Experience > Skills > Education > Projects > Other sections
 * Preserves structure while respecting character limit
 */
function truncateByParagraphs(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }

  // Identify resume sections
  const sectionPatterns = [
    { name: "EXPERIENCE", pattern: /(?:work\s+experience|employment|professional\s+experience|experience)/i, priority: 1 },
    { name: "SKILLS", pattern: /(?:technical\s+skills|skills|competencies|technical\s+expertise)/i, priority: 2 },
    { name: "EDUCATION", pattern: /(?:education|academic|degree|university|college)/i, priority: 3 },
    { name: "PROJECTS", pattern: /(?:projects?|portfolio|work\s+samples?)/i, priority: 4 },
    { name: "OTHER", pattern: /.*/, priority: 5 },
  ];

  const paragraphs = text.split(/\n\n+/);
  const categorized = new Map<string, string[]>();

  for (const para of paragraphs) {
    for (const section of sectionPatterns) {
      if (section.pattern.test(para.substring(0, 100))) {
        const key = section.name;
        if (!categorized.has(key)) categorized.set(key, []);
        categorized.get(key)!.push(para);
        break;
      }
    }
  }

  // Build result prioritizing high-value sections
  let result = "";
  const order = ["EXPERIENCE", "SKILLS", "EDUCATION", "PROJECTS", "OTHER"];

  for (const sectionName of order) {
    const section = categorized.get(sectionName) || [];
    for (const para of section) {
      const candidate = result + (result ? "\n\n" : "") + para;
      if (candidate.length <= maxChars) {
        result = candidate;
      } else {
        // Section doesn't fit completely, try adding lines from this section only
        if (result.length < maxChars * 0.8) {
          const lines = para.split("\n");
          for (const line of lines) {
            const lineCandidate = result + (result ? "\n" : "") + line;
            if (lineCandidate.length <= maxChars) {
              result = lineCandidate;
            } else {
              return result || text.substring(0, maxChars);
            }
          }
        }
        return result || text.substring(0, maxChars);
      }
    }
  }

  return result || text.substring(0, maxChars);
}
