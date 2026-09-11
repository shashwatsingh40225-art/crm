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
    <Card>
      <CardContent className="grid gap-4">
        <div className="grid gap-1">
          <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
            <TrendingUp className="size-3.5" />
            Weighted pipeline value
          </div>
          <p className="text-2xl font-semibold tabular-nums">
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

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-left text-xs">
                <th className="py-2 pr-4 font-medium">Stage</th>
                <th className="py-2 pr-4 font-medium">Deals</th>
                <th className="py-2 pr-4 font-medium">Raw MRR</th>
                <th className="py-2 font-medium">Weighted MRR</th>
              </tr>
            </thead>
            <tbody>
              {forecast.stages.map((s) => (
                <tr key={s.key} className="border-b last:border-0">
                  <td className="py-2 pr-4">{s.name}</td>
                  <td className="py-2 pr-4 tabular-nums">
                    {s.dealCount}
                    {s.dealsWithoutMrr > 0 ? (
                      <span className="text-muted-foreground">
                        {" "}
                        ({s.dealsWithoutMrr} no MRR)
                      </span>
                    ) : null}
                  </td>
                  <td className="py-2 pr-4 tabular-nums">
                    {currencyFormatter.format(s.rawMrr)}
                  </td>
                  <td className="py-2 font-medium tabular-nums">
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
