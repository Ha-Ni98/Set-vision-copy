import type { WilayaDrilldownDTO } from "@my-app/contract";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { useTranslation } from "@/hooks/useTranslation";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data?: WilayaDrilldownDTO;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function WilayaDrilldownPanel({
  open,
  onOpenChange,
  data,
  isLoading,
  isError,
  onRetry,
}: Props) {
  const { t } = useTranslation();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{data?.wilayaName ?? t("admin.statistics.drilldown.title")}</SheetTitle>
        </SheetHeader>

        {isLoading && (
          <div className="mt-6 flex flex-col gap-3">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {isError && (
          <div className="mt-6">
            <NotFoundState
              title={t("admin.dashboard.sectionError")}
              body=""
              action={<Button onClick={onRetry}>{t("common.actions.tryAgain")}</Button>}
            />
          </div>
        )}

        {!isLoading && !isError && data && (
          <div className="mt-6 flex flex-col gap-6 text-sm">
            <div>
              <h3 className="mb-2 font-semibold text-foreground">
                {t("admin.statistics.drilldown.topDistributors")}
              </h3>
              <ol className="flex flex-col gap-1">
                {data.topDistributors.map((d) => (
                  <li key={d.distributorId} className="flex justify-between">
                    <span>{d.storeName}</span>
                    <span className="font-medium text-foreground">{d.activationsCount}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <h3 className="mb-2 font-semibold text-foreground">
                {t("admin.statistics.drilldown.activationsByPlan")}
              </h3>
              <ol className="flex flex-col gap-1">
                {data.activationsByPlan.map((p) => (
                  <li key={p.subscriptionPlanId} className="flex justify-between">
                    <span>{p.subscriptionLabel}</span>
                    <span className="font-medium text-foreground">{p.count}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <h3 className="mb-2 font-semibold text-foreground">
                {t("admin.statistics.drilldown.activationsOverTime")}
              </h3>
              <ol className="flex flex-col gap-1">
                {data.activationsOverTime.map((point) => (
                  <li key={point.date} className="flex justify-between">
                    <span>{point.date.slice(0, 10)}</span>
                    <span className="font-medium text-foreground">{point.count}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
