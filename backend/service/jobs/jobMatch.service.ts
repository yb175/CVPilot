import prisma from "../../lib/prisma.js";

/**
 * Upsert a job match record
 * Validates both userId and jobId exist before writing
 * Upserts by composite key (userId + jobId)
 */
export async function upsertJobMatch(
  userId: number,
  jobId: string,
  score: string,
  reason: string
) {
  try {
    // ✅ Validate user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // ✅ Validate job exists
    const job = await prisma.job.findUnique({
      where: { job_id: jobId },
    });

    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    // ✅ Upsert job match
    return await prisma.job_match.upsert({
      where: {
        userId_jobId: {
          userId,
          jobId,
        },
      },
      create: {
        userId,
        jobId,
        score,
        reason,
      },
      update: {
        score,
        reason,
      },
    });
  } catch (error) {
    console.error("Job match upsert error:", error);
    throw new Error("Failed to upsert job match");
  }
}

/**
 * Get all job matches for a user
 */
export async function getJobMatchesByUserId(userId: number) {
  try {
    return await prisma.job_match.findMany({
      where: { userId },
      include: {
        job: true,
      },
    });
  } catch (error) {
    console.error("Job matches fetch error:", error);
    throw new Error("Failed to fetch job matches");
  }
}

/**
 * Delete a job match
 */
export async function deleteJobMatch(userId: number, jobId: string) {
  try {
    return await prisma.job_match.delete({
      where: {
        userId_jobId: {
          userId,
          jobId,
        },
      },
    });
  } catch (error) {
    console.error("Job match delete error:", error);
    throw new Error("Failed to delete job match");
  }
}