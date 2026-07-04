import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AccountInformation, ActivationStat, type ActiveRequestDTO } from "@my-app/contract";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LiveTimer } from "@/components/shared/LiveTimer";
import { CopyButton } from "@/components/shared/CopyButton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  KeyRound,
  RotateCcw,
  ShieldAlert,
  Smartphone,
  Store,
  User,
  X,
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useFlagWrongInfo } from "@/hooks/useFlagWrongInfo";
import { useRequestAdditionalInfo } from "@/hooks/useRequestAdditionalInfo";
import { useActivateRequest } from "@/hooks/useActivateRequest";
import { useCancelActivation } from "@/hooks/useCancelActivation";
import { useFreezeActivation } from "@/hooks/useFreezeActivation";
import { correctableFields } from "./plan-fields";
import { flagWrongInfoSchema, type FlagWrongInfoFormValues } from "./flag-wrong-info.schema";
import { freezeRequestSchema, type FreezeRequestFormValues } from "./freeze-request.schema";

interface Props {
  req: ActiveRequestDTO;
}

// Every action button is gated off req.state directly (not a one-way local flag) — a card
// that mounts already FREEZE (e.g. a page refresh mid-freeze) must show disabled actions
// immediately, not just after a freeze happens within this session. This same `isFrozen`
// value is the "gating prop" the sprint plan's risk note flags for Sprint 4 to build on.
export function ActiveRequestCard({ req }: Props) {
  const { t } = useTranslation();
  const [distributorOpen, setDistributorOpen] = useState(false);

  const flagWrongInfo = useFlagWrongInfo();
  const requestAdditionalInfo = useRequestAdditionalInfo();
  const activateRequest = useActivateRequest();
  const cancelActivation = useCancelActivation();
  const freezeActivation = useFreezeActivation();

  const isFrozen = req.state === ActivationStat.FREEZE;

  // Wrong info — checkbox set driven by the plan-fields registry (plan.md §B4 genericity).
  const [wrongOpen, setWrongOpen] = useState(false);
  const {
    handleSubmit: handleWrongSubmit,
    watch: watchWrong,
    setValue: setWrongValue,
    reset: resetWrong,
    formState: { errors: wrongErrors },
  } = useForm<FlagWrongInfoFormValues>({
    resolver: zodResolver(flagWrongInfoSchema(t)),
    defaultValues: { fields: [] },
  });
  const selectedFields = watchWrong("fields");
  const wrongInfoFields = correctableFields(req.subscriptionLabel);
  const toggleField = (f: AccountInformation) => {
    const next = selectedFields.includes(f)
      ? selectedFields.filter((x) => x !== f)
      : [...selectedFields, f];
    setWrongValue("fields", next, { shouldValidate: true });
  };
  const submitWrong = (data: FlagWrongInfoFormValues) => {
    flagWrongInfo.mutate(
      { id: req.id, command: data },
      {
        onSuccess: () => {
          setWrongOpen(false);
          resetWrong({ fields: [] });
        },
      },
    );
  };

  // Freeze — reason textarea.
  const [freezeOpen, setFreezeOpen] = useState(false);
  const {
    register: registerFreeze,
    handleSubmit: handleFreezeSubmit,
    reset: resetFreeze,
    formState: { errors: freezeErrors },
  } = useForm<FreezeRequestFormValues>({ resolver: zodResolver(freezeRequestSchema(t)) });
  const submitFreeze = (data: FreezeRequestFormValues) => {
    freezeActivation.mutate(
      { id: req.id, command: data },
      {
        onSuccess: () => {
          setFreezeOpen(false);
          resetFreeze();
        },
      },
    );
  };

  // Request OTP is hardcoded to the one field (Snapchat+'s only additional-info field) — a
  // future plan with more than one requestable field would need a picker here instead.
  const onOtp = () => {
    requestAdditionalInfo.mutate({ id: req.id, command: { fields: [AccountInformation.OTP] } });
  };
  // Activate has no confirm step and no extra fields (spec: "-> state ACTIVATED, card leaves
  // the queue (exit anim)") — the earlier email-collecting dialog here was a leftover from a
  // draft with no backing command; useActivateRequest takes only the id.
  const onActivate = () => {
    activateRequest.mutate(req.id);
  };
  const onCancel = () => {
    cancelActivation.mutate(req.id);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] transition-all">
      <div className="flex items-start justify-between gap-3">
        <StatusBadge status={req.state} />
        <LiveTimer since={req.takenAt} />
      </div>

      <div className="mt-4">
        <div className="text-lg font-bold text-foreground">{req.subscriptionLabel}</div>
        <div className="mt-0.5 inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
          <KeyRound className="h-3 w-3" /> {req.key}
        </div>
      </div>

      <div className="mt-4 border-t border-border pt-3">
        <button
          type="button"
          onClick={() => setDistributorOpen((v) => !v)}
          aria-expanded={distributorOpen}
          aria-label={distributorOpen ? t("common.actions.collapse") : t("common.actions.expand")}
          className="flex w-full items-center justify-between gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
        >
          <span className="flex items-center gap-1.5">
            <Store className="h-3.5 w-3.5" /> {t("activator.requests.card.distributor")}
          </span>
          {distributorOpen ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>
        {distributorOpen && (
          <p className="mt-1.5 text-sm text-foreground">
            {req.distributor.storeName} · {req.distributor.wilayaName} ·{" "}
            {req.distributor.communeName}
          </p>
        )}
      </div>

      <Section title={t("activator.requests.card.client")} icon={<User className="h-3.5 w-3.5" />}>
        <p className="font-medium text-foreground">{req.client.fullName}</p>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {t("activator.requests.card.phone")}
          </span>
          <div className="flex min-w-0 items-center gap-1">
            <a
              href={`tel:${req.client.phone}`}
              className="truncate text-sm font-medium text-primary hover:underline"
            >
              {req.client.phone}
            </a>
            <CopyButton text={req.client.phone} />
          </div>
        </div>
      </Section>

      <Section
        title={t("activator.requests.card.snapAccount")}
        icon={<Smartphone className="h-3.5 w-3.5" />}
      >
        {req.accountFields.map((f) => (
          <Row
            key={f.fieldLabel}
            label={f.fieldLabel}
            value={f.value}
            mono={f.fieldLabel.toLowerCase().includes("password")}
          />
        ))}
        {req.otpValue && (
          <Row label={t("activator.requests.card.otpFieldLabel")} value={req.otpValue} mono />
        )}
      </Section>

      <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-5">
        <Dialog open={wrongOpen} onOpenChange={setWrongOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={isFrozen}
              className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="mr-1 h-3.5 w-3.5" /> {t("activator.requests.card.wrongInfo")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("activator.requests.card.wrongInfoDialogTitle")}</DialogTitle>
              <DialogDescription>
                {t("activator.requests.card.wrongInfoDialogBody")}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleWrongSubmit(submitWrong)}>
              <div className="space-y-2 py-2">
                {wrongInfoFields.map((f) => (
                  <label
                    key={f}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 hover:bg-accent"
                  >
                    <Checkbox
                      checked={selectedFields.includes(f)}
                      onCheckedChange={() => toggleField(f)}
                    />
                    <span className="text-sm">{t(`enums.accountInformation.${f}`)}</span>
                  </label>
                ))}
                {wrongErrors.fields && (
                  <p className="text-xs text-destructive">{wrongErrors.fields.message}</p>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setWrongOpen(false)}>
                  {t("common.actions.cancel")}
                </Button>
                <Button type="submit" disabled={flagWrongInfo.isPending}>
                  {t("common.actions.confirm")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Button
          variant="outline"
          size="sm"
          onClick={onOtp}
          disabled={isFrozen || requestAdditionalInfo.isPending}
          className={
            req.state === ActivationStat.ADDITIONAL_INFORMATION
              ? "border-warning bg-warning/10 text-warning-foreground"
              : ""
          }
        >
          <Smartphone className="mr-1 h-3.5 w-3.5" /> {t("activator.requests.card.otp")}
        </Button>

        <Button size="sm" onClick={onActivate} disabled={isFrozen || activateRequest.isPending}>
          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> {t("common.actions.activate")}
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={isFrozen || cancelActivation.isPending}>
              <RotateCcw className="mr-1 h-3.5 w-3.5" /> {t("common.actions.cancel")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("activator.requests.card.cancelConfirmTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("activator.requests.card.cancelConfirmBody")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("activator.requests.card.keepWorking")}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={onCancel}
              >
                {t("activator.requests.card.confirmCancel")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={freezeOpen} onOpenChange={setFreezeOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={isFrozen}
              className="border-warning/40 text-warning-foreground hover:bg-warning/10"
            >
              <ShieldAlert className="mr-1 h-3.5 w-3.5" /> {t("activator.requests.card.freeze")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("activator.requests.card.adminDialogTitle")}</DialogTitle>
              <DialogDescription>{t("activator.requests.card.adminDialogBody")}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleFreezeSubmit(submitFreeze)}>
              <Textarea
                rows={4}
                placeholder={t("activator.requests.card.adminPlaceholder")}
                {...registerFreeze("reason")}
              />
              {freezeErrors.reason && (
                <p className="mt-1 text-xs text-destructive">{freezeErrors.reason.message}</p>
              )}
              <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={() => setFreezeOpen(false)}>
                  {t("common.actions.cancel")}
                </Button>
                <Button type="submit" disabled={freezeActivation.isPending}>
                  {t("common.actions.submit")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isFrozen && (
        <div className="mt-3 flex items-center gap-2 rounded-md border border-warning/30 bg-warning/10 p-2 text-xs text-warning-foreground">
          <AlertTriangle className="h-3.5 w-3.5 text-warning" />{" "}
          {t("activator.requests.card.adminLockedNotice")}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4 border-t border-border pt-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon} {title}
      </div>
      <div className="space-y-1 text-sm text-foreground">{children}</div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex min-w-0 items-center gap-1">
        <span className={`truncate text-sm ${mono ? "font-mono" : ""}`}>{value}</span>
        <CopyButton text={value} />
      </div>
    </div>
  );
}
