import prisma from "../lib/prisma.js"
import { syncClerkUser } from "./user.service.js"

export async function createOrUpdatePreferences(clerkId: string, data: any) {
  // Ensure user exists in database with real profile fetched from Clerk
  const user = await syncClerkUser(clerkId)

  return prisma.userPreferences.upsert({
    where: { userId: user.id },
    update: data,
    create: {
      userId: user.id,
      seniority: data.seniority,
      locationPreferences: data.locationPreferences || [],
      ...data
    }
  })
}

export async function getPreferences(clerkId: string) {
  // Ensure user exists in database with real profile fetched from Clerk
  const user = await syncClerkUser(clerkId)

  return prisma.userPreferences.findUnique({
    where: { userId: user.id }
  })
}

export async function updatePreferences(clerkId: string, data: any) {
  // Ensure user exists in database with real profile fetched from Clerk
  const user = await syncClerkUser(clerkId)

  return prisma.userPreferences.upsert({
    where: { userId: user.id },
    update: data,
    create: {
      userId: user.id,
      seniority: data.seniority || "INTERN",
      locationPreferences: data.locationPreferences || [],
      ...data
    }
  })
}