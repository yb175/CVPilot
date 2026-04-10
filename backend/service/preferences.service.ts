import prisma from "../lib/prisma.js"
import { syncClerkUser } from "./user.service.js"

export async function createOrUpdatePreferences(clerkId: string, data: any, email?: string, name?: string) {
  // Ensure user exists in database
  const user = await syncClerkUser(clerkId, email || "", name)

  return prisma.userPreferences.upsert({
    where: { userId: user.id },
    update: data,
    create: {
      userId: user.id,
      ...data
    }
  })
}

export async function getPreferences(clerkId: string, email?: string, name?: string) {
  // Ensure user exists in database
  const user = await syncClerkUser(clerkId, email || "", name)

  return prisma.userPreferences.findUnique({
    where: { userId: user.id }
  })
}

export async function updatePreferences(clerkId: string, data: any, email?: string, name?: string) {
  // Ensure user exists in database
  const user = await syncClerkUser(clerkId, email || "", name)

  return prisma.userPreferences.update({
    where: { userId: user.id },
    data
  })
}