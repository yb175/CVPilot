/**
 * =====================================
 * 📊 Parse Logger - Structured Logging
 * =====================================
 *
 * Centralized logging for all parsing pipeline stages.
 * Outputs JSON structured logs to console.
 */

export interface ParseLogEvent {
  timestamp: string;
  stage: string;
  resumeId: string;
  userId?: string;
  status: "start" | "success" | "failed" | "info";
  message?: string;
  metadata?: Record<string, any>;
  error?: {
    type: string;
    message: string;
    details?: any;
  };
}

/**
 * Log a parsing event with structured JSON format
 */
export const logParsingEvent = (
  stage: string,
  resumeId: string,
  status: "start" | "success" | "failed" | "info",
  options?: {
    userId?: string;
    message?: string;
    metadata?: Record<string, any>;
    error?: {
      type: string;
      message: string;
      details?: any;
    };
  }
): void => {
  const event: ParseLogEvent = {
    timestamp: new Date().toISOString(),
    stage,
    resumeId,
    userId: options?.userId,
    status,
    message: options?.message,
    metadata: options?.metadata,
    error: options?.error,
  };

  // Filter out undefined values
  const cleanEvent = Object.fromEntries(
    Object.entries(event).filter(([, v]) => v !== undefined)
  );

  if (status === "failed") {
    console.error(`[PARSING:${stage}]`, JSON.stringify(cleanEvent));
  } else {
    console.log(`[PARSING:${stage}]`, JSON.stringify(cleanEvent));
  }
};

/**
 * Log LLM request/response metrics
 */
export const logLLMMetrics = (
  resumeId: string,
  options: {
    userId?: string;
    inputTokens?: number;
    outputTokens?: number;
    latencyMs?: number;
    modelUsed?: string;
    attempt?: number;
  }
): void => {
  logParsingEvent("LLM_CALL", resumeId, "info", {
    userId: options.userId,
    message: `LLM metrics: ${options.inputTokens || 0} input tokens, ${options.outputTokens || 0} output tokens`,
    metadata: {
      latencyMs: options.latencyMs,
      modelUsed: options.modelUsed,
      attempt: options.attempt,
    },
  });
};

/**
 * Log PDF extraction metrics
 */
export const logPDFExtractionMetrics = (
  resumeId: string,
  options: {
    userId?: string;
    bytesExtracted?: number;
    charactersExtracted?: number;
    latencyMs?: number;
    truncated?: boolean;
  }
): void => {
  logParsingEvent("PDF_EXTRACT", resumeId, "info", {
    userId: options.userId,
    message: `PDF extraction: ${options.charactersExtracted || 0} characters`,
    metadata: {
      bytesExtracted: options.bytesExtracted,
      charactersExtracted: options.charactersExtracted,
      latencyMs: options.latencyMs,
      truncated: options.truncated,
    },
  });
};

/**
 * Log validation result
 */
export const logValidationResult = (
  resumeId: string,
  options: {
    userId?: string;
    valid: boolean;
    errors?: string[];
    repairAttempted?: boolean;
    repairSuccessful?: boolean;
  }
): void => {
  logParsingEvent("VALIDATION", resumeId, options.valid ? "success" : "failed", {
    userId: options.userId,
    message: options.valid ? "Validation passed" : "Validation failed",
    metadata: {
      errors: options.errors,
      repairAttempted: options.repairAttempted,
      repairSuccessful: options.repairSuccessful,
    },
  });
};
