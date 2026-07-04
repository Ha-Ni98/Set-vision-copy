import { Link } from "react-router-dom";
import { MoreHorizontal, Printer, CheckCircle2, CreditCard, Trash2 } from "lucide-react";
import { SetStat, type SetDTO } from "@my-app/contract";
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
  set: SetDTO;
  onRequestSendToPrint: (set: SetDTO) => void;
  onRequestMarkPrinted: (set: SetDTO) => void;
  onRequestDelete: (set: SetDTO) => void;
}

// Dumb menu — gates each item off set.setStat (plan §D2.5: Send to Print only NOT_PRINTED;
// Mark Printed only PENDING_PRINTING; Delete only NOT_PRINTED|PENDING_PRINTING, cascade
// warning). "View Cards" is always available (deep-links via ?set=).
export function SetActionsMenu({
  set,
  onRequestSendToPrint,
  onRequestMarkPrinted,
  onRequestDelete,
}: Props) {
  const { t } = useTranslation();
  const canSendToPrint = set.setStat === SetStat.NOT_PRINTED;
  const canMarkPrinted = set.setStat === SetStat.PENDING_PRINTING;
  const canDelete = set.setStat === SetStat.NOT_PRINTED || set.setStat === SetStat.PENDING_PRINTING;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("common.actions.action")}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link to={`/admin/activations/cards?set=${set.setNumber}`}>
            <CreditCard className="mr-2 h-4 w-4" /> {t("common.actions.viewCards")}
          </Link>
        </DropdownMenuItem>
        {canSendToPrint && (
          <DropdownMenuItem onClick={() => onRequestSendToPrint(set)}>
            <Printer className="mr-2 h-4 w-4" /> {t("common.actions.sendToPrint")}
          </DropdownMenuItem>
        )}
        {canMarkPrinted && (
          <DropdownMenuItem onClick={() => onRequestMarkPrinted(set)}>
            <CheckCircle2 className="mr-2 h-4 w-4" /> {t("common.actions.markPrinted")}
          </DropdownMenuItem>
        )}
        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onRequestDelete(set)}
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
