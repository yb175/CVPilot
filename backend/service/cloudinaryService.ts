import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";


// Uploads a resume file buffer to Cloudinary using a stream-based approach (avoids disk storage)
export const uploadResume = (
  buffer: Buffer,
  mimeType: string
): Promise<{ secureUrl: string; publicId: string }> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "cvpilot/resumes",
        resource_type: "auto",
        type: "upload",  // Allows public access to the file
      },
      (error, result) => {
        if (error || !result) {
          return reject(
            new Error("Failed to upload resume to Cloudinary")
          );
        }

        resolve({
          secureUrl: result.secure_url,
          publicId: result.public_id,
        });
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

export const deleteResume = async (publicId: string): Promise<void> => {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      throw new Error("Failed to delete resume from Cloudinary");
    }
  };