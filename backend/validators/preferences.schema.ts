import { z } from "zod"

const preferences = z.object({
seniority: z.enum(["INTERN", "FULLTIME"]).optional(),
locationPreferences: z.array(z.enum(["REMOTE", "ONSITE", "HYBRID"])).optional()
}).strict()

export const preferencesSchema = {
    body: preferences
}