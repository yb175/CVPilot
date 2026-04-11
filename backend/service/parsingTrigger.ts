/**
 * =====================================
 * 📄 Parsing Trigger - Pipeline Orchestrator
 * =====================================
 *
 * Orchestrates the complete resume parsing pipeline:
 * 1. Download PDF/DOCX from fileUrl
 * 2. Extract text from document
 * 3. Call Gemini LLM for parsing
 * 4. Validate parsed data
 * 5. Fallback to rule-based parsing if needed
 * 6. Merge with user preferences
 * 7. Store in database
 *
 * IMPORTANT:
 * - This function is non-blocking (fire-and-forget)
 * - Must NEVER throw to the controller
 * - All errors are logged but handled gracefully
 * - Can be migrated to queue (BullMQ/Redis) without code changes
 */

import { downloadFileFromUrl } from "./fileDownloader.js";
import { extractTextFromDocument } from "./documentExtractor.js";
import { callGeminiForResumeParsing } from "./geminiClient.js";
import { validateAndRepairResume } from "./resumeValidator.js";
import { fallbackParsing } from "./fallbackParser.js";
import { mergeWithUserPreferences, UserPreferencesData } from "./preferenceMerger.js";
import { updateResumeParsedData, getResumeByUserId } from "./resumeService.js";
import { getPreferences } from "./preferences.service.js";
import { logParsingEvent } from "../lib/parseLogger.js";
import { detectMimeType } from "../lib/mimeDetector.js";
import { ParsedResume } from "../validators/resume.schema.js";
import { ResumeFormat } from "./types/parsing.js";
import prisma from "../lib/prisma.js";

/**
 * =====================================
 * Helper Functions: Format & Language Detection
 * =====================================
 */

/**
 * Detect resume format from extracted text
 * @returns ResumeFormat indicating the resume structure type
 */
function detectResumeFormat(text: string): ResumeFormat {
  const lower = text.toLowerCase();
  
  // ATS-formatted: numbered bullets, structured sections, minimal styling
  const atsIndicators = [
    /^\d+\.\s+/m, // Numbered items
    /^\-\s+/m, // Bullet points
    /(experience|education|skills|projects|certifications|summary|objective)/i, // Standard sections
  ];
  const atsScore = atsIndicators.filter(p => p.test(text)).length;

  // International: non-English text patterns or date formats (DD/MM/YYYY)
  const internationalIndicators = [
    /\d{1,2}\/\d{1,2}\/\d{4}/, // European date format
    /\d{1,2}\.\d{1,2}\.\d{4}/, // German/Nordic date format
    /janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre/i, // French months
    /enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre/i, // Spanish months
  ];
  const intlScore = internationalIndicators.filter(p => p.test(text)).length;

  // Academic: GPA, thesis, academic advisor, dissertation
  const academicIndicators = [
    /gpa|grade\s+point|undergraduate|graduate|thesis|dissertation|academic\s+advisor/i,
    /course\s+(?:work|taken)|major:|minor:/i,
  ];
  const academicScore = academicIndicators.filter(p => p.test(text)).length;

  // Creative: longer descriptions, narrative format, less structured
  const creativeIndicators = [
    text.split(/\n/).filter(l => l.length > 80).length > 5, // Long lines suggest narrative
    /^[^\n]{100,}/m, // Paragraphs over 100 chars
  ];
  const creativeScore = creativeIndicators.filter(p => p).length;

  // Determine format based on scores
  if (intlScore >= 2) return "INTERNATIONAL";
  if (academicScore >= 2) return "ACADEMIC";
  if (atsScore >= 3) return "ATS";
  if (creativeScore >= 1) return "CREATIVE";
  return "UNKNOWN";
}

/**
 * Detect language of resume text
 * @returns ISO 639-1 language code (e.g., 'en', 'es', 'fr')
 */
function detectLanguage(text: string): string {
  const lower = text.toLowerCase();
  
  // Common keywords by language
  const languages: Record<string, { keywords: string[], score: number }> = {
    en: { keywords: ["experience", "education", "skills", "employed", "company", "university"], score: 0 },
    es: { keywords: ["experiencia", "educación", "habilidades", "empleado", "empresa", "universidad"], score: 0 },
    fr: { keywords: ["expérience", "éducation", "compétences", "employé", "entreprise", "université"], score: 0 },
    de: { keywords: ["erfahrung", "ausbildung", "fähigkeiten", "angestellt", "unternehmen", "universität"], score: 0 },
    pt: { keywords: ["experiência", "educação", "habilidades", "empregado", "empresa", "universidade"], score: 0 },
  };

  // Score each language
  for (const [lang, data] of Object.entries(languages)) {
    for (const keyword of data.keywords) {
      const pattern = new RegExp(`\\b${keyword}\\b`, "gi");
      const matches = (text.match(pattern) || []).length;
      data.score += matches;
    }
  }

  // Return language with highest score, default to English
  const detected = Object.entries(languages).sort((a, b) => b[1].score - a[1].score)[0];
  return detected && detected[1].score > 0 ? detected[0] : "en";
}

/**
 * Trigger resume parsing
 * Orchestrates the full pipeline asynchronously
 *
 * @param userId - Clerk user ID
 * @param fileUrl - Cloudinary file URL
 * @param fileBuffer - Optional file buffer to skip re-download
 */
export const triggerResumeParsing = async (
  userId: string,
  fileUrl?: string,
  fileBuffer?: Buffer
): Promise<void> => {
  console.log(`[PARSING:TRIGGER] Parsing trigger called for userId: ${userId}, hasBuffer: ${!!fileBuffer}`);
  // Don't throw - catch all errors
  try {
    console.log(`[PARSING:TRIGGER] About to call parseResumeInner...`);
    await parseResumeInner(userId, fileUrl, fileBuffer);
    console.log(`[PARSING:TRIGGER] parseResumeInner returned`);
  } catch (error) {
    console.error(
      "[PARSING:TRIGGER] Unexpected error in parsing pipeline:",
      error
    );
  }
};

/**
 * Internal parsing orchestrator
 */
async function parseResumeInner(
  userId: string,
  fileUrl?: string,
  providedFileBuffer?: Buffer
): Promise<void> {
  const startTime = Date.now();
  const log = (stage: string, message: string) => {
    const elapsed = Date.now() - startTime;
    console.log(`[PARSING:${stage}] (+${elapsed}ms) ${message}`);
  };

  // Step 0: Get resume record to get resumeId and full context
  let resumeId: string;
  let resumeFileUrl: string;

  log("INIT", "Starting resume parsing pipeline");

  try {
    log("FETCH_DB", "Fetching resume metadata from database...");
    const t0 = Date.now();
    const resume = await getResumeByUserId(userId);
    const dbTime = Date.now() - t0;
    log("FETCH_DB", `Database query took ${dbTime}ms`);

    if (!resume) {
      log("FETCH_DB", "❌ Resume not found in database");
      logParsingEvent("PARSING_PIPELINE", "unknown", "failed", {
        userId,
        message: "Resume not found in database",
        error: {
          type: "RESUME_NOT_FOUND",
          message: `No resume found for userId: ${userId}`,
        },
      });
      return;
    }

    resumeId = resume.id;
    resumeFileUrl = fileUrl || resume.fileUrl;
    log("FETCH_DB", `✅ Got resumeId: ${resumeId}, fileUrl: ${resumeFileUrl?.substring(0, 50)}...`);

    if (!resumeFileUrl) {
      log("FETCH_DB", "❌ No file URL available");
      logParsingEvent("PARSING_PIPELINE", resumeId, "failed", {
        userId,
        message: "No file URL available",
        error: {
          type: "NO_FILE_URL",
          message: "Cannot parse resume without file URL",
        },
      });
      return;
    }
  } catch (error) {
    log("FETCH_DB", `❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    logParsingEvent("PARSING_PIPELINE", "unknown", "failed", {
      userId,
      message: "Failed to fetch resume metadata",
      error: {
        type: "DATABASE_ERROR",
        message: error instanceof Error ? error.message : String(error),
      },
    });
    return;
  }

  logParsingEvent("PARSING_PIPELINE", resumeId, "start", {
    userId,
    message: "Starting resume parsing pipeline",
  });

  // Step 1: Get file buffer (use provided buffer or download from Cloudinary)
  let fileBuffer: Buffer | null = null;
  
  if (providedFileBuffer) {
    log("FILE_DOWNLOAD", `✅ Using provided file buffer (${providedFileBuffer.length} bytes) - skipping download`);
    fileBuffer = providedFileBuffer;
  } else {
    log("FILE_DOWNLOAD", "Starting file download from Cloudinary...");
    const t1 = Date.now();
    fileBuffer = await downloadFileFromUrl(resumeFileUrl, resumeId, {
      userId,
    });
    const dlTime = Date.now() - t1;

    if (!fileBuffer) {
      log("FILE_DOWNLOAD", `❌ Failed after ${dlTime}ms`);
      logParsingEvent("PARSING_PIPELINE", resumeId, "failed", {
        userId,
        message: "Pipeline aborted - file download failed",
        error: {
          type: "DOWNLOAD_FAILED",
          message: "Could not download resume file from URL",
        },
      });
      return;
    }
    log("FILE_DOWNLOAD", `✅ Downloaded ${fileBuffer.length} bytes in ${dlTime}ms`);
  }

  // Detect MIME type from buffer
  log("MIME_DETECT", "Detecting file MIME type...");
  const mimeType = detectMimeType(fileBuffer);
  if (!mimeType) {
    log("MIME_DETECT", "❌ Could not detect file type");
    logParsingEvent("PARSING_PIPELINE", resumeId, "failed", {
      userId,
      message: "Could not detect file type",
      error: {
        type: "UNKNOWN_FILE_TYPE",
        message: "File format not recognized (expected PDF or DOCX)",
      },
    });
    return;
  }
  log("MIME_DETECT", `✅ Detected MIME type: ${mimeType}`);

  // Step 2: Extract text from document (PDF or DOCX)
  log("TEXT_EXTRACT", `Extracting text from ${mimeType === "application/pdf" ? "PDF" : "DOCX"}...`);
  const t2 = Date.now();
  const resumeText = await extractTextFromDocument(fileBuffer, resumeId, mimeType, {
    userId,
  });
  const extractTime = Date.now() - t2;

  if (!resumeText) {
    log("TEXT_EXTRACT", `⚠️ Text extraction failed after ${extractTime}ms, will attempt fallback`);
    logParsingEvent("PARSING_PIPELINE", resumeId, "info", {
      userId,
      message: "Document extraction failed, will attempt fallback parsing",
    });
  } else {
    log("TEXT_EXTRACT", `✅ Extracted ${resumeText.length} characters in ${extractTime}ms`);
  }

  // Step 2b: Detect resume format and language
  let detectedFormat: ResumeFormat = "UNKNOWN";
  let detectedLanguage: string = "en";

  if (resumeText) {
    detectedFormat = detectResumeFormat(resumeText);
    detectedLanguage = detectLanguage(resumeText);
    log("FORMAT_DETECT", `✅ Detected format: ${detectedFormat}, language: ${detectedLanguage}`);
  }

  // Step 3: Call Gemini LLM (if extraction succeeded)
  let parsedData: ParsedResume | null = null;
  let usedLLM = false;

  if (resumeText) {
    log("LLM_CALL", "Calling Gemini LLM for resume parsing...");
    const t3 = Date.now();
    try {
      const llmResponse = await callGeminiForResumeParsing(resumeText, resumeId, {
        userId,
        format: detectedFormat,
        language: detectedLanguage,
      });
      const llmTime = Date.now() - t3;

      if (llmResponse.success && llmResponse.data) {
        log("LLM_CALL", `✅ LLM call succeeded in ${llmTime}ms`);
        // Step 4: Validate and repair if needed
        log("VALIDATION", "Validating and repairing parsed data...");
        const t4 = Date.now();
        parsedData = await validateAndRepairResume(llmResponse.data, resumeId, {
          userId,
        });
        const validateTime = Date.now() - t4;
        log("VALIDATION", `✅ Validation completed in ${validateTime}ms`);
        usedLLM = true;
      } else {
        log("LLM_CALL", `❌ LLM call failed after ${llmTime}ms`);
      }
    } catch (llmError) {
      const llmTime = Date.now() - t3;
      log("LLM_CALL", `❌ LLM threw: ${llmError instanceof Error ? llmError.message : String(llmError)}`);
      // parsedData remains null, fallback will run below
    }
  }

  // Step 5: Fallback to rule-based parsing if LLM failed
  if (!parsedData) {
    if (resumeText) {
      log("FALLBACK", "LLM parsing failed, attempting rule-based fallback...");
      const t5 = Date.now();
      parsedData = fallbackParsing(resumeText, resumeId, { userId });
      const fallbackTime = Date.now() - t5;
      log("FALLBACK", `✅ Fallback parsing completed in ${fallbackTime}ms`);
      logParsingEvent("PARSING_PIPELINE", resumeId, "info", {
        userId,
        message: "LLM parsing failed, falling back to rule-based extraction",
      });
    } else {
      log("FALLBACK", "❌ No resume text available, all methods failed");
      logParsingEvent("PARSING_PIPELINE", resumeId, "failed", {
        userId,
        message: "All parsing methods failed - no resume text available",
        error: {
          type: "PARSING_FAILED",
          message: "Could not extract or parse resume",
        },
      });
      return;
    }
  }

  // Step 6: Merge with user preferences
  log("MERGE_PREFS", "Merging with user preferences...");
  const t6 = Date.now();
  try {
    const userPrefs = await getPreferences(userId);
    if (userPrefs) {
      const prefData: UserPreferencesData = {
        seniority: userPrefs.seniority,
        locationPreferences: userPrefs.locationPreferences,
      };
      parsedData = mergeWithUserPreferences(parsedData, prefData, resumeId, {
        userId,
      });
      log("MERGE_PREFS", `✅ Preferences merged in ${Date.now() - t6}ms`);
    } else {
      log("MERGE_PREFS", `⚠️ No user preferences found, skipping merge`);
    }
  } catch (error) {
    log("MERGE_PREFS", `⚠️ Error fetching preferences: ${error instanceof Error ? error.message : String(error)}`);
    logParsingEvent("PARSING_PIPELINE", resumeId, "info", {
      userId,
      message: "Could not fetch user preferences, skipping merge",
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
  }

  // Step 7: Update database with parsed data
  log("DB_SAVE", "Saving parsed data to database...");
  const t7 = Date.now();
  try {
    await updateResumeParsedData(userId, parsedData);
    const saveTime = Date.now() - t7;
    const totalTime = Date.now() - startTime;

    log("DB_SAVE", `✅ Data saved in ${saveTime}ms`);
    log("COMPLETE", `✨ Resume parsing completed successfully in ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);

    logParsingEvent("PARSING_PIPELINE", resumeId, "success", {
      userId,
      message: "Resume parsing pipeline completed successfully",
      metadata: {
        usedLLM,
        totalTimeMs: totalTime,
        parsedDataKeys: Object.keys(parsedData).filter(
          (k) => parsedData![k as keyof ParsedResume] != null
        ),
      },
    });
  } catch (error) {
    log("DB_SAVE", `❌ Failed to save: ${error instanceof Error ? error.message : String(error)}`);
    logParsingEvent("PARSING_PIPELINE", resumeId, "failed", {
      userId,
      message: "Failed to save parsed data to database",
      error: {
        type: "DATABASE_ERROR",
        message: error instanceof Error ? error.message : String(error),
      },
    });
  }
};