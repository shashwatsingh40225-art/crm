import { LoadingTable } from "@/components/ui/loading";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReviewLoading() {
  return (
    <div className="flex flex-col gap-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="grid gap-1">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <LoadingTable rows={5} columns={4} />
    </div>
  );
}
