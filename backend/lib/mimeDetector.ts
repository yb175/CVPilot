/**
 * =====================================
 * 🔍 File Type Detection Utility
 * =====================================
 *
 * Detects MIME type from file buffer (magic bytes).
 * Used to route to appropriate document extractor.
 */

/**
 * Detect MIME type from file buffer by checking magic bytes (file signature)
 *
 * @param buffer - File buffer
 * @returns MIME type string or null if unknown
 */
export const detectMimeType = (buffer: Buffer): string | null => {
  if (buffer.length < 4) {
    return null;
  }

  // PDF: 0x25 0x50 0x44 0x46 (%PDF)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return "application/pdf";
  }

  // DOCX / Office Open XML: 0x50 0x4b 0x03 0x04 (PK..)
  // This is ZIP format, but DOCX is specifically ZIP with docProps/document.xml
  if (
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  ) {
    // Could be DOCX, XLSX, PPTX, or generic ZIP
    // For now, assume it's DOCX if it has the right structure
    // A proper check would require opening the ZIP and checking for document.xml
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }

  // Unknown format
  return null;
};
