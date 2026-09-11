import Link from "next/link";
import { History } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { StaleDeal } from "@/app/api/dashboard/stale-deals/query";
import { dateFormatter } from "./dashboard-format";

/**
 * INV-41. Global (not owner-scoped, unlike the "stale deals" section of
 * <WorkQueue>) — hence the Owner column, which would be redundant on a
 * "my work" view. Already sorted most-stale-first by getStaleDeals().
 * Purely presentational — `deals` is already-fetched from the page.
 */
export function StalledDealsWidget({ deals }: { deals: StaleDeal[] }) {
  if (deals.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={History}
            title="Nothing stalled"
            description="Every open deal has had activity or a stage move in the last 7 days."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card size="sm" className="border-border/60 shadow-sm overflow-hidden">
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground bg-muted/40 border-b text-left text-xs uppercase tracking-wider font-semibold">
              <th className="px-4 py-2.5 font-semibold">Deal</th>
              <th className="px-4 py-2.5 font-semibold">Stage</th>
              <th className="px-4 py-2.5 font-semibold">Owner</th>
              <th className="px-4 py-2.5 font-semibold">Days stale</th>
              <th className="px-4 py-2.5 font-semibold">Next action</th>
            </tr>
          </thead>
          <tbody>
            {deals.map((d) => (
              <tr key={d.id} className="hover:bg-muted/30 border-b last:border-0 transition-colors">
                <td className="px-4 py-2">
                  <Link href={`/deals/${d.id}`} className="hover:underline">
                    <span className="font-medium">{d.name}</span>
                    <span className="text-muted-foreground block text-xs">
                      {d.companyName}
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-2">{d.stageName}</td>
                <td className="px-4 py-2">
                  {d.ownerName ?? (
                    <span className="text-muted-foreground">Unassigned</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <span className="text-amber-700 font-medium dark:text-amber-500">
                    {d.daysStale}d
                  </span>
                </td>
                <td className="px-4 py-2">
                  {d.nextAction ? (
                    <div className="grid gap-0.5">
                      <span>{d.nextAction}</span>
                      {d.nextActionDue ? (
                        <span className="text-muted-foreground text-xs">
                          Due {dateFormatter.format(new Date(d.nextActionDue))}
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
