import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Source } from "@prisma/client";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { FunnelStageMetric } from "@/app/api/dashboard/funnel/query";
import { currencyFormatter } from "./dashboard-format";

const chartConfig = {
  dealCount: { label: "Deals", color: "var(--chart-1)" },
} satisfies ChartConfig;

/**
 * INV-39. The bar chart gives the funnel its visual shape (shrinking bars,
 * "one chain from first scan to signed engagement"); the chip row underneath
 * carries the numbers a chart can't show cleanly — MRR, conversion to the
 * next stage, and the click-through to the filtered deal list — and is real
 * <Link>s rather than chart click handlers, so it stays keyboard/screen
 * reader accessible.
 */
export function FunnelChart({
  stages,
  source,
}: {
  stages: FunnelStageMetric[];
  source?: Source;
}) {
  const chartData = stages.map((s) => ({ name: s.name, dealCount: s.dealCount }));

  return (
    <div className="grid gap-4">
      <Card>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-56 w-full">
            <BarChart data={chartData} layout="vertical" margin={{ left: 12 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" allowDecimals={false} hide />
              <YAxis
                type="category"
                dataKey="name"
                tickLine={false}
                axisLine={false}
                width={90}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="dealCount" fill="var(--color-dealCount)" radius={4} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-stretch gap-2">
        {stages.map((stage, i) => {
          const params = new URLSearchParams({ stage: stage.key });
          if (source) params.set("source", source);
          const href = `/deals?${params.toString()}`;
          const hasNext = i < stages.length - 1;

          return (
            <div key={stage.key} className="flex items-center gap-2">
              <Link
                href={href}
                className="hover:border-ring hover:bg-muted/50 grid min-w-32 gap-1 rounded-lg border p-3 transition-colors"
              >
                <p className="text-xs font-medium">{stage.name}</p>
                <p className="text-xl font-semibold tabular-nums">
                  {stage.dealCount}
                </p>
                <p className="text-muted-foreground text-xs">
                  {currencyFormatter.format(stage.mrr)}
                </p>
                <p className="text-muted-foreground text-xs">
                  {stage.medianDaysInStage !== null
                    ? `${stage.medianDaysInStage}d median`
                    : "—"}
                </p>
              </Link>
              {hasNext ? (
                <div className="text-muted-foreground flex flex-col items-center gap-0.5 text-xs">
                  <ArrowRight className="size-4" />
                  <span className="font-medium tabular-nums">
                    {stage.conversionRateToNext !== null
                      ? `${stage.conversionRateToNext}%`
                      : "—"}
                  </span>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
