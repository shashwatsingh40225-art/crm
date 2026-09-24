import { LoadingTable } from "@/components/ui/loading";
import { Skeleton } from "@/components/ui/skeleton";

export default function DealsLoading() {
  return (
    <div className="flex flex-col gap-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="grid gap-1">
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
      {/* View tabs */}
      <Skeleton className="h-9 w-48" />
      {/* Filters row */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-28" />
        ))}
      </div>
      <LoadingTable rows={8} columns={6} />
    </div>
  );
}
