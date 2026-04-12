import prisma from "../../lib/prisma.js";

/**
 * Upsert a job match record
 * Validates both userId and jobId exist before writing
 * Upserts by composite key (userId + jobId)
 */
export async function upsertJobMatch(
  userId: number,
  jobId: string,
  score: number,
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

/**
 * Persist multiple match results to database
 * Upserts each match by composite key (userId + jobId)
 * Includes confidence score in new updates
 */
export async function persistMatchResults(
  userId: number,
  results: Array<{
    jobId: string;
    score: number;
    confidence: number;
    reason: string;
  }>
) {
  try {
    const promises = results.map((result) =>
      prisma.job_match.upsert({
        where: {
          userId_jobId: {
            userId,
            jobId: result.jobId,
          },
        },
        create: {
          userId,
          jobId: result.jobId,
          score: result.score,
          confidence: result.confidence,
          reason: result.reason,
        },
        update: {
          score: result.score,
          confidence: result.confidence,
          reason: result.reason,
          updatedAt: new Date(),
        },
      })
    );

    return await Promise.all(promises);
  } catch (error) {
    console.error("Persist match results error:", error);
    throw new Error("Failed to persist match results");
  }
}

/**
 * Get matched jobs for a user, sorted by score (descending)
 * Optionally filter by minimum confidence
 */
export async function getMatchedJobs(userId: number, minConfidence?: number) {
  try {
    const matches = await prisma.job_match.findMany({
      where: {
        userId,
        ...(minConfidence !== undefined && {
          confidence: {
            gte: minConfidence,
          },
        }),
      },
      include: {
        job: true,
      },
      orderBy: {
        score: "desc",
      },
    });

    // Attach match metadata to each job
    return matches.map((match) => ({
      ...match.job,
      matchScore: match.score,
      matchConfidence: match.confidence,
      matchReason: match.reason,
    }));
  } catch (error) {
    console.error("Get matched jobs error:", error);
    throw new Error("Failed to fetch matched jobs");
  }
}

/**
 * Get a specific match result
 */
export async function getJobMatch(userId: number, jobId: string) {
  try {
    return await prisma.job_match.findUnique({
      where: {
        userId_jobId: {
          userId,
          jobId,
        },
      },
      include: {
        job: true,
      },
    });
  } catch (error) {
    console.error("Get job match error:", error);
    throw new Error("Failed to fetch job match");
  }
}