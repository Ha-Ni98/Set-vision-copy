import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ReviewCardOrderRequestCommand } from "@my-app/contract";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/hooks/useTranslation";
import {
  reviewOrderRequestSchema,
  type ReviewOrderRequestFormValues,
} from "./review-order-request.schema";

interface Props {
  mode: "approve" | "reject" | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (command: ReviewCardOrderRequestCommand) => void;
  isPending?: boolean;
}

export function ReviewOrderRequestModal({ mode, onOpenChange, onSubmit, isPending }: Props) {
  const { t } = useTranslation();
  const { register, handleSubmit, reset } = useForm<ReviewOrderRequestFormValues>({
    resolver: zodResolver(reviewOrderRequestSchema(t)),
    defaultValues: { adminNote: "" },
  });

  useEffect(() => {
    if (!mode) reset({ adminNote: "" });
  }, [mode, reset]);

  const submit = handleSubmit((values) => {
    onSubmit({ ...(values.adminNote && { adminNote: values.adminNote }) });
  });

  const titleKey =
    mode === "approve"
      ? "admin.orderRequests.review.approveTitle"
      : "admin.orderRequests.review.rejectTitle";

  return (
    <Dialog open={mode !== null} onOpenChange={(open) => !open && onOpenChange(false)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t(titleKey)}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="review-admin-note">{t("admin.orderRequests.review.adminNote")}</Label>
            <Textarea id="review-admin-note" rows={3} {...register("adminNote")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.actions.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className={
                mode === "reject"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : undefined
              }
            >
              {t(mode === "approve" ? "common.actions.approve" : "common.actions.reject")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
