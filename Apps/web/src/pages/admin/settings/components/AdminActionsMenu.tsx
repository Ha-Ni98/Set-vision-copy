import { MoreHorizontal, Pencil, Power, KeyRound, Send, Trash2 } from "lucide-react";
import type { AdminDTO } from "@my-app/contract";
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
  admin: AdminDTO;
  onRequestEdit: (admin: AdminDTO) => void;
  onRequestToggle: (admin: AdminDTO) => void;
  onRequestResetPassword: (admin: AdminDTO) => void;
  onRequestTelegram: (admin: AdminDTO) => void;
  onRequestDelete: (admin: AdminDTO) => void;
  /** True for the signed-in admin's own row, or when this admin is the only one left —
   * both are page-level facts (session id, list length), not knowable from the row alone
   * (plan §B5). */
  deleteDisabled: boolean;
  /** Which of the two §B5 guards is active — drives the disabled item's tooltip. */
  deleteDisabledReason?: "self" | "last";
}

export function AdminActionsMenu({
  admin,
  onRequestEdit,
  onRequestToggle,
  onRequestResetPassword,
  onRequestTelegram,
  onRequestDelete,
  deleteDisabled,
  deleteDisabledReason,
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
        <DropdownMenuItem onClick={() => onRequestEdit(admin)}>
          <Pencil className="mr-2 h-4 w-4" /> {t("common.actions.edit")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onRequestToggle(admin)}>
          <Power className="mr-2 h-4 w-4" />
          {admin.isEnabled ? t("common.actions.disable") : t("common.actions.enable")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onRequestResetPassword(admin)}>
          <KeyRound className="mr-2 h-4 w-4" /> {t("common.actions.resetPassword")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onRequestTelegram(admin)}>
          <Send className="mr-2 h-4 w-4" /> {t("admin.telegram.menuLabel")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onRequestDelete(admin)}
          disabled={deleteDisabled}
          title={
            deleteDisabled
              ? t(
                  deleteDisabledReason === "self"
                    ? "admin.settings.admins.cannotDeleteSelf"
                    : "admin.settings.admins.cannotDeleteLast",
                )
              : undefined
          }
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" /> {t("common.actions.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
