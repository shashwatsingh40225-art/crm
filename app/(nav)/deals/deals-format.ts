/**
 * Shared formatters for the deals section. Locale and time zone are pinned
 * explicitly everywhere dates render - `toLocaleDateString()` with no
 * arguments resolves differently between the server and the client and
 * throws a React hydration mismatch (hit and fixed in INV-25).
 */
export const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});

export const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

/**
 * Whole days between two dates, floored, never negative (INV-32, INV-57).
 * `daysBetween(from, to)` is the general form; `ageInDays(from)` is just
 * `daysBetween(from, now)`, kept as its own name since "age" reads better
 * than "days between X and now" at every existing call site.
 */
export function daysBetween(from: Date, to: Date): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86_400_000));
}

/**
 * Callers pass a deal's latest StageEvent.changedAt (falling back to
 * createdAt only if a deal somehow has none) - this is "age in stage", not
 * age since creation. The underlying date comes straight off the
 * StageEvent/Deal rows via the shared Prisma client, so any agent can
 * reproduce this exact number (or query the raw dates directly) without
 * needing this file - it's a one-line date diff, not a stored/computed
 * column, since the schema is frozen and doesn't have one.
 */
export function ageInDays(from: Date): number {
  return daysBetween(from, new Date());
}

/** A deal is "stale" once it's sat this many days in its current stage. */
export const STALE_DAYS = 7;
