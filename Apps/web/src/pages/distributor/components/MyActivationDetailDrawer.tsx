import type { DistributorActivationDetailDTO } from "@my-app/contract";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { StatusBadge, CardStatusBadge } from "@/components/shared/StatusBadge";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { formatDateTime } from "@/lib/utils";
import { formatDuration } from "@/lib/duration";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activation?: DistributorActivationDetailDTO;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

// Deliberately shows client + status + timing + card chain + status history ONLY. No account
// fields (username/password/OTP/birthday), no activator name, no price/earning/commission
// figure anywhere in this drawer — see DistributorActivationDetailResponseSchema's own
// "DELIBERATELY ABSENT" comment in the contract (Set 7 §4.1).
export function MyActivationDetailDrawer({
  open,
  onOpenChange,
  activation,
  isLoading,
  isError,
  onRetry,
}: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{t("distributor.activations.detail.title")}</SheetTitle>
        </SheetHeader>

        {isLoading && (
          <div className="mt-6 flex flex-col gap-3">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="mt-4 h-24 w-full" />
          </div>
        )}

        {isError && (
          <div className="mt-6">
            <NotFoundState
              title={t("common.errors.crashTitle")}
              body={t("common.errors.crashBody")}
              action={<Button onClick={onRetry}>{t("common.actions.tryAgain")}</Button>}
            />
          </div>
        )}

        {!isLoading && !isError && activation && (
          <div className="mt-6 flex flex-col gap-5 text-sm">
            <div className="flex items-center justify-between">
              <StatusBadge status={activation.state} />
              <span className="text-muted-foreground">
                {formatDateTime(activation.requestedAt, language)}
              </span>
            </div>

            <div>
              <h3 className="mb-2 font-semibold text-foreground">
                {t("distributor.activations.detail.client")}
              </h3>
              <dl className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-muted-foreground">
                    {t("distributor.activations.table.client")}
                  </dt>
                  <dd className="font-medium text-foreground">{activation.client.fullName}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">
                    {t("distributor.activations.table.phone")}
                  </dt>
                  <dd className="font-medium text-foreground">{activation.client.phone}</dd>
                </div>
              </dl>
            </div>

            <div>
              <h3 className="mb-2 font-semibold text-foreground">
                {t("distributor.activations.detail.card")}
              </h3>
              <dl className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-muted-foreground">
                    {t("distributor.activations.table.key")}
                  </dt>
                  <dd className="font-mono text-xs text-foreground">{activation.key ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t("distributor.cards.table.lot")}</dt>
                  <dd className="font-medium text-foreground">{activation.lotNumber ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">
                    {t("distributor.activations.table.plan")}
                  </dt>
                  <dd className="font-medium text-foreground">{activation.subscriptionLabel}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t("distributor.cards.table.status")}</dt>
                  <dd>
                    <CardStatusBadge status={activation.cardStat} />
                  </dd>
                </div>
              </dl>
            </div>

            <div>
              <h3 className="mb-2 font-semibold text-foreground">
                {t("distributor.activations.detail.timing")}
              </h3>
              <dl className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-muted-foreground">
                    {t("distributor.activations.table.requested")}
                  </dt>
                  <dd className="font-medium text-foreground">
                    {formatDateTime(activation.requestedAt, language)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">
                    {t("distributor.orders.table.completed")}
                  </dt>
                  <dd className="font-medium text-foreground">
                    {activation.completedAt
                      ? formatDateTime(activation.completedAt, language)
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">
                    {t("distributor.activations.table.duration")}
                  </dt>
                  <dd className="font-mono text-foreground">
                    {formatDuration(activation.durationSeconds)}
                  </dd>
                </div>
              </dl>
            </div>

            <div>
              <h3 className="mb-2 font-semibold text-foreground">
                {t("distributor.activations.detail.history")}
              </h3>
              <ul className="flex flex-col gap-2">
                {activation.statusHistory.map((entry, i) => (
                  <li key={i} className="flex items-center justify-between text-xs">
                    <StatusBadge status={entry.stat} />
                    <span className="text-muted-foreground">
                      {formatDateTime(entry.at, language)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
