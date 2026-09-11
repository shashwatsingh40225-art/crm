import { createSearchParamsCache, parseAsStringLiteral } from "nuqs/server";

export const SCOPE_VALUES = ["mine", "team"] as const;
export type Scope = (typeof SCOPE_VALUES)[number];

/**
 * INV-59. Single parser definition shared by the server page (via
 * `scopeSearchParamsCache`, reading the request URL) and the client
 * `<ScopeToggle>` (via `useQueryState`) so the "scope" key and its default
 * ("mine") can't drift between the two.
 *
 * `shallow: false` is required: nuqs defaults to shallow routing, which only
 * rewrites the URL client-side via history.pushState and never asks Next.js
 * to re-render the server component — the dashboard page would keep showing
 * Mine's numbers under a URL that says `?scope=team`. Caught by actually
 * clicking the toggle rather than trusting tsc/eslint.
 */
export const scopeParser = parseAsStringLiteral(SCOPE_VALUES)
  .withDefault("mine")
  .withOptions({ shallow: false });

export const scopeSearchParamsCache = createSearchParamsCache({
  scope: scopeParser,
});
