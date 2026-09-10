import { LifecycleStage } from "@prisma/client";
import { createLoader, debounce, parseAsInteger, parseAsString, parseAsStringEnum } from "nuqs/server";

/**
 * URL search-param contract for the contact list (INV-52). Same split as
 * `app/(nav)/companies/search-params.ts`: one parser map shared by the server
 * page and the client filter bar, `shallow: false` throughout so a filter
 * change re-runs the server query, `q` debounced so typing doesn't fire a
 * query per keystroke.
 */
export const contactsSearchParams = {
  q: parseAsString
    .withDefault("")
    .withOptions({ shallow: false, limitUrlUpdates: debounce(400) }),
  stage: parseAsStringEnum<LifecycleStage>(Object.values(LifecycleStage)).withOptions({
    shallow: false,
  }),
  company: parseAsString.withOptions({ shallow: false }),
  page: parseAsInteger.withDefault(1).withOptions({ shallow: false }),
};

export const loadContactsSearchParams = createLoader(contactsSearchParams);

export const PAGE_SIZE = 25;
