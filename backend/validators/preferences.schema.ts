import { z } from "zod"

// POST schema: seniority is required, locationPreferences must be non-empty
const createPreferencesSchema = z.object({
  seniority: z.enum(["INTERN", "FULLTIME"]),
  locationPreferences: z.array(z.enum(["REMOTE", "ONSITE", "HYBRID"])).min(1, "At least one location preference is required")
}).strict()

// PATCH schema: both fields optional, locationPreferences must be non-empty if provided
const patchPreferencesSchema = z.object({
  seniority: z.enum(["INTERN", "FULLTIME"]).optional(),
  locationPreferences: z.array(z.enum(["REMOTE", "ONSITE", "HYBRID"])).min(1, "At least one location preference is required").optional()
}).strict()

export const preferencesSchema = {
  body: createPreferencesSchema
}

export const patchSchema = {
  body: patchPreferencesSchema
}