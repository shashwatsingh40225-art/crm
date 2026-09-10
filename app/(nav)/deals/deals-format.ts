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

/** Whole days between `from` and now, floored, never negative. */
export function ageInDays(from: Date): number {
  return Math.max(0, Math.floor((Date.now() - from.getTime()) / 86_400_000));
}
