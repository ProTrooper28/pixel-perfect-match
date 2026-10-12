import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function StatTileSkeleton() {
  return (
    <div className="surface space-y-4 p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

export function CardRowSkeleton() {
  return (
    <div className="surface p-7">
      <Skeleton className="h-12 w-12 rounded-xl" />
      <Skeleton className="mt-6 h-5 w-36" />
      <Skeleton className="mt-3 h-4 w-full" />
      <Skeleton className="mt-8 h-10 w-full" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-4 border-b border-border/60 px-4 py-4 last:border-0">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className={cn("h-4 flex-1", i === 0 && "max-w-48")} />
      ))}
    </div>
  );
}

export function LineSkeletons({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" style={{ width: `${100 - i * 8}%` }} />
      ))}
    </div>
  );
}
