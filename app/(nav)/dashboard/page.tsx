import type { Source } from "@prisma/client";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth";
import { getFunnelMetrics } from "@/app/api/dashboard/funnel/query";
import {
  getDashboardMetrics,
  type Period,
} from "@/app/api/dashboard/metrics/query";
import { getWorkQueue } from "@/app/api/dashboard/work-queue/query";
import { getStaleDeals } from "@/app/api/dashboard/stale-deals/query";
import { FunnelChart } from "./funnel-chart";
import { MetricTiles } from "./metric-tiles";
import { PeriodToggle } from "./period-toggle";
import { ScopeToggle } from "./scope-toggle";
import { scopeSearchParamsCache } from "./scope";
import { SourceToggle } from "./source-toggle";
import { WorkQueue } from "./work-queue";
import { StalledDealsWidget } from "./stalled-deals-widget";

export const runtime = "nodejs";

const FUNNEL_SOURCE_VALUES: Source[] = ["outbound_scan", "inbound_signup"];
function isFunnelSource(value: string): value is Source {
  return (FUNNEL_SOURCE_VALUES as string[]).includes(value);
}

const PERIOD_VALUES: Period[] = ["7d", "30d", "all"];
function isPeriod(value: string): value is Period {
  return (PERIOD_VALUES as string[]).includes(value);
}

/**
 * INV-37/38/39/40/41 (INV-36 folded into the work queue's "next action"
 * section). Server component: the source, period and INV-59 scope toggles
 * are URL params (like Agent B's deal filters), so this re-queries directly
 * on navigation with no client-side fetch or state to keep in sync.
 *
 * INV-59: `scope` ("mine" | "team", default "mine") governs every section on
 * the page — no section is exempt, so it resolves once here to a single
 * `ownerId` (the signed-in user's id, or undefined for "team") and every
 * query below takes it. Scoping happens in the Prisma `where`, not by
 * filtering an already-fetched array.
 */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; period?: string; scope?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const { scope } = scopeSearchParamsCache.parse(params);

  const source =
    params.source && isFunnelSource(params.source) ? params.source : undefined;
  const period: Period =
    params.period && isPeriod(params.period) ? params.period : "30d";

  const ownerId = scope === "mine" ? user.id : undefined;

  const [funnel, metrics, workQueue, staleDeals] = await Promise.all([
    getFunnelMetrics({ source, ownerId }),
    getDashboardMetrics(period, ownerId),
    getWorkQueue(ownerId),
    getStaleDeals({ ownerId }),
  ]);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Signed in as ${user.name}. One chain from first scan to signed engagement.`}
        actions={<ScopeToggle />}
      />

      <div className="grid gap-2">
        <h2 className="text-sm font-medium">
          {scope === "mine" ? "My work today" : "Team work today"}
        </h2>
        <WorkQueue queue={workQueue} scope={scope} />
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium">This period</h2>
          <PeriodToggle value={period} />
        </div>
        <MetricTiles metrics={metrics} />
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium">Funnel</h2>
          <SourceToggle value={source} />
        </div>
        <FunnelChart stages={funnel} source={source} />
      </div>

      <div className="grid gap-2">
        <h2 className="text-sm font-medium">Stalled deals</h2>
        <StalledDealsWidget deals={staleDeals} />
      </div>
    </>
  );
}
