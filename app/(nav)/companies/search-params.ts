import { IcpFit, LifecycleStage, Source } from "@prisma/client";
import { createLoader, debounce, parseAsInteger, parseAsString, parseAsStringEnum } from "nuqs/server";

/**
 * URL search-param contract for the company list (INV-52). Shared between the
 * server page (parses via `loadCompaniesSearchParams`) and the client filter
 * bar (binds via `useQueryStates` with this same parser map), so the two never
 * drift out of sync on param names or types.
 *
 * Every field is `shallow: false` - a filter change must re-run the server
 * component's Prisma query, not just rewrite the URL. `q` additionally
 * debounces the resulting network round trip so typing doesn't fire a query
 * per keystroke; the parser's own React state still updates immediately, so
 * the input stays responsive.
 */
export const companiesSearchParams = {
  q: parseAsString
    .withDefault("")
    .withOptions({ shallow: false, limitUrlUpdates: debounce(400) }),
  stage: parseAsStringEnum<LifecycleStage>(Object.values(LifecycleStage)).withOptions({
    shallow: false,
  }),
  icpFit: parseAsStringEnum<IcpFit>(Object.values(IcpFit)).withOptions({ shallow: false }),
  owner: parseAsString.withOptions({ shallow: false }),
  source: parseAsStringEnum<Source>(Object.values(Source)).withOptions({ shallow: false }),
  page: parseAsInteger.withDefault(1).withOptions({ shallow: false }),
};

export const loadCompaniesSearchParams = createLoader(companiesSearchParams);

export const UNASSIGNED_OWNER = "unassigned";
export const PAGE_SIZE = 25;
