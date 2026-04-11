import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";

const MAX_RETRIES = 3;
const UPLOAD_TIMEOUT = 120000; // 120 seconds - increased for large files

// Uploads a resume file buffer to Cloudinary using a stream-based approach (avoids disk storage)
export const uploadResume = (
  buffer: Buffer,
  mimeType: string,
  retryCount = 0
): Promise<{ secureUrl: string; publicId: string }> => {
  return new Promise((resolve, reject) => {
    const fileSizeMB = (buffer.byteLength / 1024 / 1024).toFixed(2);
    console.log(`[Cloudinary Upload] Starting upload (${fileSizeMB} MB, attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);
    
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "cvpilot/resumes",
        resource_type: "auto",
        type: "upload",  // Allows public access to the file
        timeout: 120000, // Cloudinary SDK timeout
      },
      (error, result) => {
        if (error) {
          console.error(`[Cloudinary Upload] Error (attempt ${retryCount + 1}/${MAX_RETRIES + 1}):`, error.message);
          
          // Retry on network/transient errors
          if (retryCount < MAX_RETRIES && isRetryableError(error)) {
            const delayMs = Math.min(1000 * Math.pow(2, retryCount), 8000); // Exponential backoff
            console.log(`[Cloudinary Upload] Retrying in ${delayMs}ms...`);
            setTimeout(() => {
              uploadResume(buffer, mimeType, retryCount + 1).then(resolve).catch(reject);
            }, delayMs);
            return;
          }
          
          return reject(
            new Error(`Failed to upload resume to Cloudinary: ${error.message}`)
          );
        }

        if (!result) {
          const noResultError = new Error("Cloudinary returned no result");
          console.error("[Cloudinary Upload] Error:", noResultError.message);
          return reject(noResultError);
        }

        console.log(`[Cloudinary Upload] Success: ${result.public_id} (${fileSizeMB} MB)`);
        resolve({
          secureUrl: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    // Handle stream errors
    uploadStream.on("error", (error) => {
      console.error(`[Cloudinary Upload Stream] Error:`, error.message);
      if (retryCount < MAX_RETRIES && isRetryableError(error)) {
        const delayMs = Math.min(1000 * Math.pow(2, retryCount), 8000);
        console.log(`[Cloudinary Upload] Retrying stream error in ${delayMs}ms...`);
        setTimeout(() => {
          uploadResume(buffer, mimeType, retryCount + 1).then(resolve).catch(reject);
        }, delayMs);
        return;
      }
      reject(new Error(`Stream error during upload: ${error.message}`));
    });

    // Set timeout for upload
    const timeout = setTimeout(() => {
      uploadStream.destroy();
      const timeoutError = new Error("Upload timeout after 120s");
      console.error("[Cloudinary Upload] Timeout after 120s");
      if (retryCount < MAX_RETRIES) {
        const delayMs = Math.min(1000 * Math.pow(2, retryCount), 8000);
        console.log(`[Cloudinary Upload] Retrying after timeout in ${delayMs}ms...`);
        setTimeout(() => {
          uploadResume(buffer, mimeType, retryCount + 1).then(resolve).catch(reject);
        }, delayMs);
        return;
      }
      reject(timeoutError);
    }, UPLOAD_TIMEOUT);

    uploadStream.on("finish", () => clearTimeout(timeout));

    const readStream = streamifier.createReadStream(buffer);
    
    readStream.on("error", (error) => {
      console.error("[Cloudinary Read Stream] Error:", error.message);
      reject(error);
    });

    readStream.pipe(uploadStream);
  });
};

function isRetryableError(error: any): boolean {
  const message = (error.message || "").toLowerCase();
  const code = error.code || "";
  
  // Retry on network errors, timeouts, and TLS errors
  return (
    code === "ECONNRESET" ||
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT" ||
    code === "EHOSTUNREACH" ||
    message.includes("socket hang up") ||
    message.includes("tls") ||
    message.includes("socket") ||
    message.includes("timeout") ||
    message.includes("request timeout") ||
    message.includes("network") ||
    message.includes("eai_again") ||
    (error.http_code && error.http_code >= 500) // Server errors
  );
}

export const deleteResume = async (publicId: string): Promise<void> => {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      throw new Error("Failed to delete resume from Cloudinary");
    }
  };