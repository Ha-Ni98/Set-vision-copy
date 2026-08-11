import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import type { RevocableCardDTO, CreateCardRevocationRequestCommand } from "@my-app/contract";
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
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  submitRevocationRequestSchema,
  type SubmitRevocationRequestFormValues,
} from "./submit-revocation-request.schema";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (command: CreateCardRevocationRequestCommand) => void;
  isPending?: boolean;
  eligibleCards?: RevocableCardDTO[];
  eligibleLoading: boolean;
}

export function SubmitRevocationRequestModal({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  eligibleCards,
  eligibleLoading,
}: Props) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<SubmitRevocationRequestFormValues>({
    resolver: zodResolver(submitRevocationRequestSchema(t)),
    defaultValues: { cardId: "", reason: "" },
  });

  const cardId = watch("cardId");

  useEffect(() => {
    if (!open) reset({ cardId: "", reason: "" });
  }, [open, reset]);

  const submit = handleSubmit((values) => onSubmit(values));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("distributor.revocations.submit.title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label>{t("distributor.revocations.form.card")}</Label>

            {eligibleLoading && (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 3 }, (_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            )}

            {!eligibleLoading && (eligibleCards ?? []).length === 0 && (
              <EmptyState
                icon={<Check className="h-6 w-6" />}
                title={t("distributor.revocations.form.noEligibleCards")}
                body=""
              />
            )}

            {!eligibleLoading && (eligibleCards?.length ?? 0) > 0 && (
              <div className="flex max-h-60 flex-col gap-2 overflow-y-auto">
                {eligibleCards!.map((card) => {
                  const selected = card.cardId === cardId;
                  return (
                    <button
                      key={card.cardId}
                      type="button"
                      onClick={() => setValue("cardId", card.cardId, { shouldValidate: true })}
                      className={cn(
                        "flex items-center justify-between rounded-xl border p-3 text-left text-sm transition-colors",
                        selected
                          ? "border-primary bg-primary-light"
                          : "border-border hover:bg-accent",
                      )}
                    >
                      <div>
                        <div className="font-semibold text-foreground">{card.cardKey}</div>
                        <div className="text-muted-foreground">
                          {card.subscriptionLabel}
                          {card.clientFullName && ` · ${card.clientFullName}`}
                          {card.failedAt && ` · ${formatDateTime(card.failedAt, language)}`}
                        </div>
                      </div>
                      {selected && <Check className="h-4 w-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
            )}
            {errors.cardId && <p className="text-sm text-destructive">{errors.cardId.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="revocation-reason">{t("distributor.revocations.form.reason")}</Label>
            <Textarea id="revocation-reason" rows={3} {...register("reason")} />
            {errors.reason && <p className="text-sm text-destructive">{errors.reason.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.actions.cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {t("common.actions.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
