import { Link } from "react-router-dom";
import { MoreHorizontal, CreditCard, Trash2 } from "lucide-react";
import { LotStat, type LotDTO } from "@my-app/contract";
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
  lot: LotDTO;
  onRequestDelete: (lot: LotDTO) => void;
}

// Dumb menu — gates Delete off lot.lotStat (plan §D2.5: only PENDING, "cards return to
// Printed"). "View Cards" is always available (deep-links via ?lot=).
export function LotActionsMenu({ lot, onRequestDelete }: Props) {
  const { t } = useTranslation();
  const canDelete = lot.lotStat === LotStat.PENDING;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("common.actions.action")}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link to={`/admin/activations/cards?lot=${lot.lotNumber}`}>
            <CreditCard className="mr-2 h-4 w-4" /> {t("common.actions.viewCards")}
          </Link>
        </DropdownMenuItem>
        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onRequestDelete(lot)}
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
