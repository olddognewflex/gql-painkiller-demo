import { PrismaClient } from "@prisma/client";

// Log every query so the N+1 explosion is visible in the terminal.
export const prisma = new PrismaClient({
  log: [{ emit: "stdout", level: "query" }],
});

export interface Context {
  prisma: PrismaClient;
}
