import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error'], // never log queries — they can contain user data
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db