import prisma from "../lib/prisma.js"

export function healthCheck(req: any, res: any) {
  res.send("OK")
}