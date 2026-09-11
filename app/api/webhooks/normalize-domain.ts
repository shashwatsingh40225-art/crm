/**
 * Shared between app/api/webhooks/scan (INV-60) and app/api/webhooks/signup
 * (INV-62) - both need the same "what counts as the same domain" answer so a
 * scanned prospect and a self-serve signup for the same company land on one
 * Company row. Deliberately not the same function as Agent A's
 * normalizeDomain (app/api/companies/schema.ts, INV-22 dedupe): that module
 * is outside app/api/webhooks/**, and this route group doesn't depend on
 * another agent's directory (CLAUDE.md section 7).
 */
export function normalizeDomain(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split("?")[0];
}
