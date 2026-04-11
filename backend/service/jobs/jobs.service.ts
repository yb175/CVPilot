import prisma from "../../lib/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";

export interface CreateJobInput {
  title: string;
  company: string;
  location: string;
  description: string;
  source: string;
  externalId: string;
  skills: string[];
  rawData: Prisma.InputJsonValue;
}

/**
 * Create or update a job record
 * Upserts by externalId + source to prevent duplicates
 */
export async function upsertJob(data: CreateJobInput) {
  try {
    return await prisma.job.upsert({
      where: {
        externalId_source: {
          externalId: data.externalId,
          source: data.source,
        },
      },
      create: {
        title: data.title,
        company: data.company,
        location: data.location,
        description: data.description,
        source: data.source,
        externalId: data.externalId,
        skills: data.skills,
        rawData: data.rawData,
      },
      update: {
        title: data.title,
        company: data.company,
        location: data.location,
        description: data.description,
        skills: data.skills,
        rawData: data.rawData,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Job upsert error:", error);
    throw new Error("Failed to upsert job");
  }
}

/**
 * Get job by job_id
 */
export async function getJobById(jobId: string) {
  try {
    return await prisma.job.findUnique({
      where: { job_id: jobId },
    });
  } catch (error) {
    console.error("Job fetch error:", error);
    throw new Error("Failed to fetch job");
  }
}

/**
 * Get jobs by source
 */
export async function getJobsBySource(source: string) {
  try {
    return await prisma.job.findMany({
      where: { source },
    });
  } catch (error) {
    console.error("Jobs fetch error:", error);
    throw new Error("Failed to fetch jobs");
  }
}