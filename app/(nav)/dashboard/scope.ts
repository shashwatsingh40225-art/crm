import { createSearchParamsCache, parseAsStringLiteral } from "nuqs/server";

export const SCOPE_VALUES = ["mine", "team"] as const;
export type Scope = (typeof SCOPE_VALUES)[number];

/**
 * INV-59. Single parser definition shared by the server page (via
 * `scopeSearchParamsCache`, reading the request URL) and the client
 * `<ScopeToggle>` (via `useQueryState`) so the "scope" key and its default
 * ("mine") can't drift between the two.
 */
export const scopeParser = parseAsStringLiteral(SCOPE_VALUES).withDefault(
  "mine",
);

export const scopeSearchParamsCache = createSearchParamsCache({
  scope: scopeParser,
});
