import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AccountInformation, ClientActivationStatus } from "@my-app/contract";
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
import { AlertCircle, AlertTriangle, Eye, EyeOff, MessageCircle, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import { useSubmitActivation } from "@/hooks/useSubmitActivation";
import { useUpdateActivation } from "@/hooks/useUpdateActivation";
import {
  createAccountFormSchema,
  toSubmitCommand,
  toUpdateCommand,
  type AccountFormValues,
} from "./account-form.schema";

// Stable English keys used only to match against mock submittedFields entries — decoupled
// from the (language-reactive) display labels below, since the contract's submittedFields
// carries free-text labels rather than an AccountInformation discriminator (see Sprint 2 report).
const SUBMITTED_FIELD_LABELS = {
  fullName: "Full Name",
  phone: "Phone Number",
  username: "Snapchat Username",
  email: "Snapchat Email",
  snapchatPhone: "Snapchat Phone",
} as const;

// UNDER_REVIEW is deliberately absent — the status→view dispatch (Step 1) routes it straight
// to the dedicated Step 3 "review" view, never to this component (client-portal plan.md D2's
// status table). This component only ever needs to know about its own two read-only statuses.
const READONLY_STATUSES = new Set<ClientActivationStatus>([
  ClientActivationStatus.SUBMITTED,
  ClientActivationStatus.PROCESSING,
]);

interface Props {
  keyData: KeyLookupResult;
  onSubmitted: () => void;
}

export function AccountForm({ keyData, onSubmitted }: Props) {
  const { t } = useTranslation();
  const [status, setStatus] = useState(keyData.status);
  const isReadonlyStatus = READONLY_STATUSES.has(status);
  const isCorrection = status === ClientActivationStatus.NEEDS_CORRECTION;

  const [editing, setEditing] = useState(!isReadonlyStatus);
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);

  const submitActivation = useSubmitActivation();
  const updateActivation = useUpdateActivation();
  const submitting = submitActivation.isPending || updateActivation.isPending;

  const findSubmitted = (key: keyof typeof SUBMITTED_FIELD_LABELS) =>
    keyData.submittedFields?.find((f) => f.fieldLabel === SUBMITTED_FIELD_LABELS[key])?.value ?? "";
  const isFlagged = (field: AccountInformation) =>
    isCorrection && (keyData.flaggedFields?.some((f) => f.field === field) ?? false);

  const schema = useMemo(() => createAccountFormSchema(t), [t]);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AccountFormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: {
      fullName: findSubmitted("fullName"),
      phone: findSubmitted("phone"),
      username: findSubmitted("username"),
      email: findSubmitted("email"),
      snapchatPhone: findSubmitted("snapchatPhone"),
      password: isReadonlyStatus ? "••••••••" : "",
      confirmPassword: isReadonlyStatus ? "••••••••" : "",
    },
  });

  const readonly = !editing;

  const onSubmit = (values: AccountFormValues) => {
    const onMutationSuccess = () => {
      setStatus(ClientActivationStatus.PROCESSING);
      setEditing(false);
      onSubmitted();
    };

    if (isCorrection) {
      // NEEDS_CORRECTION always carries an activationId (there's an existing activation
      // to correct) — the contract doesn't encode that invariant in the type, so this
      // trusts it the way rules ask internal code to trust framework/contract guarantees.
      updateActivation.mutate(
        { activationId: keyData.activationId!, command: toUpdateCommand(values) },
        { onSuccess: onMutationSuccess },
      );
    } else {
      submitActivation.mutate(toSubmitCommand(keyData.key, values), {
        onSuccess: onMutationSuccess,
      });
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

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-foreground">
          {t("public.landing.form.personalInfo")}
        </legend>
        <Field
          label={t("public.landing.form.fullName")}
          id="fullName"
          error={errors.fullName?.message}
        >
          <Input id="fullName" disabled={readonly} {...register("fullName")} required />
        </Field>
        <Field label={t("public.landing.form.phone")} id="phone" error={errors.phone?.message}>
          <Input id="phone" disabled={readonly} {...register("phone")} required />
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
            {...register("username")}
            required
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
            {...register("email")}
            required
          />
        </Field>
        <Field
          label={t("public.landing.form.snapPhone")}
          id="snapchatPhone"
          error={errors.snapchatPhone?.message}
        >
          <Input id="snapchatPhone" disabled={readonly} {...register("snapchatPhone")} />
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
              {...register("password")}
              required
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
                {...register("confirmPassword")}
                required
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

      {isReadonlyStatus && !editing && (
        <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div className="flex-1">
            <p className="text-foreground">
              {t(
                status === ClientActivationStatus.SUBMITTED
                  ? "public.landing.form.pendingBanner"
                  : "public.landing.form.processingNotice",
              )}
            </p>
            {status === ClientActivationStatus.SUBMITTED && (
              <a
                href="#"
                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                <MessageCircle className="h-4 w-4" /> {t("common.actions.contactWhatsapp")}
              </a>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {isReadonlyStatus && !editing ? (
          <Button type="button" variant="outline" onClick={() => setEditing(true)}>
            {t("public.landing.form.updateInfo")}
          </Button>
        ) : (
          <>
            {editing && status === ClientActivationStatus.READY && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="outline">
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
            <Button type="submit" disabled={submitting} className="min-w-[160px]">
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
        <p className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3 w-3 shrink-0" /> {message}
        </p>
      )}
    </div>
  );
}
