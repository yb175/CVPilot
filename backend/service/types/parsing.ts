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
 * Resume format types
 */
export type ResumeFormat = "ATS" | "CREATIVE" | "ACADEMIC" | "INTERNATIONAL" | "UNKNOWN";

/**
 * PDF extraction options
 */
export interface PDFExtractionOptions {
  maxChars?: number; // Default: 25000
  timeout?: number; // Default: 30000ms
  format?: ResumeFormat; // Detected resume format
  language?: string; // Detected language code (e.g., 'en', 'es', 'fr')
  userId?: string; // For logging
}

/**
 * LLM call options
 */
export interface LLMCallOptions {
  maxRetries?: number; // Default: 1 (1 initial + 1 repair)
  timeout?: number; // Default: 45000ms
  format?: ResumeFormat; // Detected resume format
  language?: string; // Detected language code
  userId?: string; // For logging
}

/**
 * Fallback parsing options
 */
export interface FallbackParsingOptions {
  extractSkills?: boolean; // Default: true
  extractEducation?: boolean; // Default: true
}

/**
 * =====================================
 * 🎯 Job Matching Types
 * =====================================
 */

/**
 * Source of match score (LLM, Regex, or Fallback)
 */
/**
 * Source of match score (LLM, Regex, or Fallback)
 */
export type MatchSource = "llm" | "regex" | "llm_fallback";

/**
 * Result of a single job match
 */
export interface MatchResult {
  jobId: string; // Job ID from DB
  score: number; // 0-100 scoring
  confidence: number; // 0-1 confidence
  reason: string; // <200 chars explanation
  source?: MatchSource; // Which method scored it (for debugging)
}

/**
 * Input for LLM matching
 */
export interface LLMMatchInput {
  resume: ParsedResume;
  jobs: NormalizedJob[];
}

/**
 * Normalized job data (from provider or DB)
 */
export interface NormalizedJob {
  job_id: string; // Primary key from Job table
  title: string;
  company: string;
  location: string;
  description: string;
  source: string; // 'active_jobs_db', 'greenhouse', etc.
  externalId: string; // External API ID
  skills: string[]; // Extracted/normalized skills
  rawData?: any; // Full original API response (JsonValue from Prisma, can be null)
}
