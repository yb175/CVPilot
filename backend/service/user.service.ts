import prisma from "../lib/prisma.js"
import { clerkClient } from "@clerk/express"

export async function syncClerkUser(clerkId: string) {
  // Fetch real user data from Clerk
  let userEmail: string | undefined
  let userName: string | undefined

  try {
    const clerkUser = await clerkClient.users.getUser(clerkId)
    userEmail = clerkUser.emailAddresses?.[0]?.emailAddress
    userName = clerkUser.firstName || undefined
  } catch (error) {
    // If Clerk fetch fails, we'll create with placeholder but continue
  }

  // First, try to find by clerkId
  let user = await prisma.user.findUnique({
    where: { clerkId }
  })

  if (user) {
    // User exists with this clerkId, update if needed
    try {
      return await prisma.user.update({
        where: { clerkId },
        data: {
          ...(userEmail && { email: userEmail }),
          ...(userName && { name: userName })
        }
      })
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
        // Handle unique constraint violation (email already in use)
        throw new Error("Email already in use")
      }
      throw error
    }
  }

  // User doesn't exist with this clerkId, create new
  return await prisma.user.create({
    data: {
      clerkId,
      email: userEmail || `temp-${clerkId}@placeholder.com`,
      name: userName
    }
  })
}

export async function getUserByClerkId(clerkId: string) {
  return prisma.user.findUnique({
    where: { clerkId }
  })
}
