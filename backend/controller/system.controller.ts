import prisma from "../lib/prisma.js"

export function healthCheck(req: any, res: any) {
  res.send("OK")
}

export async function dbTest(req: any, res: any) {
  try {
    const user = await prisma.user.create({
      data: {
        email: `test${Date.now()}@example.com`,
        name: "Test User"
      }
    })

    const allUsers = await prisma.user.findMany()

    res.json({
      success: true,
      message: "Prisma integration working",
      createdUser: user,
      allUsers
    })

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
}