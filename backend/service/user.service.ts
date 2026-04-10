import prisma from "../lib/prisma.js"

export async function syncClerkUser(clerkId: string, email: string, name?: string) {
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
          ...(email && { email }),
          ...(name && { name })
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
      email: email || `temp-${clerkId}@placeholder.com`,
      name
    }
  })
}

export async function getUserByClerkId(clerkId: string) {
  return prisma.user.findUnique({
    where: { clerkId }
  })
}
