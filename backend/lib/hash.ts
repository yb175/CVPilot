import crypto from "crypto";

/**
 * Generates a SHA-256 hash from a given file buffer.
 *
 * This function is used to detect changes in uploaded files.
 * The same file content will always produce the same hash,
 * while different content will produce a different hash.
 *
 * @param buffer - The file content as a Buffer (from Multer memory storage)
 * @returns A hexadecimal string representing the SHA-256 hash
 */

export const generateFileHash = (buffer: Buffer): string => {
  return crypto.createHash("sha256").update(buffer).digest("hex");
};
