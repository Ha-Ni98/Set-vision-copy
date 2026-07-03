import { Search, Check, Store } from "lucide-react";
import type { DistributorDTO } from "@my-app/contract";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  distributors?: DistributorDTO[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  selectedDistributorId: string;
  onSelectDistributor: (id: string) => void;
}

// Step 1 of the create-order wizard — real hook wiring (useDistributors + client isEnabled
// filter, F-5) lands in Sprint 3; this is the static list/selection UI only.
export function StepSelectDistributor({
  search,
  onSearchChange,
  distributors,
  isLoading,
  isError,
  onRetry,
  selectedDistributorId,
  onSelectDistributor,
}: Props) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("admin.orders.create.distributorSearchPlaceholder")}
          className="pl-9"
        />
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <NotFoundState
          title={t("admin.dashboard.sectionError")}
          body={t("admin.dashboard.sectionErrorBody")}
          action={<Button onClick={onRetry}>{t("common.actions.tryAgain")}</Button>}
        />
      )}

      {!isLoading && !isError && (distributors ?? []).length === 0 && (
        <EmptyState
          icon={<Store className="h-6 w-6" />}
          title={t("admin.distributors.empty.noDistributors")}
          body=""
        />
      )}

      {!isLoading && !isError && (distributors?.length ?? 0) > 0 && (
        <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
          {distributors!.map((distributor) => {
            const selected = distributor.id === selectedDistributorId;
            return (
              <button
                key={distributor.id}
                type="button"
                onClick={() => onSelectDistributor(distributor.id)}
                className={cn(
                  "flex items-center justify-between rounded-xl border p-3 text-left text-sm transition-colors",
                  selected ? "border-primary bg-primary-light" : "border-border hover:bg-accent",
                )}
              >
                <div>
                  <div className="font-semibold text-foreground">{distributor.fullName}</div>
                  <div className="text-muted-foreground">
                    {distributor.storeName} · {distributor.phone}
                  </div>
                </div>
                {selected && <Check className="h-4 w-4 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
