import { PrismaClient } from "@prisma/client";
import { createLoaders, type Loaders } from "./loaders.js";

// Log every query so you can count the difference against the naive branch.
export const prisma = new PrismaClient({
  log: [{ emit: "stdout", level: "query" }],
});

export interface Context {
  prisma: PrismaClient;
  loaders: Loaders;
}

// Fresh loaders per request — caching is request-scoped, never shared.
export function createContext(): Context {
  return { prisma, loaders: createLoaders(prisma) };
}
