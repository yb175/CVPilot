import { ParsedResume } from "../validators/resume.schema.js";
import { logParsingEvent } from "../lib/parseLogger.js";

/**
 * =====================================
 * 🔀 Preference Merger Service
 * =====================================
 *
 * Merges parsed resume data with user preferences.
 * User preferences fill gaps but don't override parsed data.
 */

export interface UserPreferencesData {
  seniority?: "INTERN" | "FULLTIME";
  locationPreferences?: string[];
  [key: string]: any;
}

/**
 * Merge parsed resume with user preferences
 * Strategy: Parsed data is primary; user prefs fill gaps only
 *
 * @param parsed - Parsed resume data from LLM/fallback
 * @param userPrefs - User's saved preferences
 * @param resumeId - Resume identifier for logging
 * @returns Merged ParsedResume with preferences filled in
 */
export const mergeWithUserPreferences = (
  parsed: ParsedResume,
  userPrefs: UserPreferencesData | null,
  resumeId: string,
  options?: { userId?: string }
): ParsedResume => {
  if (!userPrefs) {
    return parsed;
  }

  const merged = { ...parsed };
  const overrides: string[] = [];

  logParsingEvent("PREFERENCES_MERGE", resumeId, "start", {
    userId: options?.userId,
    message: "Merging user preferences with parsed data",
  });

  // Merge seniority if parsed is null
  if (!merged.seniority && userPrefs.seniority) {
    merged.seniority = userPrefs.seniority === "INTERN" ? "Intern" : "Senior";
    overrides.push("seniority");
  }

  // Merge location if parsed is null
  if (!merged.location && userPrefs.locationPreferences?.length) {
    merged.location = userPrefs.locationPreferences[0];
    overrides.push("location");
  }

  // If no remote status from parsed, try to infer from location prefs
  if (merged.remote === null && userPrefs.locationPreferences) {
    const hasRemote = userPrefs.locationPreferences.includes("REMOTE");
    if (hasRemote) {
      merged.remote = true;
      overrides.push("remote");
    }
  }

  if (overrides.length > 0) {
    logParsingEvent("PREFERENCES_MERGE", resumeId, "success", {
      userId: options?.userId,
      message: "Preferences merged successfully",
      metadata: {
        fieldsOverridden: overrides,
      },
    });
  }

  return merged;
};
