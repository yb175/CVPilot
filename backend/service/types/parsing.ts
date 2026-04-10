import type { ParsedResume } from "../../validators/resume.schema.js";

/**
 * =====================================
 * 📝 Parsing Types & Interfaces
 * =====================================
 */

/**
 * Raw response from Gemini API before validation
 */
export interface LLMResponse {
  success: boolean;
  data?: unknown; // Raw parsed JSON
  error?: string;
  rawText?: string; // Original response text
}

/**
 * Metadata context for a parsing job
 */
export interface ParsingContext {
  userId: string;
  resumeId: string;
  fileUrl: string;
  fileName?: string;
  timestamp: Date;
}

/**
 * Result of parsing pipeline
 */
export interface ParsingResult {
  success: boolean;
  data?: ParsedResume;
  stage: "pdf_extract" | "llm_call" | "validation" | "fallback" | "error";
  error?: {
    type:
      | "PDF_EXTRACTION_FAILED"
      | "LLM_CALL_FAILED"
      | "VALIDATION_FAILED"
      | "DOWNLOAD_FAILED"
      | "DATABASE_ERROR"
      | "UNKNOWN";
    message: string;
    rawError?: unknown;
  };
  attempts?: {
    pdfExtraction?: number;
    llmCall?: number;
    validation?: number;
  };
}

/**
 * PDF extraction options
 */
export interface PDFExtractionOptions {
  maxChars?: number; // Default: 10000
  timeout?: number; // Default: 30000ms
}

/**
 * LLM call options
 */
export interface LLMCallOptions {
  maxRetries?: number; // Default: 1 (1 initial + 1 repair)
  timeout?: number; // Default: 45000ms
}

/**
 * Fallback parsing options
 */
export interface FallbackParsingOptions {
  extractSkills?: boolean; // Default: true
  extractEducation?: boolean; // Default: true
}
