import { Building2, Mail, Trophy, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { DashboardMetrics } from "@/app/api/dashboard/metrics/query";
import { currencyFormatter } from "./dashboard-format";

/**
 * INV-40. Four headline tiles. Every value is a real count/sum for the
 * selected period — including zero, which just renders as "0" rather than
 * the tile disappearing or showing a dash (AC: "Zero states render as 0,
 * not blank").
 */
export function MetricTiles({ metrics }: { metrics: DashboardMetrics }) {
  const tiles: { label: string; value: string; icon: LucideIcon }[] = [
    {
      label: "Companies scanned",
      value: metrics.companiesScanned.toLocaleString(),
      icon: Building2,
    },
    {
      label: "Outreach sent",
      value: metrics.outreachSent.toLocaleString(),
      icon: Mail,
    },
    {
      label: "Meetings booked",
      value: metrics.meetingsBooked.toLocaleString(),
      icon: Users,
    },
    {
      label: "Deals won",
      value: `${metrics.dealsWon.count.toLocaleString()} · ${currencyFormatter.format(metrics.dealsWon.mrr)}`,
      icon: Trophy,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map((t) => (
        <Card key={t.label} className="border-border/60 transition-all hover:border-border/90 hover:shadow-sm">
          <CardContent className="grid gap-2 p-4">
            <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
              <t.icon className="size-3.5 text-primary/70" />
              {t.label}
            </div>
            <p className="text-2xl font-semibold tracking-tight tabular-nums">{t.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
