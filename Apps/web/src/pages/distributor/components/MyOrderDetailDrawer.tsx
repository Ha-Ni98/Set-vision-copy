import type { OrderDetailDTO } from "@my-app/contract";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { OrderStatusBadge, LotStatusBadge } from "@/components/shared/StatusBadge";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { formatDateTime, formatDZD } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: OrderDetailDTO;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function MyOrderDetailDrawer({
  open,
  onOpenChange,
  order,
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
          <SheetTitle>{t("distributor.orders.detail.title")}</SheetTitle>
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

        {!isLoading && !isError && order && (
          <div className="mt-6 flex flex-col gap-5 text-sm">
            <div className="flex items-center justify-between">
              <OrderStatusBadge status={order.orderStat} />
              <span className="text-muted-foreground">
                {formatDateTime(order.createdAt, language)}
              </span>
            </div>

            <dl className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-muted-foreground">{t("distributor.orders.detail.receiver")}</dt>
                <dd className="font-medium text-foreground">{order.receivedName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("distributor.orders.table.number")}</dt>
                <dd className="font-medium text-foreground">{order.orderNumber}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">
                  {t("distributor.orders.detail.deliveryCompany")}
                </dt>
                <dd className="font-medium text-foreground">{order.deliveryCompanyName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">
                  {t("distributor.orders.detail.deliveryType")}
                </dt>
                <dd className="font-medium text-foreground">
                  {t(`enums.deliveryType.${order.deliveryType}`)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("distributor.orders.table.price")}</dt>
                <dd className="font-medium text-foreground">
                  {formatDZD(order.orderPrice, language)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("distributor.orders.table.delivery")}</dt>
                <dd className="font-medium text-foreground">
                  {formatDZD(order.deliverPrice, language)}
                </dd>
              </div>
            </dl>

            <div>
              <h3 className="mb-2 font-semibold text-foreground">
                {t("distributor.orders.detail.lots")}
              </h3>
              <div className="overflow-hidden rounded-xl border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="p-3">{t("distributor.orders.table.number")}</th>
                      <th className="p-3">{t("distributor.orders.table.cards")}</th>
                      <th className="p-3">{t("distributor.orders.table.status")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {order.lots.map((lot) => (
                      <tr key={lot.lotId}>
                        <td className="p-3">{lot.lotNumber}</td>
                        <td className="p-3">{lot.cardsCount}</td>
                        <td className="p-3">
                          <LotStatusBadge status={lot.lotStat} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
