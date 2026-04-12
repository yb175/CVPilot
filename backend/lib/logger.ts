/**
 * =====================================
 * 🔍 Simple Logger Wrapper
 * =====================================
 * 
 * Unified logging interface for job matching and ATS services
 **/

/**
 * Simple logger with info, warn, error, debug methods
 */
export const logger = {
  info: (event: string, data?: Record<string, any>) => {
    console.log(
      `[INFO:${event}] ${JSON.stringify(data || {})}`
    );
  },

  warn: (event: string, data?: Record<string, any>) => {
    console.warn(
      `[WARN:${event}] ${JSON.stringify(data || {})}`
    );
  },

  error: (event: string, data?: Record<string, any>) => {
    console.error(
      `[ERROR:${event}] ${JSON.stringify(data || {})}`
    );
  },

  debug: (event: string, data?: Record<string, any>) => {
    if (process.env.DEBUG) {
      console.log(
        `[DEBUG:${event}] ${JSON.stringify(data || {})}`
      );
    }
  },
};
