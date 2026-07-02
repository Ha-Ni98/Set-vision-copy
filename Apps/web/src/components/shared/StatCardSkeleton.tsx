import { Skeleton } from "@/components/ui/skeleton";

export function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <Skeleton className="mb-3 h-10 w-10 rounded-xl" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-2 h-7 w-32" />
      <Skeleton className="mt-2 h-4 w-20" />
    </div>
  );
}
