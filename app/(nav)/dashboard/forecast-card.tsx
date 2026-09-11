import { TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { WeightedForecast } from "@/app/api/dashboard/forecast/query";
import { currencyFormatter } from "./dashboard-format";

/**
 * INV-58. Total weighted MRR up top, a per-stage breakdown underneath. A
 * deal with no `proposedMrr` still counts toward "Deals" (it's part of the
 * pipeline) but is flagged inline rather than silently folded into a $0 —
 * otherwise a stage full of unpriced deals reads as worthless instead of
 * unpriced.
 */
export function ForecastCard({ forecast }: { forecast: WeightedForecast }) {
  if (forecast.totalDealCount === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={TrendingUp}
            title="No open deals"
            description="Weighted pipeline value will show up here once a deal is open."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="grid gap-4 p-5">
        <div className="grid gap-1">
          <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
            <TrendingUp className="size-3.5 text-primary/70" />
            Weighted pipeline value
          </div>
          <p className="text-2xl font-semibold tracking-tight tabular-nums">
            {currencyFormatter.format(forecast.totalWeightedMrr)}
          </p>
          <p className="text-muted-foreground text-xs">
            {currencyFormatter.format(forecast.totalRawMrr)} raw across{" "}
            {forecast.totalDealCount} open{" "}
            {forecast.totalDealCount === 1 ? "deal" : "deals"}
            {forecast.totalDealsWithoutMrr > 0
              ? ` · ${forecast.totalDealsWithoutMrr} with no MRR set`
              : ""}
          </p>
        </div>

        <div className="overflow-x-auto rounded-md border border-border/40">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground bg-muted/40 border-b text-left text-xs uppercase tracking-wider font-semibold">
                <th className="py-2.5 px-3 font-semibold">Stage</th>
                <th className="py-2.5 px-3 font-semibold">Deals</th>
                <th className="py-2.5 px-3 font-semibold">Raw MRR</th>
                <th className="py-2.5 px-3 font-semibold">Weighted MRR</th>
              </tr>
            </thead>
            <tbody>
              {forecast.stages.map((s) => (
                <tr key={s.key} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 px-3 font-medium">{s.name}</td>
                  <td className="py-2.5 px-3 tabular-nums">
                    {s.dealCount}
                    {s.dealsWithoutMrr > 0 ? (
                      <span className="text-muted-foreground text-xs">
                        {" "}
                        ({s.dealsWithoutMrr} no MRR)
                      </span>
                    ) : null}
                  </td>
                  <td className="py-2.5 px-3 tabular-nums">
                    {currencyFormatter.format(s.rawMrr)}
                  </td>
                  <td className="py-2.5 px-3 font-medium tabular-nums text-primary">
                    {currencyFormatter.format(s.weightedMrr)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
