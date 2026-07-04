import { MoreHorizontal, Eye, Ban, CheckCircle2, ShieldX, Trash2 } from "lucide-react";
import { CardStat, type CardDTO } from "@my-app/contract";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/hooks/useTranslation";

interface Props {
  card: CardDTO;
  onRequestView: (card: CardDTO) => void;
  onRequestDisable: (card: CardDTO) => void;
  onRequestEnable: (card: CardDTO) => void;
  onRequestRevoke: (card: CardDTO) => void;
  onRequestDelete: (card: CardDTO) => void;
}

// Dumb menu — gates each item off card.cardStat + flags (plan §D3.5: Delete only
// IN_SET|PRINTED; Disable only IN_LOT|AT_DISTRIBUTOR and not already disabled; Enable only
// when disabled; Revoke only ACTIVATION_FAILED and not disabled). Mirrors OrderActionsMenu.
export function CardActionsMenu({
  card,
  onRequestView,
  onRequestDisable,
  onRequestEnable,
  onRequestRevoke,
  onRequestDelete,
}: Props) {
  const { t } = useTranslation();
  const canDelete = card.cardStat === CardStat.IN_SET || card.cardStat === CardStat.PRINTED;
  const canDisable =
    !card.isDisabled &&
    (card.cardStat === CardStat.IN_LOT || card.cardStat === CardStat.AT_DISTRIBUTOR);
  const canEnable = card.isDisabled;
  const canRevoke = !card.isDisabled && card.cardStat === CardStat.ACTIVATION_FAILED;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("common.actions.action")}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onRequestView(card)}>
          <Eye className="mr-2 h-4 w-4" /> {t("common.actions.view")}
        </DropdownMenuItem>
        {canDisable && (
          <DropdownMenuItem onClick={() => onRequestDisable(card)}>
            <Ban className="mr-2 h-4 w-4" /> {t("common.actions.disable")}
          </DropdownMenuItem>
        )}
        {canEnable && (
          <DropdownMenuItem onClick={() => onRequestEnable(card)}>
            <CheckCircle2 className="mr-2 h-4 w-4" /> {t("common.actions.enable")}
          </DropdownMenuItem>
        )}
        {canRevoke && (
          <DropdownMenuItem onClick={() => onRequestRevoke(card)}>
            <ShieldX className="mr-2 h-4 w-4" /> {t("common.actions.revoke")}
          </DropdownMenuItem>
        )}
        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onRequestDelete(card)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" /> {t("common.actions.delete")}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
