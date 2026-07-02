import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AccountInformation,
  ActivationStat,
  FlagWrongInfoSchema,
  FreezeRequestSchema,
  type ActiveRequestDTO,
  type FlagWrongInfoCommand,
  type FreezeRequestCommand,
} from "@my-app/contract";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LiveTimer } from "@/components/shared/LiveTimer";
import { CopyButton } from "@/components/shared/CopyButton";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, CheckCircle2, KeyRound, RotateCcw, ShieldAlert, Smartphone, Store, User, X } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useFlagWrongInfo } from "@/hooks/useFlagWrongInfo";
import { useRequestAdditionalInfo } from "@/hooks/useRequestAdditionalInfo";
import { useActivateRequest } from "@/hooks/useActivateRequest";
import { useReleaseActivation } from "@/hooks/useReleaseActivation";
import { useFreezeActivation } from "@/hooks/useFreezeActivation";

// USERNAME/EMAIL/PHONE_NUMBER/PASSWORD are the AccountInformation values this product's
// account form actually collects (BIRTHDAY/OTP excluded — see codebase-map §8.Q8).
const CORRECTABLE_FIELDS = [
  AccountInformation.USERNAME,
  AccountInformation.EMAIL,
  AccountInformation.PHONE_NUMBER,
  AccountInformation.PASSWORD,
];

interface Props {
  req: ActiveRequestDTO;
}

// The card no longer takes an onCompleted callback: activate/release invalidate the
// `["activations","active"]` query on success, and the item disappears from the list
// naturally once RequestsPage refetches — no local array splicing needed. One consequence:
// the MVP's fade-out exit animation (a manual setTimeout-then-remove) doesn't have an
// equivalent under query-cache-driven removal without an exit-animation library, which
// isn't part of the approved stack — the card just disappears on refetch instead.
export function ActiveRequestCard({ req }: Props) {
  const { t } = useTranslation();
  // `status` still tracked locally for the badge: the sub-status implied by the last
  // action taken (AWAITING_OTP/AWAITING_CORRECTION/ADMIN_REVIEW) isn't itself part of
  // ActiveRequestDTO — it reflects the optimistic last action until the list refetches.
  const [status, setStatus] = useState<ActivationStat>(req.state);
  const [adminLocked, setAdminLocked] = useState(false);

  const flagWrongInfo = useFlagWrongInfo();
  const requestAdditionalInfo = useRequestAdditionalInfo();
  const activateRequest = useActivateRequest();
  const releaseActivation = useReleaseActivation();
  const freezeActivation = useFreezeActivation();

  // Wrong info
  const [wrongOpen, setWrongOpen] = useState(false);
  const {
    handleSubmit: handleWrongSubmit,
    watch: watchWrong,
    setValue: setWrongValue,
    reset: resetWrong,
    formState: { errors: wrongErrors },
  } = useForm<FlagWrongInfoCommand>({ resolver: zodResolver(FlagWrongInfoSchema), defaultValues: { fields: [] } });
  const selectedFields = watchWrong("fields");
  const toggleField = (f: AccountInformation) => {
    const next = selectedFields.includes(f) ? selectedFields.filter((x) => x !== f) : [...selectedFields, f];
    setWrongValue("fields", next, { shouldValidate: true });
  };
  const submitWrong = (data: FlagWrongInfoCommand) => {
    flagWrongInfo.mutate(
      { id: req.id, command: data },
      {
        onSuccess: () => {
          setStatus(ActivationStat.WRONG_INFORMATION);
          setWrongOpen(false);
          resetWrong({ fields: [] });
        },
      },
    );
  };

  // Done — no contract command exists yet for this action (codebase-map §8.Q4); the dialog
  // is ported as-is and validated locally, but the collected email isn't sent anywhere —
  // `activate` stays a typed no-op until an ActivateCommand lands upstream.
  const doneSchema = z.object({
    email: z.string().min(1, t("common.validation.required")).email(t("common.validation.invalidEmail")),
  });
  const [doneOpen, setDoneOpen] = useState(false);
  const {
    register: registerDone,
    handleSubmit: handleDoneSubmit,
    formState: { errors: doneErrors },
  } = useForm<z.infer<typeof doneSchema>>({ resolver: zodResolver(doneSchema) });
  const submitDone = () => {
    activateRequest.mutate(req.id, { onSuccess: () => setDoneOpen(false) });
  };

  // Admin / freeze
  const [adminOpen, setAdminOpen] = useState(false);
  const {
    register: registerAdmin,
    handleSubmit: handleAdminSubmit,
    formState: { errors: adminErrors },
  } = useForm<FreezeRequestCommand>({ resolver: zodResolver(FreezeRequestSchema) });
  const submitAdmin = (data: FreezeRequestCommand) => {
    freezeActivation.mutate(
      { id: req.id, command: data },
      {
        onSuccess: () => {
          setStatus(ActivationStat.FREEZE);
          setAdminLocked(true);
          setAdminOpen(false);
        },
      },
    );
  };

  // The OTP button's whole purpose is requesting the OTP field specifically — there's no
  // field picker in this UI, so the command is hardcoded to that one field.
  const onOtp = () => {
    requestAdditionalInfo.mutate(
      { id: req.id, command: { fields: [AccountInformation.OTP] } },
      { onSuccess: () => setStatus(ActivationStat.ADDITIONAL_INFORMATION) },
    );
  };
  const onCancel = () => {
    releaseActivation.mutate(req.id);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] transition-all">
      <div className="flex items-start justify-between gap-3">
        <StatusBadge status={status} />
        <LiveTimer since={req.takenAt} />
      </div>

      <div className="mt-4">
        <div className="text-lg font-bold text-foreground">{req.subscriptionLabel}</div>
        <div className="mt-0.5 inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
          <KeyRound className="h-3 w-3" /> {req.key}
        </div>
      </div>

      <Section title={t("activator.requests.card.distributor")} icon={<Store className="h-3.5 w-3.5" />}>
        <p>{req.distributor.storeName} · {req.distributor.wilayaName} · {req.distributor.communeName}</p>
      </Section>

      <Section title={t("activator.requests.card.client")} icon={<User className="h-3.5 w-3.5" />}>
        <p className="font-medium text-foreground">{req.client.fullName}</p>
        <Row label={t("activator.requests.card.phone")} value={req.client.phone} />
      </Section>

      <Section title={t("activator.requests.card.snapAccount")} icon={<Smartphone className="h-3.5 w-3.5" />}>
        {req.accountFields.map((f) => (
          <Row key={f.fieldLabel} label={f.fieldLabel} value={f.value} mono={f.fieldLabel.toLowerCase().includes("password")} />
        ))}
      </Section>

      <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-5">
        <Dialog open={wrongOpen} onOpenChange={setWrongOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={adminLocked} className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive">
              <X className="mr-1 h-3.5 w-3.5" /> {t("activator.requests.card.wrongInfo")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("activator.requests.card.wrongInfoDialogTitle")}</DialogTitle>
              <DialogDescription>{t("activator.requests.card.wrongInfoDialogBody")}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleWrongSubmit(submitWrong)}>
              <div className="space-y-2 py-2">
                {CORRECTABLE_FIELDS.map((f) => (
                  <label key={f} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 hover:bg-accent">
                    <Checkbox checked={selectedFields.includes(f)} onCheckedChange={() => toggleField(f)} />
                    <span className="text-sm">{t(`enums.accountInformation.${f}`)}</span>
                  </label>
                ))}
                {wrongErrors.fields && <p className="text-xs text-destructive">{t("activator.requests.card.selectAtLeastOne")}</p>}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setWrongOpen(false)}>{t("common.actions.cancel")}</Button>
                <Button type="submit" disabled={flagWrongInfo.isPending}>{t("common.actions.confirm")}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Button variant="outline" size="sm" onClick={onOtp} disabled={adminLocked || requestAdditionalInfo.isPending} className={status === ActivationStat.ADDITIONAL_INFORMATION ? "border-warning text-warning-foreground bg-warning/10" : ""}>
          <Smartphone className="mr-1 h-3.5 w-3.5" /> {t("activator.requests.card.otp")}
        </Button>

        <Dialog open={doneOpen} onOpenChange={setDoneOpen}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={adminLocked}><CheckCircle2 className="mr-1 h-3.5 w-3.5" /> {t("activator.requests.card.done")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("activator.requests.card.doneDialogTitle")}</DialogTitle>
              <DialogDescription>{t("activator.requests.card.doneDialogBody")}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleDoneSubmit(submitDone)}>
              <div className="space-y-2 py-2">
                <Label htmlFor="done-email">{t("activator.requests.card.activationEmail")}</Label>
                <Input id="done-email" type="email" placeholder="email@example.com" {...registerDone("email")} />
                {doneErrors.email && <p className="text-xs text-destructive">{doneErrors.email.message}</p>}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDoneOpen(false)}>{t("common.actions.cancel")}</Button>
                <Button type="submit" disabled={activateRequest.isPending}>{t("activator.requests.card.confirmActivation")}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={adminLocked || releaseActivation.isPending}>
              <RotateCcw className="mr-1 h-3.5 w-3.5" /> {t("common.actions.cancel")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("activator.requests.card.releaseTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{t("activator.requests.card.releaseBody")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("activator.requests.card.keepWorking")}</AlertDialogCancel>
              <AlertDialogAction onClick={onCancel}>{t("activator.requests.card.release")}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={adminOpen} onOpenChange={setAdminOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={adminLocked} className="text-warning-foreground border-warning/40 hover:bg-warning/10">
              <ShieldAlert className="mr-1 h-3.5 w-3.5" /> {t("activator.requests.card.admin")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("activator.requests.card.adminDialogTitle")}</DialogTitle>
              <DialogDescription>{t("activator.requests.card.adminDialogBody")}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAdminSubmit(submitAdmin)}>
              <Textarea rows={4} placeholder={t("activator.requests.card.adminPlaceholder")} {...registerAdmin("reason")} />
              {adminErrors.reason && <p className="mt-1 text-xs text-destructive">{t("common.validation.required")}</p>}
              <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={() => setAdminOpen(false)}>{t("common.actions.cancel")}</Button>
                <Button type="submit" disabled={freezeActivation.isPending}>{t("common.actions.submit")}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {adminLocked && (
        <div className="mt-3 flex items-center gap-2 rounded-md border border-warning/30 bg-warning/10 p-2 text-xs text-warning-foreground">
          <AlertTriangle className="h-3.5 w-3.5 text-warning" /> {t("activator.requests.card.adminLockedNotice")}
        </div>
      )}
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
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
