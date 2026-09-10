"use client";

import { useQueryState } from "nuqs";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { scopeParser, type Scope } from "./scope";

/**
 * INV-59. The whole dashboard's Mine/Team scope, in the URL via nuqs so it
 * can be bookmarked or shared — unlike <PeriodToggle>/<SourceToggle>, which
 * predate this ticket and manage the URL by hand.
 */
export function useScope() {
  return useQueryState("scope", scopeParser);
}

export function ScopeToggle() {
  const [scope, setScope] = useScope();

  return (
    <Tabs value={scope} onValueChange={(v) => setScope(v as Scope)}>
      <TabsList>
        <TabsTrigger value="mine">Mine</TabsTrigger>
        <TabsTrigger value="team">Team</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
