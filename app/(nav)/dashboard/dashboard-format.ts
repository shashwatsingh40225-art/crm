/**
 * Local formatter, mirroring the same UTC-pinning lesson the deals section
 * hit (locale-default date formatting differs between server and client and
 * throws a hydration mismatch) — kept here rather than imported from
 * app/(nav)/deals/** to stay out of another agent's owned directory.
 */
export const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
