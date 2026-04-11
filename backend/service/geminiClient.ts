import { GoogleGenerativeAI } from "@google/generative-ai";
import { logParsingEvent, logLLMMetrics } from "../lib/parseLogger.js";
import { RESUME_PARSING_PROMPT, RESUME_REPAIR_PROMPT } from "../prompt/parser_prompt.js";
import { LLMCallOptions, LLMResponse } from "./types/parsing.js";

/**
 * =====================================
 * 🤖 Gemini Client Wrapper
 * =====================================
 *
 * Wrapper for Google Generative AI (Gemini API)
 * Handles resume parsing with retry and repair logic.
 */

const DEFAULT_MAX_RETRIES = 1; // 1 initial + 1 repair = 2 total attempts
const DEFAULT_TIMEOUT_MS = 45000;
const MODEL_NAME = "gemini-2.5-flash";

let genAI: GoogleGenerativeAI | null = null;

/**
 * Initialize Gemini client (called once on server startup)
 */
export const initializeGeminiClient = (): void => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }
  genAI = new GoogleGenerativeAI(apiKey);
  console.log("[Gemini] Client initialized successfully");
};

/**
 * Check if Gemini client is initialized
 */
export const isGeminiInitialized = (): boolean => {
  return genAI !== null;
};

/**
 * Call Gemini API for resume parsing
 * Includes retry logic for JSON parse errors
 *
 * @param resumeText - Extracted text from resume PDF
 * @param resumeId - Resume identifier for logging
 * @param options - Call options (retries, timeout)
 * @returns LLM response with parsed JSON
 */
export const callGeminiForResumeParsing = async (
  resumeText: string,
  resumeId: string,
  options?: LLMCallOptions & { userId?: string }
): Promise<LLMResponse> => {
  if (!genAI) {
    throw new Error("Gemini client not initialized. Call initializeGeminiClient() first.");
  }

  const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
  const timeout = options?.timeout ?? DEFAULT_TIMEOUT_MS;

  logParsingEvent("LLM_CALL", resumeId, "start", {
    userId: options?.userId,
    message: "Starting Gemini API call for resume parsing",
  });

  // First attempt: Parse resume
  const firstAttempt = await callGemini(
    RESUME_PARSING_PROMPT.replace("${resumeText}", resumeText),
    resumeId,
    1,
    timeout,
    options?.userId
  );

  if (firstAttempt.success) {
    return firstAttempt;
  }

  // If first attempt failed and we have retries, attempt repair
  if (maxRetries > 0 && firstAttempt.rawText) {
    logParsingEvent("LLM_CALL", resumeId, "info", {
      userId: options?.userId,
      message: "First attempt failed, attempting repair...",
      metadata: { attempt: 1 },
    });

    const repairPrompt = RESUME_REPAIR_PROMPT.replace(
      "${invalidJson}",
      firstAttempt.rawText
    ).replace("${errors}", "Invalid JSON format - unable to parse");

    const repairAttempt = await callGemini(
      repairPrompt,
      resumeId,
      2,
      timeout,
      options?.userId
    );

    if (repairAttempt.success) {
      logParsingEvent("LLM_CALL", resumeId, "success", {
        userId: options?.userId,
        message: "Resume parsing successful after repair attempt",
        metadata: { repaired: true },
      });
      return repairAttempt;
    }

    // Repair also failed
    logParsingEvent("LLM_CALL", resumeId, "failed", {
      userId: options?.userId,
      message: "Repair attempt also failed",
      error: {
        type: "LLM_REPAIR_FAILED",
        message: "Could not repair invalid JSON from LLM",
        details: { rawOutput: firstAttempt.rawText },
      },
    });

    return {
      success: false,
      error: "Could not repair JSON from LLM after repair attempt",
      rawText: firstAttempt.rawText,
    };
  }

  return firstAttempt;
};

/**
 * Internal: Call Gemini API with timeout
 */
async function callGemini(
  prompt: string,
  resumeId: string,
  attempt: number,
  timeout: number,
  userId?: string
): Promise<LLMResponse> {
  const startTime = Date.now();

  try {
    const model = genAI!.getGenerativeModel({ model: MODEL_NAME });

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("LLM_CALL_TIMEOUT")), timeout)
    );

    // Call API with timeout
    const responsePromise = model.generateContent(prompt);
    const response = await Promise.race([responsePromise, timeoutPromise]);

    const latencyMs = Date.now() - startTime;
    const text =
      response.response.candidates?.[0]?.content?.parts?.[0]?.text || "";

    logLLMMetrics(resumeId, {
      userId,
      latencyMs,
      modelUsed: MODEL_NAME,
      attempt,
    });

    // Try to parse JSON
    try {
      // Strip markdown code blocks if present (LLM sometimes wraps JSON in ```json...```)
      let jsonText = text.trim();
      const jsonCodeBlockMatch = jsonText.match(/^```(?:json)?\n?([\s\S]*)\n?```$/);
      if (jsonCodeBlockMatch) {
        jsonText = jsonCodeBlockMatch[1].trim();
      }
      
      const parsed = JSON.parse(jsonText);
      logParsingEvent("LLM_CALL", resumeId, "success", {
        userId,
        message: `LLM call successful (attempt ${attempt})`,
        metadata: { attempt },
      });
      return {
        success: true,
        data: parsed,
        rawText: text,
      };
    } catch (parseError) {
      // JSON parsing failed - return raw text for repair attempt
      logParsingEvent("LLM_CALL", resumeId, "info", {
        userId,
        message: `LLM returned invalid JSON (attempt ${attempt})`,
        metadata: {
          attempt,
          parseError: parseError instanceof Error ? parseError.message : String(parseError),
        },
      });

      return {
        success: false,
        error: "JSON parsing failed",
        rawText: text,
      };
    }
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorType =
      error instanceof Error && error.message === "LLM_CALL_TIMEOUT"
        ? "LLM_CALL_TIMEOUT"
        : "LLM_CALL_ERROR";

    logParsingEvent("LLM_CALL", resumeId, "failed", {
      userId,
      message: `LLM call failed on attempt ${attempt}`,
      error: {
        type: errorType,
        message: error instanceof Error ? error.message : String(error),
        details: { attempt, latencyMs },
      },
    });

    return {
      success: false,
      error: `LLM call failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
