import { LoadingTable } from "@/components/ui/loading";
import { Skeleton } from "@/components/ui/skeleton";

export default function CompaniesLoading() {
  return (
    <div className="flex flex-col gap-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="grid gap-1">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-8 w-32" />
      </div>
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
