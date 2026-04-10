import { logParsingEvent } from "../lib/parseLogger.js";
import cloudinary from "../config/cloudinary.js";

/**
 * =====================================
 * 📥 File Downloader Service
 * =====================================
 *
 * Download files from Cloudinary URLs
 * with timeout and error handling.
 */

const DEFAULT_TIMEOUT_MS = 60000; // 60 seconds
const DEFAULT_MAX_RETRIES = 1;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB safety limit

/**
 * Download file from URL (typically Cloudinary)
 *
 * @param fileUrl - URL to download from
 * @param resumeId - Resume identifier for logging
 * @param options - Download options
 * @returns File buffer or null if download fails
 */
export const downloadFileFromUrl = async (
  fileUrl: string,
  resumeId: string,
  options?: {
    userId?: string;
    timeout?: number;
    maxRetries?: number;
  }
): Promise<Buffer | null> => {
  const timeout = options?.timeout ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
  let lastError: Error | null = null;

  logParsingEvent("FILE_DOWNLOAD", resumeId, "start", {
    userId: options?.userId,
    message: `Starting file download from Cloudinary`,
    metadata: { fileUrl: sanitizeUrl(fileUrl) },
  });

  // Extract public_id from fileUrl
  // URL format: https://res.cloudinary.com/{cloud}/image/upload/v{version}/{public_id}
  let publicId: string | null = null;
  try {
    const urlParts = fileUrl.split("/upload/");
    if (urlParts.length > 1) {
      const pathParts = urlParts[1].split("/");
      // Skip version folder (v123456) and get the rest as public_id
      const pathWithoutVersion = pathParts.slice(1).join("/");
      publicId = pathWithoutVersion.split(".")[0]; // Remove file extension
    }
  } catch (e) {
    logParsingEvent("FILE_DOWNLOAD", resumeId, "info", {
      userId: options?.userId,
      message: "Could not extract public_id from URL, falling back to direct fetch",
    });
  }

  // Try using Cloudinary API first if we extracted public_id
  if (publicId) {
    try {
      logParsingEvent("FILE_DOWNLOAD", resumeId, "info", {
        userId: options?.userId,
        message: "Attempting download using Cloudinary API",
        metadata: { publicId },
      });

      const resource = await cloudinary.api.resource(publicId);
      
      // Use the authenticated URL from the API response
      const authenticatedUrl = resource.secure_url;
      
      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(authenticatedUrl, {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const latencyMs = Date.now() - startTime;

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentLength = response.headers.get("content-length");
        if (contentLength && parseInt(contentLength, 10) > MAX_FILE_SIZE) {
          throw new Error(`File size exceeds maximum (${MAX_FILE_SIZE} bytes)`);
        }

        const buffer = await response.arrayBuffer();
        const bufferSize = buffer.byteLength;

        logParsingEvent("FILE_DOWNLOAD", resumeId, "success", {
          userId: options?.userId,
          message: `File downloaded successfully via Cloudinary API (${bufferSize} bytes)`,
          metadata: {
            bufferSize,
            latencyMs,
            method: "cloudinary_api",
          },
        });

        return Buffer.from(buffer);
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error instanceof TypeError && error.name === "AbortError") {
          lastError = new Error(`Download timeout (>${timeout}ms)`);
        } else {
          lastError = error instanceof Error ? error : new Error(String(error));
        }

        logParsingEvent("FILE_DOWNLOAD", resumeId, "info", {
          userId: options?.userId,
          message: "Cloudinary API download failed, falling back to direct fetch",
          metadata: { error: lastError.message },
        });
      }
    } catch (error) {
      logParsingEvent("FILE_DOWNLOAD", resumeId, "info", {
        userId: options?.userId,
        message: "Cloudinary API lookup failed, falling back to direct fetch",
        metadata: { 
          error: error instanceof Error ? error.message : String(error),
          publicId
        },
      });
    }
  }

  // Fallback: Try direct fetch from the URL
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const startTime = Date.now();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(fileUrl, {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const latencyMs = Date.now() - startTime;

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentLength = response.headers.get("content-length");
        if (contentLength && parseInt(contentLength, 10) > MAX_FILE_SIZE) {
          throw new Error(`File size exceeds maximum (${MAX_FILE_SIZE} bytes)`);
        }

        const buffer = await response.arrayBuffer();
        const bufferSize = buffer.byteLength;

        logParsingEvent("FILE_DOWNLOAD", resumeId, "success", {
          userId: options?.userId,
          message: `File downloaded successfully via direct fetch (${bufferSize} bytes)`,
          metadata: {
            bufferSize,
            latencyMs,
            attempt,
            method: "direct_fetch",
          },
        });

        return Buffer.from(buffer);
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof TypeError && error.name === "AbortError") {
          lastError = new Error(`Download timeout (>${timeout}ms)`);
        } else {
          lastError = error instanceof Error ? error : new Error(String(error));
        }

        if (attempt < maxRetries + 1) {
          logParsingEvent("FILE_DOWNLOAD", resumeId, "info", {
            userId: options?.userId,
            message: `Download attempt ${attempt} failed, retrying...`,
            metadata: {
              error: lastError.message,
              attempt,
            },
          });
        }
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  // All retries exhausted
  logParsingEvent("FILE_DOWNLOAD", resumeId, "failed", {
    userId: options?.userId,
    message: `File download failed after ${maxRetries + 1} attempts`,
    error: {
      type: "FILE_DOWNLOAD_FAILED",
      message: lastError?.message || "Unknown error",
      details: {
        maxRetries,
        fileUrl: sanitizeUrl(fileUrl),
      },
    },
  });

  return null;
};

/**
 * Sanitize URL for logging (remove sensitive params if any)
 */
function sanitizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Keep domain and path, remove query params for security
    return `${urlObj.origin}${urlObj.pathname}`;
  } catch {
    return "[invalid-url]";
  }
}
