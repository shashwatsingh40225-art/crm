import { LoadingTable } from "@/components/ui/loading";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shown while the dashboard server component fetches its 4 parallel queries.
 * Structured to match the real page layout (work queue, metric tiles, forecast,
 * funnel, stalled deals) so there's no layout shift when content arrives.
 */
export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="grid gap-1">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-8 w-28" />
      </div>

      {/* Work queue */}
      <div className="grid gap-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>

      {/* Metric tiles */}
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-36" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Forecast card */}
      <div className="grid gap-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>

      {/* Funnel chart */}
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-8 w-40" />
        </div>
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>

      {/* Stalled deals table */}
      <div className="grid gap-2">
        <Skeleton className="h-4 w-24" />
        <LoadingTable rows={4} columns={5} />
      </div>
    </div>
  );
}
