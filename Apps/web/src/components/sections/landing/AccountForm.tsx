import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AccountInformation,
  ClientActivationStatus,
  type ClientActivationStatusDTO,
} from "@my-app/contract";
import type { KeyLookupResult } from "@/types/key-flow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AlertCircle, AlertTriangle, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import { useSubmitActivation } from "@/hooks/useSubmitActivation";
import { useUpdateActivation } from "@/hooks/useUpdateActivation";
import { PendingOverlay, PendingRevealedStrip } from "./PendingOverlay";
import {
  createAccountFormSchema,
  toSubmitCommand,
  toUpdateCommand,
  type AccountFormValues,
} from "./account-form.schema";

// UNDER_REVIEW is deliberately absent — the status→view dispatch (Step 1) routes it straight
// to the dedicated Step 3 "review" view, never to this component (client-portal plan.md D2's
// status table). This component only ever needs to know about its own two read-only statuses.
const READONLY_STATUSES = new Set<ClientActivationStatus>([
  ClientActivationStatus.SUBMITTED,
  ClientActivationStatus.PROCESSING,
]);

interface Props {
  keyData: KeyLookupResult;
  onSubmitted: (result: ClientActivationStatusDTO) => void;
}

export function AccountForm({ keyData, onSubmitted }: Props) {
  const { t } = useTranslation();
  const status = keyData.status;
  const isReadonlyStatus = READONLY_STATUSES.has(status);
  const isCorrection = status === ClientActivationStatus.NEEDS_CORRECTION;
  // Only a Ready key has never had an activation created yet (spec §Step 2 API: submit
  // creates PENDING; every other status's write goes through the update endpoint instead).
  const isFreshSubmit = status === ClientActivationStatus.READY;
  // Only Submitted (the pre-pickup 15-min window) can be manually re-opened for editing —
  // Processing's read-only variant has no action at all (spec D3: "no edit").
  const canEdit = status === ClientActivationStatus.SUBMITTED;

  const [editing, setEditing] = useState(!isReadonlyStatus);
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);
  // Fields stay hidden behind PendingOverlay's scrim by default while waiting (pending-step2-
  // ux-plan §2). SUBMITTED and PROCESSING get identical treatment — both are `isReadonlyStatus`.
  const [showInfo, setShowInfo] = useState(false);
  const isPending = isReadonlyStatus && !editing;

  const submitActivation = useSubmitActivation();
  const updateActivation = useUpdateActivation();
  const submitting = submitActivation.isPending || updateActivation.isPending;

  // Real, unmasked values keyed by field enum (Stage-04-fix #4A) — access is gated by the
  // client's own key, so prefilling from the server's last-known-good values (incl. password)
  // is safe and lets a re-check/live status change repopulate what was already saved instead
  // of showing blank fields.
  const findByField = (field: AccountInformation) =>
    keyData.submittedFields?.find((f) => f.field === field)?.value ?? "";
  const isFlagged = (field: AccountInformation) =>
    isCorrection && (keyData.flaggedFields?.some((f) => f.field === field) ?? false);

  const schema = useMemo(() => createAccountFormSchema(t), [t]);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<AccountFormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: {
      fullName: keyData.clientFullName ?? "",
      phone: keyData.clientPhone ?? "",
      username: findByField(AccountInformation.USERNAME),
      email: findByField(AccountInformation.EMAIL),
      snapchatPhone: findByField(AccountInformation.PHONE_NUMBER),
      password: findByField(AccountInformation.PASSWORD),
      confirmPassword: findByField(AccountInformation.PASSWORD),
    },
  });

  const readonly = !editing;

  const onSubmit = (values: AccountFormValues) => {
    const handleSuccess = (result: ClientActivationStatusDTO) => {
      setEditing(false);
      onSubmitted(result);
    };

    if (isFreshSubmit) {
      submitActivation.mutate(toSubmitCommand(keyData.key, values), { onSuccess: handleSuccess });
    } else {
      // NEEDS_CORRECTION and a Submitted re-edit both always carry an activationId (there's
      // an existing activation to update) — the contract doesn't encode that invariant in
      // the type, so this trusts it the way rules ask internal code to trust framework/
      // contract guarantees.
      updateActivation.mutate(
        { activationId: keyData.activationId!, command: toUpdateCommand(values) },
        { onSuccess: handleSuccess },
      );
    }
  };

  const clearFields = () =>
    reset({
      fullName: "",
      phone: "",
      username: "",
      email: "",
      snapchatPhone: "",
      password: "",
      confirmPassword: "",
    });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {isCorrection && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{t("public.landing.form.correctionBanner")}</span>
        </div>
      )}

      {isPending && showInfo && <PendingRevealedStrip onHide={() => setShowInfo(false)} />}

      <div className="relative min-h-[22rem]" aria-hidden={isPending && !showInfo}>
        <div className="space-y-6">
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-foreground">
              {t("public.landing.form.personalInfo")}
            </legend>
            <Field
              label={t("public.landing.form.fullName")}
              id="fullName"
              error={errors.fullName?.message}
            >
              <Input
                id="fullName"
                disabled={readonly}
                aria-invalid={!!errors.fullName}
                aria-describedby={errors.fullName ? "fullName-error" : undefined}
                {...register("fullName")}
              />
            </Field>
            <Field label={t("public.landing.form.phone")} id="phone" error={errors.phone?.message}>
              <Input
                id="phone"
                disabled={readonly}
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? "phone-error" : undefined}
                {...register("phone")}
              />
            </Field>
          </fieldset>

          <fieldset className="space-y-4 rounded-lg border border-border bg-surface p-4">
            <legend className="px-1 text-sm font-semibold text-foreground">
              {t("public.landing.form.snapAccount")}
            </legend>
            <Field
              label={t("public.landing.form.username")}
              id="username"
              error={errors.username?.message}
              flagged={isFlagged(AccountInformation.USERNAME)}
            >
              <Input
                id="username"
                disabled={readonly}
                className={cn(isFlagged(AccountInformation.USERNAME) && "border-destructive")}
                aria-invalid={!!errors.username || isFlagged(AccountInformation.USERNAME)}
                aria-describedby={
                  errors.username || isFlagged(AccountInformation.USERNAME)
                    ? "username-error"
                    : undefined
                }
                {...register("username")}
              />
            </Field>
            <Field
              label={t("public.landing.form.email")}
              id="email"
              error={errors.email?.message}
              flagged={isFlagged(AccountInformation.EMAIL)}
            >
              <Input
                id="email"
                type="email"
                disabled={readonly}
                className={cn(isFlagged(AccountInformation.EMAIL) && "border-destructive")}
                aria-invalid={!!errors.email || isFlagged(AccountInformation.EMAIL)}
                aria-describedby={
                  errors.email || isFlagged(AccountInformation.EMAIL) ? "email-error" : undefined
                }
                {...register("email")}
              />
            </Field>
            <Field
              label={t("public.landing.form.snapPhone")}
              id="snapchatPhone"
              error={errors.snapchatPhone?.message}
            >
              <Input
                id="snapchatPhone"
                disabled={readonly}
                aria-invalid={!!errors.snapchatPhone}
                aria-describedby={errors.snapchatPhone ? "snapchatPhone-error" : undefined}
                {...register("snapchatPhone")}
              />
            </Field>
            <Field
              label={t("public.landing.form.password")}
              id="password"
              error={errors.password?.message}
              flagged={isFlagged(AccountInformation.PASSWORD)}
            >
              <div className="relative">
                <Input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  disabled={readonly}
                  className={cn(
                    "pe-10",
                    isFlagged(AccountInformation.PASSWORD) && "border-destructive",
                  )}
                  aria-invalid={!!errors.password || isFlagged(AccountInformation.PASSWORD)}
                  aria-describedby={
                    errors.password || isFlagged(AccountInformation.PASSWORD)
                      ? "password-error"
                      : undefined
                  }
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={t(showPwd ? "auth.login.hidePassword" : "auth.login.showPassword")}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
            {editing && (
              <Field
                label={t("public.landing.form.confirmPassword")}
                id="confirmPassword"
                error={errors.confirmPassword?.message}
              >
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showPwd2 ? "text" : "password"}
                    className="pe-10"
                    aria-invalid={!!errors.confirmPassword}
                    aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
                    {...register("confirmPassword")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd2((v) => !v)}
                    className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                    aria-label={t(showPwd2 ? "auth.login.hidePassword" : "auth.login.showPassword")}
                  >
                    {showPwd2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>
            )}
            <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-warning-foreground">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <span>{t("public.landing.form.passwordNotice")}</span>
            </div>
          </fieldset>
        </div>

        {isPending && !showInfo && <PendingOverlay onReveal={() => setShowInfo(true)} />}
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {isPending ? (
          canEdit && (
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => {
                // Deliberate re-entry required before resubmitting, even though the real
                // password is now prefilled elsewhere (Stage-04-fix #4A) — a manual "Update
                // Information" re-open is the one path where re-confirming it is intentional.
                setValue("password", "");
                setEditing(true);
              }}
            >
              {t("public.landing.form.updateInfo")}
            </Button>
          )
        ) : (
          <>
            {editing && status === ClientActivationStatus.READY && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="outline" className="h-11">
                    {t("common.actions.clearFields")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {t("public.landing.form.clearFieldsConfirmTitle")}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("public.landing.form.clearFieldsConfirmBody")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("common.actions.cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={clearFields}>
                      {t("common.actions.clearFields")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button type="submit" disabled={submitting} className="h-11 min-w-[160px]">
              {submitting
                ? t("common.actions.submitting")
                : isCorrection
                  ? t("public.landing.form.updateResubmit")
                  : t("public.landing.form.saveSubmit")}
            </Button>
          </>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  id,
  error,
  flagged,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  /** True when this field was flagged as incorrect (Needs-correction) but has no live Zod
   *  error of its own — shows the same red-icon treatment as a validation error. */
  flagged?: boolean;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const message = error ?? (flagged ? t("public.landing.form.flagged") : undefined);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {message && (
        <p
          id={`${id}-error`}
          role="alert"
          className="flex items-center gap-1 text-xs text-destructive"
        >
          <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" /> {message}
        </p>
      )}
    </div>
  );
}
