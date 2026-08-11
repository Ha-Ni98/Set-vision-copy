import { Link } from "react-router-dom";
import { MoreHorizontal, Eye, CheckCircle2, ShieldAlert, Tag, Coins } from "lucide-react";
import { ActivationStat, type AdminActivationDTO } from "@my-app/contract";
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
  activation: AdminActivationDTO;
  onRequestResolve: (activation: AdminActivationDTO, action: "activate" | "cancel") => void;
  onRequestSetPrice: (activation: AdminActivationDTO) => void;
  onRequestSetCost: (activation: AdminActivationDTO) => void;
}

const COMPLETED_STATES = new Set<ActivationStat>([
  ActivationStat.ACTIVATED,
  ActivationStat.ACTIVATED_BY_ADMIN,
]);

// Dumb menu — gates items off the row (plan §D1.4: Resolve only FREEZE; Set/Edit Price for any
// completed activation — admins can re-price a completed activation, not just an unpriced one,
// Stage-04-fix #1). View always links to the detail route (no drawer, D2 is its own page).
// "Resolve" is the same two ops as Dashboard's ResolveFreezeDialog/FrozenActivationsTable
// (Activate/Cancel), just reached via this menu instead of two inline buttons.
export function ActivationActionsMenu({
  activation,
  onRequestResolve,
  onRequestSetPrice,
  onRequestSetCost,
}: Props) {
  const { t } = useTranslation();
  const canResolve = activation.state === ActivationStat.FREEZE;
  const canSetPrice = COMPLETED_STATES.has(activation.state);
  const hasPrice = activation.activationPrice != null;
  // Set 9 (D10): same completed-only gate as Set/Edit Price — enabled only for ACTIVATED /
  // ACTIVATED_BY_ADMIN, absent otherwise (not rendered-disabled).
  const canSetCost = COMPLETED_STATES.has(activation.state);
  const hasCost = activation.activationCost != null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("common.actions.action")}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link to={`/admin/activations/${activation.id}`}>
            <Eye className="mr-2 h-4 w-4" /> {t("common.actions.view")}
          </Link>
        </DropdownMenuItem>
        {canResolve && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onRequestResolve(activation, "activate")}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> {t("common.actions.activate")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRequestResolve(activation, "cancel")}>
              <ShieldAlert className="mr-2 h-4 w-4" /> {t("common.actions.cancel")}
            </DropdownMenuItem>
          </>
        )}
        {canSetPrice && (
          <DropdownMenuItem onClick={() => onRequestSetPrice(activation)}>
            <Tag className="mr-2 h-4 w-4" />{" "}
            {t(
              hasPrice
                ? "admin.activations.actions.editPrice"
                : "admin.activations.actions.setPrice",
            )}
          </DropdownMenuItem>
        )}
        {canSetCost && (
          <DropdownMenuItem onClick={() => onRequestSetCost(activation)}>
            <Coins className="mr-2 h-4 w-4" />{" "}
            {t(
              hasCost ? "admin.activations.actions.editCost" : "admin.activations.actions.setCost",
            )}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
