import { useCallback, useEffect, useState } from "react";
import { CreditCard, Search } from "lucide-react";
import type { AvailableCardSetGroupDTO } from "@my-app/contract";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { SimplePagination } from "@/components/shared/SimplePagination";
import { useTranslation } from "@/hooks/useTranslation";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useAvailableCardsForLot } from "@/hooks/useCards";
import { CardPickerGroup } from "./CardPickerGroup";
import type { SelectedCard } from "./card-picker.types";

const PAGE_LIMIT = 5;

interface Props {
  subscriptionPlanId: string;
  selected: Map<string, SelectedCard>;
  setSelected: React.Dispatch<React.SetStateAction<Map<string, SelectedCard>>>;
}

// Search + grouped list + paging + selection counter, all for one already-chosen plan
// (set-8-plan §4). `setSelected` is the raw state setter (referentially stable across renders),
// not a wrapped onChange — toggleCard/toggleGroup below use its functional-update form so they
// never close over the current selection, which is what keeps them stable for CardPickerRow's
// React.memo (set-8-plan §6.2 item 4).
export function CardPicker({ subscriptionPlanId, selected, setSelected }: Props) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);
  const isSearching = debouncedSearch.length > 0;

  // Search (debounced) and plan changes both invalidate the current page.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, subscriptionPlanId]);

  const query = useAvailableCardsForLot(subscriptionPlanId, {
    search: debouncedSearch || undefined,
    page,
    limit: PAGE_LIMIT,
  });

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const isGroupOpen = (setId: string) => openGroups[setId] ?? isSearching;
  const toggleGroupOpen = (setId: string) =>
    setOpenGroups((prev) => ({ ...prev, [setId]: !isGroupOpen(setId) }));

  const toggleCard = useCallback(
    (id: string, cardKey: string, setId: string, setNumber: string) => {
      setSelected((prev) => {
        const next = new Map(prev);
        if (next.has(id)) next.delete(id);
        else next.set(id, { key: cardKey, setId, setNumber });
        return next;
      });
    },
    [setSelected],
  );

  const toggleGroup = useCallback(
    (group: AvailableCardSetGroupDTO, checkAll: boolean) => {
      setSelected((prev) => {
        const next = new Map(prev);
        for (const card of group.cards) {
          if (checkAll)
            next.set(card.id, { key: card.key, setId: group.setId, setNumber: group.setNumber });
          else next.delete(card.id);
        }
        return next;
      });
    },
    [setSelected],
  );

  const groups = query.data?.groups ?? [];
  const totalAvailableCards = query.data?.totalAvailableCards ?? 0;
  const totalPages = query.data?.meta.totalPages ?? 0;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value.toUpperCase())}
          placeholder={t("admin.setsLots.lots.create.picker.searchPlaceholder")}
          className="ps-9 font-mono"
        />
      </div>

      <div className="max-h-[55vh] overflow-y-auto rounded-md border border-border">
        {query.isLoading && (
          <div className="space-y-2 p-3">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded-md" />
            ))}
          </div>
        )}

        {!query.isLoading && groups.length === 0 && (
          <div className="p-2">
            <EmptyState
              icon={<CreditCard className="h-6 w-6" />}
              title={t(
                isSearching
                  ? "admin.setsLots.lots.create.picker.noSearchResults"
                  : "admin.setsLots.lots.create.noCandidates",
              )}
              body=""
              dashed={false}
            />
          </div>
        )}

        {!query.isLoading &&
          groups.map((group) => (
            <CardPickerGroup
              key={group.setId}
              group={group}
              isOpen={isGroupOpen(group.setId)}
              onToggleOpen={() => toggleGroupOpen(group.setId)}
              isSearching={isSearching}
              selected={selected}
              onToggleCard={toggleCard}
              onToggleGroup={toggleGroup}
            />
          ))}
      </div>

      {totalPages > 1 && (
        <SimplePagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {t(
            isSearching
              ? "admin.setsLots.lots.create.picker.selectedOfMatching"
              : "admin.setsLots.lots.create.picker.selectedOfAvailable",
            { count: selected.size, total: totalAvailableCards },
          )}
        </span>
        {selected.size > 0 && (
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-sm"
            onClick={() => setSelected(new Map())}
          >
            {t("admin.setsLots.lots.create.picker.clearSelection")}
          </Button>
        )}
      </div>
    </div>
  );
}
