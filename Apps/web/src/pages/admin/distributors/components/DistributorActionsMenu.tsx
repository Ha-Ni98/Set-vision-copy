import { Link } from "react-router-dom";
import { MoreHorizontal, Eye, Power, Trash2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/hooks/useTranslation";
import type { DistributorDTO } from "@my-app/contract";

interface Props {
  distributor: DistributorDTO;
  onRequestToggle: (distributor: DistributorDTO) => void;
  onRequestDelete: (distributor: DistributorDTO) => void;
  onRequestCreateAccount: (distributor: DistributorDTO) => void;
  onRequestUnlinkAccount: (distributor: DistributorDTO) => void;
}

// Dumb menu — no dialog state of its own; the table owns one shared toggle/delete/account
// dialog set (mirrors ActivatorActionsMenu / FrozenActivationsTable).
export function DistributorActionsMenu({
  distributor,
  onRequestToggle,
  onRequestDelete,
  onRequestCreateAccount,
  onRequestUnlinkAccount,
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
          <Link to={`/admin/distributors/${distributor.id}`}>
            <Eye className="mr-2 h-4 w-4" /> {t("common.actions.view")}
          </Link>
        </DropdownMenuItem>
        {distributor.hasAccount ? (
          <DropdownMenuItem
            onClick={() => onRequestUnlinkAccount(distributor)}
            className="text-destructive focus:text-destructive"
          >
            <KeyRound className="mr-2 h-4 w-4" /> {t("admin.distributors.account.unlink")}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => onRequestCreateAccount(distributor)}>
            <KeyRound className="mr-2 h-4 w-4" /> {t("admin.distributors.account.create")}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => onRequestToggle(distributor)}>
          <Power className="mr-2 h-4 w-4" />
          {distributor.isEnabled ? t("common.actions.disable") : t("common.actions.enable")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onRequestDelete(distributor)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" /> {t("common.actions.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
