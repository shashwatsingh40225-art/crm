import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@prisma/client";
import { prisma } from "./db";
import { createClient } from "./supabase/server";

/**
 * The signed-in application user, or null (INV-8).
 *
 * Two identities are in play: the Supabase Auth user (who signed in) and the
 * Prisma User row (who owns records). They are joined on User.authUserId.
 *
 * Server-side only, and Node runtime only - it touches Prisma, so an audited
 * route calling this must not run on Edge (CLAUDE.md section 5).
 *
 * Wrapped in React.cache so several components in one render share a single
 * round trip.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  return prisma.user.findUnique({ where: { authUserId: authUser.id } });
});

/**
 * getCurrentUser() for pages that cannot render without a user. Redirects to
 * /login rather than returning null, so callers get a non-nullable User.
 *
 * The middleware already redirects unauthenticated requests; this is the
 * server-side backstop for the case where a session exists in Supabase but no
 * matching User row does.
 */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
