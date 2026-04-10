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
export const upsertResume = async (data: UpsertResumeInput) => {
    try {
      return await prisma.resume.upsert({
        where: { userId: data.userId },
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
          // parsedData is preserved
        },
      });
    } catch (error) {
      console.log(error);
      throw new Error("Failed to upsert resume in database");
    }
  };

/**
 * Update only the parsedData field of a resume
 * Does not modify file hash, URL, or other fields
 *
 * @param userId - User ID
 * @param parsedData - Parsed resume data to store (can be null)
 * @returns Updated Resume record or throws error
 */
export const updateResumeParsedData = async (
  userId: string,
  parsedData: any
) => {
  try {
    return await prisma.resume.update({
      where: { userId },
      data: {
        parsedData,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("DB error updating parsedData:", error);
    throw new Error("Failed to update resume parsed data in database");
  }
};

