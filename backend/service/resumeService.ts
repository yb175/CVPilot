import prisma from "../lib/prisma.js";

/**
 * Input type for upserting a resume
 */
export type UpsertResumeInput = {
  userId: string;
  fileUrl: string;
  publicId: string;
  fileHash: string;
  uploadedAt: Date;
};

/**
 * Fetch the existing resume for a given user
 */
export const getResumeByUserId = async (
  userId: string
) => {
  try {
    const resume= await prisma.resume.findUnique({
      where: { userId: userId },
    });
    return resume;
  } catch (error) {
    console.error("DB error:", error);
    throw new Error("Failed to fetch resume from database");
  }
};

/**
 * Create or update a resume record for a user
 * Uses Prisma upsert with userId as unique constraint
 * Ensures parsedData is preserved during updates
 */
export const upsertResume = async (
  data: UpsertResumeInput
) => {
  try {
    
    const user = await prisma.user.upsert({
        where: { clerkId: data.userId },
        update: {},
        create: {
          clerkId: data.userId,
          email: `${data.userId}@clerk.local`, // Placeholder until sync
          name: null,
        },
      });
    
    return await prisma.resume.upsert({
      where: { userId: (data.userId) },
      create: {
        userId: data.userId,
        fileUrl: data.fileUrl,
        publicId: data.publicId,
        fileHash: data.fileHash,
        uploadedAt: data.uploadedAt,
      },
      update: {
        fileUrl: data.fileUrl,
        publicId: data.publicId,
        fileHash: data.fileHash,
        uploadedAt: data.uploadedAt,
        // parsedData is intentionally NOT updated to preserve existing parsed results
      },
    });
  } catch (error) {
    console.log(error)
    throw new Error("Failed to upsert resume in database");
  }
};

