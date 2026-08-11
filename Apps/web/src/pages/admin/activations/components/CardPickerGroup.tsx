import { ChevronDown, ChevronRight } from "lucide-react";
import type { AvailableCardSetGroupDTO } from "@my-app/contract";
import { Checkbox } from "@/components/ui/checkbox";
import { useTranslation } from "@/hooks/useTranslation";
import { formatDateTime } from "@/lib/utils";
import { CardPickerRow } from "./CardPickerRow";
import type { SelectedCard } from "./card-picker.types";

interface Props {
  group: AvailableCardSetGroupDTO;
  isOpen: boolean;
  onToggleOpen: () => void;
  isSearching: boolean;
  selected: Map<string, SelectedCard>;
  onToggleCard: (id: string, cardKey: string, setId: string, setNumber: string) => void;
  onToggleGroup: (group: AvailableCardSetGroupDTO, checkAll: boolean) => void;
}

export function CardPickerGroup({
  group,
  isOpen,
  onToggleOpen,
  isSearching,
  selected,
  onToggleCard,
  onToggleGroup,
}: Props) {
  const { t, language } = useTranslation();

  // O(group.cards.length), done once per group per render — not the O(n) per-row scan this
  // set removes (set-8-plan §4.2/§6.2 item 1).
  const selectedCount = group.cards.reduce((n, c) => n + (selected.has(c.id) ? 1 : 0), 0);
  const allChecked = group.cards.length > 0 && selectedCount === group.cards.length;
  const headerChecked: boolean | "indeterminate" = allChecked
    ? true
    : selectedCount > 0
      ? "indeterminate"
      : false;

  return (
    <div className="border-b border-border last:border-b-0">
      <div className="flex items-center gap-2 px-2 py-2">
        <Checkbox
          checked={headerChecked}
          onCheckedChange={() => onToggleGroup(group, !allChecked)}
          disabled={group.cards.length === 0}
          aria-label={t("admin.setsLots.lots.create.picker.selectGroupAria", {
            setNumber: group.setNumber,
          })}
        />
        <button
          type="button"
          onClick={onToggleOpen}
          className="flex min-w-0 flex-1 items-center gap-2 text-start text-sm"
        >
          {isOpen ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <span className="truncate font-medium text-foreground">{group.setNumber}</span>
          <span className="shrink-0 text-muted-foreground">
            {formatDateTime(group.setCreatedAt, language)}
          </span>
          <span className="ms-auto shrink-0 ps-2 text-xs text-muted-foreground">
            {t(
              isSearching
                ? "admin.setsLots.lots.create.picker.matchingCount"
                : "admin.setsLots.lots.create.picker.availableCount",
              { selected: selectedCount, total: group.availableCount },
            )}
          </span>
        </button>
      </div>
      {isOpen && (
        <div className="max-h-64 space-y-0.5 overflow-y-auto ps-8 pe-2 pb-2 [content-visibility:auto]">
          {group.cards.map((card) => (
            <CardPickerRow
              key={card.id}
              id={card.id}
              cardKey={card.key}
              setId={group.setId}
              setNumber={group.setNumber}
              checked={selected.has(card.id)}
              onToggle={onToggleCard}
            />
          ))}
        </div>
      )}
    </div>
  );
}
