/**
 * "company" -> "companies" isn't a plain `+ "s"` - naive string interpolation
 * 404s the API route. Found in archive-control.tsx (INV-53) after it silently
 * broke lifecycle-stage-control.tsx the same way (INV-67). Every control that
 * calls a `/api/companies|contacts/[id]/...` route from a shared
 * entityType: "company" | "contact" prop imports this instead of rebuilding
 * the map.
 */
export const API_BASE: Record<"company" | "contact", string> = {
  company: "/api/companies",
  contact: "/api/contacts",
};

export const LIST_PATH: Record<"company" | "contact", string> = {
  company: "/companies",
  contact: "/contacts",
};
