import { Link } from "react-router-dom";
import type { CardDetailDTO } from "@my-app/contract";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { CopyButton } from "@/components/shared/CopyButton";
import { CardStatusBadge } from "@/components/shared/StatusBadge";
import { CardFlagChips } from "./CardFlagChips";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { formatDateTime } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card?: CardDetailDTO;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

// `distributionTimeline` rows are derived server-side and only appear when their timestamp
// exists (plan §D3.1) — this component just renders whatever the DTO already filtered.
export function CardDetailModal({ open, onOpenChange, card, isLoading, isError, onRetry }: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("admin.cards.detail.title")}</DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="mt-4 h-20 w-full" />
          </div>
        )}

        {isError && (
          <NotFoundState
            title={t("admin.cards.detail.notFound")}
            body=""
            action={<Button onClick={onRetry}>{t("common.actions.tryAgain")}</Button>}
          />
        )}

        {!isLoading && !isError && card && (
          <div className="flex flex-col gap-4 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 font-mono font-semibold">
                {card.key}
                <CopyButton text={card.key} />
              </div>
              <CardStatusBadge status={card.cardStat} />
            </div>

            <CardFlagChips isDisabled={card.isDisabled} isRevoked={card.isRevoked} />

            <dl className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-muted-foreground">{t("admin.cards.table.plan")}</dt>
                <dd className="font-medium text-foreground">{card.subscriptionLabel}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t("admin.cards.table.set")}</dt>
                <dd className="font-medium text-foreground">{card.setNumber}</dd>
              </div>
              {card.lotNumber && (
                <div>
                  <dt className="text-muted-foreground">{t("admin.cards.table.lot")}</dt>
                  <dd className="font-medium text-foreground">{card.lotNumber}</dd>
                </div>
              )}
              {card.distributorName && (
                <div>
                  <dt className="text-muted-foreground">{t("admin.cards.table.distributor")}</dt>
                  <dd className="font-medium text-foreground">{card.distributorName}</dd>
                </div>
              )}
            </dl>

            <div>
              <h3 className="mb-2 font-semibold text-foreground">
                {t("admin.cards.detail.timeline.title")}
              </h3>
              <ol className="flex flex-col gap-2 border-l border-border pl-4">
                {card.distributionTimeline.map((entry, i) => (
                  <li key={i} className="text-sm">
                    <span className="font-medium text-foreground">
                      {t(`enums.cardStat.${entry.stat}`)}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {formatDateTime(entry.at, language)}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}

        <DialogFooter>
          {card && (
            <Button variant="outline" asChild>
              <Link to={`/admin/activations?key=${card.key}`}>
                {t("admin.cards.detail.viewHistory")}
              </Link>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
