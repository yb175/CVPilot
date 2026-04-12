import type { MatchResult } from "../types/parsing.js";
import { logger } from "../../lib/logger.js";

/**
 * In-memory cache for job match results
 * Key: "${userId}:${jobId}"
 * Value: MatchResult
 */
class MatchCache {
  private cache: Map<string, MatchResult> = new Map();
  private maxEntries = 10000; // Prevent unbounded growth

  /**
   * Get result from cache
   */
  get(userId: number, jobId: string | undefined): MatchResult | null {
    if (!jobId) return null;
    const key = this.buildKey(userId, jobId as string);
    const result = this.cache.get(key);

    if (result) {
      logger.debug("CACHE_HIT", { userId, jobId });
      return result;
    }

    return null;
  }

  /**
   * Set result in cache
   */
  set(userId: number, jobId: string | undefined, result: MatchResult): void {
    if (!jobId) return;
    const key = this.buildKey(userId, jobId as string);

    // Simple LRU: if at max, delete oldest entry
    if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, result);
    logger.debug("CACHE_SET", { userId, jobId, cacheSize: this.cache.size });
  }

  /**
   * Invalidate all entries for a user
   * Call when user updates resume or preferences
   */
  invalidateUser(userId: number): void {
    let invalidatedCount = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        this.cache.delete(key);
        invalidatedCount++;
      }
    }

    logger.info("CACHE_INVALIDATED_USER", {
      userId,
      entriesRemoved: invalidatedCount,
    });
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    logger.info("CACHE_CLEARED", { entriesRemoved: size });
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxEntries: number } {
    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
    };
  }

  private buildKey(userId: number, jobId: string): string {
    return `${userId}:${jobId}`;
  }
}

// Singleton instance
const matchCache = new MatchCache();

export function getFromCache(userId: number, jobId: string): MatchResult | null {
  return matchCache.get(userId, jobId);
}

export function setInCache(userId: number, jobId: string, result: MatchResult): void {
  matchCache.set(userId, jobId, result);
}

export function invalidateUserCache(userId: number): void {
  matchCache.invalidateUser(userId);
}

export function clearCache(): void {
  matchCache.clear();
}

export function getCacheStats() {
  return matchCache.getStats();
}
