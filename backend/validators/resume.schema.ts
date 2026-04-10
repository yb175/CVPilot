import { z } from "zod";

/**
 * =====================================
 * 📋 Resume Parsing Schema (Zod)
 * =====================================
 *
 * STRICT schema for parsed resume data.
 * - No extra fields allowed
 * - Missing fields must be null or empty arrays
 * - Types must match exactly
 */

export const ParsedResumeSchema = z.object({
  name: z.string().nullable(),
  skills: z.array(z.string()).nullable(),
  currentRole: z.string().nullable(),
  experienceYears: z.number().nullable(),
  seniority: z.enum(["Intern", "Junior", "Mid", "Senior"]).nullable(),
  location: z.string().nullable(),
  remote: z.boolean().nullable(),
  techStack: z.record(z.string(), z.any()).nullable(),
  projects: z.array(z.any()).nullable(),
  keywords: z.array(z.string()).nullable(),
  education: z.record(z.string(), z.any()).nullable(),
}).strict();

export type ParsedResume = z.infer<typeof ParsedResumeSchema>;

/**
 * Input schema - allows unknown fields from LLM,
 * will be cleaned by transformer
 */
export const ParsedResumeInputSchema = z.unknown();

/**
 * Validate and clean parsed resume data
 * Throws Zod errors if validation fails
 */
export const validateParsedResume = (data: unknown): ParsedResume => {
  return ParsedResumeSchema.parse(data);
};
