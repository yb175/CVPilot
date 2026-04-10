/**
 * =====================================
 * 📄 Parsing Trigger (Stub / Placeholder)
 * =====================================
 *
 * This function signals the future parsing system that a resume
 * is ready for processing.
 *
 * CURRENT STATE:
 * - This is a stub (no real parsing yet)
 * - In future, this will push to a queue (BullMQ / Redis)
 *   or call a separate microservice
 *
 * IMPORTANT:
 * - This must remain non-blocking
 * - Must NEVER throw to the controller
 */

export const triggerResumeParsing = async (
    userId: string,
    fileUrl?: string
  ): Promise<void> => {
    try {
      console.log(
        `[ParsingTrigger] Queued parsing for userId: ${userId}`,
        fileUrl ? `fileUrl: ${fileUrl}` : ""
      );
  
      // TODO: Replace with actual queue system (BullMQ / Kafka / etc.)
    } catch (error) {
      console.error("[ParsingTrigger] Failed to trigger parsing:", error);
    }
  };