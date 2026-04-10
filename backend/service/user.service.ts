import prisma from "../lib/prisma.js"

export async function syncClerkUser(clerkId: string, email: string, name?: string) {
  // First, try to find by clerkId
  let user = await prisma.user.findUnique({
    where: { clerkId }
  })

  if (user) {
    // User exists with this clerkId, update if needed
    return await prisma.user.update({
      where: { clerkId },
      data: {
        ...(email && { email }),
        ...(name && { name })
      }
    })
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


