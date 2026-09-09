/**
 * Shared Prisma client (CLAUDE.md §7 — built in Foundation, read-only afterwards).
 *
 * Every agent imports `prisma` from here. Nobody constructs their own
 * PrismaClient: the audit extension is attached at this single point (INV-11),
 * so a second client would write mutations that never produce an AuditEvent.
 *
 * Cross-agent reads go through this client directly (ADR 0002 / CLAUDE.md §9).
 * Agents never call each other's API routes.
 */
import { PrismaClient } from "@prisma/client";

const createPrismaClient = () =>
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

type AppPrismaClient = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as {
  prisma?: AppPrismaClient;
};

export const prisma: AppPrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

// Next.js dev hot-reloads modules; without this the process leaks a new
// connection pool on every reload until Postgres refuses connections.
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
