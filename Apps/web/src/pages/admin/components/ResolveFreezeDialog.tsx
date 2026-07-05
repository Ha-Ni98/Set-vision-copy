import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ActivateActivationCommand } from "@my-app/contract";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/hooks/useTranslation";
import {
  activateRequestSchema,
  type ActivateRequestFormValues,
} from "@/components/sections/activator/activate-request.schema";

interface Props {
  open: boolean;
  action: "activate" | "cancel";
  onOpenChange: (open: boolean) => void;
  /** Cancel: called with no argument. Activate: called with the required
   *  `{ activationEmail }` command once the inline email form validates (Stage-04-fix #2). */
  onConfirm: (command?: ActivateActivationCommand) => void;
  /** Shown above the confirm copy when the caller has the freeze reason on hand (e.g. the
   * Activations page's Resolve action) — omitted, Dashboard's compact widget is unchanged. */
  reason?: string | null;
}

// Purely presentational — the row that opened it and the actual mutate() call are owned by
// the caller (FrozenActivationsTable/ActivationsTable); this only renders the confirm copy
// per action variant. The activate variant collects a required email via a real <form> (not
// AlertDialogAction, which is Radix's own DialogPrimitive.Close under the hood and always
// closes on click — it can't gate on validation, per the Sprint-6/7 finding for this exact
// primitive) — submitting only calls onConfirm once RHF+Zod actually validates the email.
export function ResolveFreezeDialog({ open, action, onOpenChange, onConfirm, reason }: Props) {
  const { t } = useTranslation();
  const isCancel = action === "cancel";

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ActivateRequestFormValues>({ resolver: zodResolver(activateRequestSchema(t)) });

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const submitActivate = (data: ActivateRequestFormValues) => onConfirm(data);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isCancel
              ? t("admin.dashboard.frozen.cancelConfirm.title")
              : t("admin.dashboard.frozen.activateConfirm.title")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {reason && (
              <span className="mb-1 block text-foreground">
                {t("admin.activations.resolveFreeze.reason")}: {reason}
              </span>
            )}
            {isCancel
              ? t("admin.dashboard.frozen.cancelConfirm.body")
              : t("admin.dashboard.frozen.activateConfirm.body")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {isCancel ? (
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onConfirm()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.actions.cancel")}
            </AlertDialogAction>
          </AlertDialogFooter>
        ) : (
          <form onSubmit={handleSubmit(submitActivate)}>
            <Input
              type="email"
              placeholder={t("activator.requests.card.activationEmailPlaceholder")}
              aria-invalid={!!errors.activationEmail}
              aria-describedby={
                errors.activationEmail ? "resolve-activate-email-error" : undefined
              }
              {...register("activationEmail")}
            />
            {errors.activationEmail && (
              <p
                id="resolve-activate-email-error"
                role="alert"
                className="mt-1 text-xs text-destructive"
              >
                {errors.activationEmail.message}
              </p>
            )}
            <AlertDialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("common.actions.cancel")}
              </Button>
              <Button type="submit">{t("common.actions.activate")}</Button>
            </AlertDialogFooter>
          </form>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
