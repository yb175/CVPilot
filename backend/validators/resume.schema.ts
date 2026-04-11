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
  skills: z.array(z.string()).max(100).nullable(), // Max 100 skills
  currentRole: z.string().nullable(),
  experienceYears: z.number().min(0).max(70).nullable(), // 0-70 years realistic range
  seniority: z.enum(["Intern", "Junior", "Mid", "Senior"]).nullable(),
  location: z.string().nullable(),
  remote: z.boolean().nullable(),
  techStack: z.record(
    z.enum(["frontend", "backend", "database", "cloud", "devops", "other"]),
    z.string()
  ).nullable(),
  projects: z.array(
    z.object({
      name: z.string(),
      description: z.string()
    })
  ).max(50).nullable(), // Max 50 projects
  keywords: z.array(z.string()).max(100).nullable(), // Max 100 keywords
  education: z.object({
    degree: z.string().nullable(),
    institution: z.string().nullable()
  }),
  confidence: z.record(
    z.enum(["name", "skills", "currentRole", "experienceYears", "seniority", "location", "remote", "techStack", "projects", "keywords", "education"]),
    z.number().min(0).max(100)
  ).optional(), // Confidence scores (optional for backward compatibility)
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
