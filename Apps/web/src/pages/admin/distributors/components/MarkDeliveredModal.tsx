import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/hooks/useTranslation";
import {
  markDeliveredSchema,
  type MarkDeliveredFormValues,
  type MarkDeliveredFormInput,
} from "./mark-delivered.schema";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: MarkDeliveredFormValues) => void;
  isPending?: boolean;
  /** The order's cardsCount — also the field's default value and upper bound. */
  maxCount: number;
}

export function MarkDeliveredModal({ open, onOpenChange, onSubmit, isPending, maxCount }: Props) {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MarkDeliveredFormInput, unknown, MarkDeliveredFormValues>({
    resolver: zodResolver(markDeliveredSchema(t, maxCount)),
    defaultValues: { deliveredCount: maxCount },
  });

  useEffect(() => {
    if (open) reset({ deliveredCount: maxCount });
  }, [open, maxCount, reset]);

  const submit = handleSubmit((values) => onSubmit(values));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("admin.orders.markDelivered.title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="mark-delivered-count">
              {t("admin.orders.markDelivered.deliveredCount")}
            </Label>
            <Input
              id="mark-delivered-count"
              type="number"
              min={0}
              max={maxCount}
              step={1}
              {...register("deliveredCount")}
            />
            {errors.deliveredCount && (
              <p className="text-sm text-destructive">{errors.deliveredCount.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.actions.cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {t("common.actions.confirm")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
