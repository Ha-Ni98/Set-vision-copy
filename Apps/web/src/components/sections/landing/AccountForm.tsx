import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AccountInformation, ClientActivationStatus } from "@my-app/contract";
import type { KeyVerificationDTO } from "@my-app/contract";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Eye, EyeOff, MessageCircle, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import { createAccountFormSchema, type AccountFormValues } from "./account-form.schema";

// Stable English keys used only to match against mock submittedFields entries — decoupled
// from the (language-reactive) display labels below, since the contract's submittedFields
// carries free-text labels rather than an AccountInformation discriminator (see Sprint 2 report).
const MOCK_FIELD_LABELS = {
  fullName: "Full Name",
  phone: "Phone Number",
  username: "Snapchat Username",
  email: "Snapchat Email",
  phoneNumber: "Snapchat Phone",
} as const;

const PENDING_STATUSES = new Set<ClientActivationStatus>([
  ClientActivationStatus.SUBMITTED,
  ClientActivationStatus.PROCESSING,
  ClientActivationStatus.UNDER_REVIEW,
]);

interface Props {
  keyData: KeyVerificationDTO;
  onSubmitted: () => void;
}

export function AccountForm({ keyData, onSubmitted }: Props) {
  const { t } = useTranslation();
  const [status, setStatus] = useState(keyData.status);
  const isPendingStatus = PENDING_STATUSES.has(status);
  const isCorrection = status === ClientActivationStatus.NEEDS_CORRECTION;

  const [editing, setEditing] = useState(!isPendingStatus);
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const findSubmitted = (key: keyof typeof MOCK_FIELD_LABELS) =>
    keyData.submittedFields?.find((f) => f.fieldLabel === MOCK_FIELD_LABELS[key])?.value ?? "";
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
      phoneNumber: findSubmitted("phoneNumber"),
      password: isPendingStatus ? "••••••••" : "",
      confirmPassword: isPendingStatus ? "••••••••" : "",
    },
  });

  const readonly = !editing;

  const onSubmit = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      toast.success(isCorrection ? t("public.landing.form.updatedToast") : t("public.landing.form.submittedToast"));
      setStatus(ClientActivationStatus.PROCESSING);
      setEditing(false);
      onSubmitted();
    }, 500);
  };

  const clearFields = () =>
    reset({ fullName: "", phone: "", username: "", email: "", phoneNumber: "", password: "", confirmPassword: "" });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {isCorrection && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{t("public.landing.form.correctionBanner")}</span>
        </div>
      )}

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-foreground">{t("public.landing.form.personalInfo")}</legend>
        <Field label={t("public.landing.form.fullName")} id="fullName" error={errors.fullName?.message}>
          <Input id="fullName" disabled={readonly} {...register("fullName")} required />
        </Field>
        <Field label={t("public.landing.form.phone")} id="phone" error={errors.phone?.message}>
          <Input id="phone" disabled={readonly} {...register("phone")} required />
        </Field>
      </fieldset>

      <fieldset className="space-y-4 rounded-lg border border-border bg-surface p-4">
        <legend className="px-1 text-sm font-semibold text-foreground">{t("public.landing.form.snapAccount")}</legend>
        <Field
          label={t("public.landing.form.username")}
          id="username"
          error={errors.username?.message ?? (isFlagged(AccountInformation.USERNAME) ? t("public.landing.form.flagged") : undefined)}
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
          error={errors.email?.message ?? (isFlagged(AccountInformation.EMAIL) ? t("public.landing.form.flagged") : undefined)}
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
        <Field label={t("public.landing.form.snapPhone")} id="phoneNumber">
          <Input id="phoneNumber" disabled={readonly} {...register("phoneNumber")} />
        </Field>
        <Field
          label={t("public.landing.form.password")}
          id="password"
          error={errors.password?.message ?? (isFlagged(AccountInformation.PASSWORD) ? t("public.landing.form.flagged") : undefined)}
        >
          <div className="relative">
            <Input
              id="password"
              type={showPwd ? "text" : "password"}
              disabled={readonly}
              className={cn("pr-10", isFlagged(AccountInformation.PASSWORD) && "border-destructive")}
              {...register("password")}
              required
            />
            <button type="button" onClick={() => setShowPwd((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>
        {editing && (
          <Field label={t("public.landing.form.confirmPassword")} id="confirmPassword" error={errors.confirmPassword?.message}>
            <div className="relative">
              <Input id="confirmPassword" type={showPwd2 ? "text" : "password"} className="pr-10" {...register("confirmPassword")} required />
              <button type="button" onClick={() => setShowPwd2((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
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

      {isPendingStatus && !editing && (
        <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div className="flex-1">
            <p className="text-foreground">{t("public.landing.form.pendingBanner")}</p>
            <a href="#" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              <MessageCircle className="h-4 w-4" /> {t("common.actions.contactWhatsapp")}
            </a>
          </div>
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {isPendingStatus && !editing ? (
          <Button type="button" variant="outline" onClick={() => setEditing(true)}>
            {t("public.landing.form.updateInfo")}
          </Button>
        ) : (
          <>
            {editing && status === ClientActivationStatus.READY && (
              <Button type="button" variant="outline" onClick={clearFields}>
                {t("common.actions.clearFields")}
              </Button>
            )}
            <Button type="submit" disabled={submitting} className="min-w-[160px]">
              {submitting ? t("common.actions.submitting") : isCorrection ? t("public.landing.form.updateResubmit") : t("public.landing.form.saveSubmit")}
            </Button>
          </>
        )}
      </div>
    </form>
  );
}

function Field({ label, id, error, children }: { label: string; id: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
