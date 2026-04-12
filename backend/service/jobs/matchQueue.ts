import { randomUUID } from "crypto";
import type { MatchResult, NormalizedJob } from "../types/parsing.js";
import { logger } from "../../lib/logger.js";

/**
 * Queue item for async job matching
 */
interface QueueItem {
  queueId: string;
  userId: number;
  jobs: NormalizedJob[];
  status: "queued" | "processing" | "completed" | "failed";
  results?: MatchResult[];
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

/**
 * In-memory queue for async job matching
 */
class MatchQueue {
  private queue: Map<string, QueueItem> = new Map();
  private processing = false;
  private maxQueueSize = 1000;

  /**
   * Enqueue a new matching job
   */
  enqueue(userId: number, jobs: NormalizedJob[]): string {
    const queueId = randomUUID();

    // Prevent unbounded queue growth
    if (this.queue.size >= this.maxQueueSize) {
      throw new Error("Queue is full");
    }

    const item: QueueItem = {
      queueId,
      userId,
      jobs,
      status: "queued",
      createdAt: new Date(),
    };

    this.queue.set(queueId, item);

    logger.info("MATCH_QUEUED", {
      queueId,
      userId,
      jobCount: jobs.length,
    });

    // Non-blocking: start processing if not already running
    if (!this.processing) {
      setImmediate(() => this.processQueue().catch(() => {})); // Fire and forget
    }

    return queueId;
  }

  /**
   * Get queue item status
   */
  getStatus(queueId: string): QueueItem | null {
    return this.queue.get(queueId) || null;
  }

  /**
   * Update queue item with results
   */
  setResults(queueId: string, results: MatchResult[]): void {
    const item = this.queue.get(queueId);
    if (item) {
      item.status = "completed";
      item.results = results;
      item.completedAt = new Date();

      logger.info("MATCH_COMPLETED", {
        queueId,
        jobCount: results.length,
        duration: item.completedAt.getTime() - item.createdAt.getTime(),
      });
    }
  }

  /**
   * Mark queue item as failed
   */
  setError(queueId: string, error: string): void {
    const item = this.queue.get(queueId);
    if (item) {
      item.status = "failed";
      item.error = error;
      item.completedAt = new Date();

      logger.error("MATCH_FAILED", {
        queueId,
        error,
        duration: item.completedAt.getTime() - item.createdAt.getTime(),
      });
    }
  }

  /**
   * Process queue items (background worker)
   * This would be called periodically or triggered by events
   */
  async processQueue(): Promise<void> {
    if (this.processing) return;

    this.processing = true;

    try {
      for (const [queueId, item] of this.queue.entries()) {
        if (item.status === "queued") {
          item.status = "processing";

          logger.info("MATCH_PROCESSING", {
            queueId,
            userId: item.userId,
            jobCount: item.jobs.length,
          });

          // Here, we would call the actual matching logic
          // For now, this is a placeholder
          // In real implementation, this would call matchJobsWithLLM / regex
          // and then call setResults or setError

          // Simulate async work
          await new Promise((resolve) => setTimeout(resolve, 100));

          // This is where results would be set:
          // this.setResults(queueId, results);
        }
      }
    } catch (error) {
      logger.error("QUEUE_PROCESSING_ERROR", {
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.processing = false;
    }
  }

  /**
   * Clean up old completed items (older than 1 hour)
   */
  cleanup(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    let removed = 0;

    for (const [queueId, item] of this.queue.entries()) {
      if (
        item.completedAt &&
        item.completedAt.getTime() < oneHourAgo
      ) {
        this.queue.delete(queueId);
        removed++;
      }
    }

    if (removed > 0) {
      logger.info("QUEUE_CLEANUP", { itemsRemoved: removed });
    }
  }

  /**
   * Get queue stats
   */
  getStats() {
    let queued = 0;
    let processing = 0;
    let completed = 0;
    let failed = 0;

    for (const item of this.queue.values()) {
      if (item.status === "queued") queued++;
      else if (item.status === "processing") processing++;
      else if (item.status === "completed") completed++;
      else if (item.status === "failed") failed++;
    }

    return {
      size: this.queue.size,
      queued,
      processing,
      completed,
      failed,
    };
  }
}

// Singleton instance
const matchQueue = new MatchQueue();

// Periodic cleanup (every 30 minutes)
setInterval(() => {
  matchQueue.cleanup();
}, 30 * 60 * 1000);

export function enqueueMatchJob(userId: number, jobs: NormalizedJob[]): string {
  return matchQueue.enqueue(userId, jobs);
}

export function getQueueStatus(queueId: string): QueueItem | null {
  return matchQueue.getStatus(queueId);
}

export function setQueueResults(queueId: string, results: MatchResult[]): void {
  matchQueue.setResults(queueId, results);
}

export function setQueueError(queueId: string, error: string): void {
  matchQueue.setError(queueId, error);
}

export function getQueueStats() {
  return matchQueue.getStats();
}

export async function processQueue(): Promise<void> {
  return matchQueue.processQueue();
}
