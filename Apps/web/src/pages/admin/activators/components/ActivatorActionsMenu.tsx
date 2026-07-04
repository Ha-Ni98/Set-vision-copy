import { Link } from "react-router-dom";
import { MoreHorizontal, Eye, Power, Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/hooks/useTranslation";
import type { ActivatorDTO } from "@my-app/contract";

interface Props {
  activator: ActivatorDTO;
  onRequestToggle: (activator: ActivatorDTO) => void;
  onRequestDelete: (activator: ActivatorDTO) => void;
  onRequestPayment: (activator: ActivatorDTO) => void;
}

// Dumb menu — no dialog state of its own. The table owns one shared toggle/delete/payment
// dialog set (like FrozenActivationsTable's ResolveFreezeDialog) rather than each row
// mounting its own, so this just requests the action.
export function ActivatorActionsMenu({
  activator,
  onRequestToggle,
  onRequestDelete,
  onRequestPayment,
}: Props) {
  const { t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("common.actions.action")}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link to={`/admin/activators/${activator.id}`}>
            <Eye className="mr-2 h-4 w-4" /> {t("common.actions.view")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onRequestPayment(activator)}>
          <Wallet className="mr-2 h-4 w-4" /> {t("common.actions.recordPayment")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onRequestToggle(activator)}>
          <Power className="mr-2 h-4 w-4" />
          {activator.isEnabled ? t("common.actions.disable") : t("common.actions.enable")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onRequestDelete(activator)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" /> {t("common.actions.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
