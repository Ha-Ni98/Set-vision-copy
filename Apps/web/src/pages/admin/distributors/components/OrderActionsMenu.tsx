import { MoreHorizontal, Eye, Truck, PackageCheck, Undo2, Trash2 } from "lucide-react";
import { OrderStat, type OrderDTO } from "@my-app/contract";
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
  order: OrderDTO;
  onRequestView: (order: OrderDTO) => void;
  onRequestMarkInDelivery: (order: OrderDTO) => void;
  onRequestMarkDelivered: (order: OrderDTO) => void;
  onRequestMarkReturned: (order: OrderDTO) => void;
  onRequestDelete: (order: OrderDTO) => void;
}

// Dumb menu — no dialog state of its own, gates each item off order.orderStat (plan §D1.5:
// Delete only PENDING_DELIVERY; Mark In Delivery only PENDING_DELIVERY; Mark
// Delivered/Returned only IN_DELIVERY). Mirrors DistributorActionsMenu.
export function OrderActionsMenu({
  order,
  onRequestView,
  onRequestMarkInDelivery,
  onRequestMarkDelivered,
  onRequestMarkReturned,
  onRequestDelete,
}: Props) {
  const { t } = useTranslation();
  const canMarkInDelivery = order.orderStat === OrderStat.PENDING_DELIVERY;
  const canDelete = order.orderStat === OrderStat.PENDING_DELIVERY;
  const canMarkDeliveredOrReturned = order.orderStat === OrderStat.IN_DELIVERY;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("common.actions.action")}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onRequestView(order)}>
          <Eye className="mr-2 h-4 w-4" /> {t("common.actions.view")}
        </DropdownMenuItem>
        {canMarkInDelivery && (
          <DropdownMenuItem onClick={() => onRequestMarkInDelivery(order)}>
            <Truck className="mr-2 h-4 w-4" /> {t("common.actions.markInDelivery")}
          </DropdownMenuItem>
        )}
        {canMarkDeliveredOrReturned && (
          <DropdownMenuItem onClick={() => onRequestMarkDelivered(order)}>
            <PackageCheck className="mr-2 h-4 w-4" /> {t("common.actions.markDelivered")}
          </DropdownMenuItem>
        )}
        {canMarkDeliveredOrReturned && (
          <DropdownMenuItem onClick={() => onRequestMarkReturned(order)}>
            <Undo2 className="mr-2 h-4 w-4" /> {t("common.actions.markReturned")}
          </DropdownMenuItem>
        )}
        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onRequestDelete(order)}
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
