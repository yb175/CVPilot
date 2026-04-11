import { z } from "zod";
import type { NormalizedJob } from "./jobNormalizer.js";

const NormalizedJobSchema = z.object({
  title: z.string().min(1, "Title required"),
  company: z.string().min(1, "Company required"),
  location: z.string().min(1, "Location required"),
  description: z.string(),
  source: z.enum(["adzuna", "greenhouse", "lever", "remotive"]),
  externalId: z.string().min(1, "External ID required"),
  skills: z.array(z.string()),
  rawData: z.record(z.string(), z.any()),
});

export function validateJob(job: NormalizedJob): { valid: boolean; errors?: string[] } {
  const result = NormalizedJobSchema.safeParse(job);

  if (!result.success) {
    return {
      valid: false,
      errors: result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
    };
  }

  return { valid: true };
}