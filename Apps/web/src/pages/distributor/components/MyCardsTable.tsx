import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { CardStat } from "@my-app/contract";
import type { DistributorCardDTO } from "@my-app/contract";
import { DataTable } from "@/components/shared/DataTable";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { NotFoundState } from "@/components/shared/NotFoundState";
import { CardStatusBadge } from "@/components/shared/StatusBadge";
import { CopyButton } from "@/components/shared/CopyButton";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { formatDateTime } from "@/lib/utils";

// The only stats whose (full) key is copyable — matches CardMapper.distributorVisibleKey's
// full-key tier exactly. A 4-char-prefixed key is never a copyable value.
const COPYABLE_STATS = new Set<CardStat>([CardStat.ACTIVATED, CardStat.ACTIVATION_FAILED]);

interface Props {
  data?: DistributorCardDTO[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  hasFilters: boolean;
  onClearFilters: () => void;
}

// The Key cell renders dto.key verbatim, with "—" when null. No slicing, no masking, no
// conditional on cardStat here — the server already decided what this cell may show
// (card.mapper.ts's distributorVisibleKey). If this component ever needs to decide what to
// show, the server got it wrong.
function KeyCell({ card }: { card: DistributorCardDTO }) {
  const { t } = useTranslation();
  if (!card.key) {
    return (
      <span className="text-muted-foreground" title={t("distributor.cards.keyHidden")}>
        —
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 font-mono text-xs">
      {card.key}
      {COPYABLE_STATS.has(card.cardStat) && <CopyButton text={card.key} />}
    </span>
  );
}

export function MyCardsTable({
  data,
  isLoading,
  isError,
  onRetry,
  hasFilters,
  onClearFilters,
}: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();

  const columns = useMemo<ColumnDef<DistributorCardDTO>[]>(
    () => [
      {
        id: "key",
        header: t("distributor.cards.table.key"),
        cell: ({ row }) => <KeyCell card={row.original} />,
      },
      { accessorKey: "subscriptionLabel", header: t("distributor.cards.table.plan") },
      {
        id: "lot",
        header: t("distributor.cards.table.lot"),
        cell: ({ row }) => row.original.lotNumber ?? "—",
      },
      {
        id: "status",
        header: t("distributor.cards.table.status"),
        cell: ({ row }) => <CardStatusBadge status={row.original.cardStat} />,
      },
      {
        id: "flags",
        header: t("distributor.cards.table.flags"),
        cell: ({ row }) => (
          <div className="flex gap-1 text-xs text-muted-foreground">
            {row.original.isDisabled && <span>{t("common.status.disabled")}</span>}
            {row.original.isRevoked && <span>{t("distributor.cards.filters.flagRevoked")}</span>}
          </div>
        ),
      },
      {
        id: "delivered",
        header: t("distributor.cards.table.delivered"),
        cell: ({ row }) =>
          row.original.deliveredAt ? formatDateTime(row.original.deliveredAt, language) : "—",
      },
    ],
    [t, language],
  );

  if (isLoading) return <TableSkeleton rows={10} columns={6} />;
  if (isError) {
    return (
      <NotFoundState
        title={t("common.errors.crashTitle")}
        body={t("common.errors.crashBody")}
        action={<Button onClick={onRetry}>{t("common.actions.tryAgain")}</Button>}
      />
    );
  }

  const rows = data ?? [];

  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowKey={(row) => row.id}
      renderMobileRow={(row) => (
        <div className="space-y-2 p-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-foreground">{row.subscriptionLabel}</div>
            <CardStatusBadge status={row.cardStat} />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <KeyCell card={row} />
            <span>{row.lotNumber ?? "—"}</span>
          </div>
        </div>
      )}
      emptyState={
        <EmptyState
          icon={<Search className="h-6 w-6" />}
          title={t(
            hasFilters ? "distributor.cards.empty.noMatch" : "distributor.cards.empty.noCards",
          )}
          body=""
          decoration={
            hasFilters && (
              <Button variant="outline" onClick={onClearFilters} className="mt-2">
                {t("common.actions.clear")}
              </Button>
            )
          }
        />
      }
    />
  );
}
