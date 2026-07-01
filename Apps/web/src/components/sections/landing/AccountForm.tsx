import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Eye, EyeOff, MessageCircle, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ClientData, MockKey } from "@/lib/mock-data";

type Mode = "ACTIVE" | "PENDING" | "INFORMATION_ERROR" | "ACTIVATION_ERROR";

interface Props {
  keyData: MockKey;
  onSubmitted: () => void;
}

export function AccountForm({ keyData, onSubmitted }: Props) {
  const initialMode: Mode =
    keyData.status === "PENDING" ? "PENDING" :
    keyData.status === "INFORMATION_ERROR" ? "INFORMATION_ERROR" : "ACTIVE";

  const [mode, setMode] = useState<Mode>(initialMode);
  const [editing, setEditing] = useState(initialMode === "ACTIVE" || initialMode === "INFORMATION_ERROR");
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const cd: ClientData = keyData.client_data ?? {
    full_name: "", phone: "", snap_username: "", snap_email: "", snap_phone: "",
  };

  const [form, setForm] = useState({
    full_name: cd.full_name,
    phone: cd.phone,
    snap_username: cd.snap_username,
    snap_email: cd.snap_email,
    snap_phone: cd.snap_phone ?? cd.phone,
    password: mode === "PENDING" ? "••••••••" : "",
    confirm: mode === "PENDING" ? "••••••••" : "",
  });

  const errFields = keyData.error_fields ?? [];
  const isErr = (f: string) => mode === "INFORMATION_ERROR" && errFields.includes(f);
  const readonly = !editing;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm && editing) {
      toast.error("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      toast.success(mode === "INFORMATION_ERROR" ? "Information updated!" : "Information submitted successfully!");
      setMode("PENDING");
      setEditing(false);
      onSubmitted();
    }, 500);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {mode === "INFORMATION_ERROR" && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Some information contains errors. Please correct the highlighted fields.</span>
        </div>
      )}

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-foreground">Personal Information</legend>
        <Field label="Full Name" id="full_name">
          <Input id="full_name" value={form.full_name} disabled={readonly} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className={cn(isErr("full_name") && "border-destructive ring-destructive")} required />
        </Field>
        <Field label="Phone Number" id="phone">
          <Input id="phone" value={form.phone} disabled={readonly} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={cn(isErr("phone") && "border-destructive")} required />
        </Field>
      </fieldset>

      <fieldset className="space-y-4 rounded-lg border border-border bg-surface p-4">
        <legend className="px-1 text-sm font-semibold text-foreground">Snapchat Account</legend>
        <Field label="Snapchat Username" id="snap_username" error={isErr("snap_username") ? "This field was flagged as incorrect" : undefined}>
          <Input id="snap_username" value={form.snap_username} disabled={readonly} onChange={(e) => setForm({ ...form, snap_username: e.target.value })} className={cn(isErr("snap_username") && "border-destructive")} required />
        </Field>
        <Field label="Snapchat Email" id="snap_email" error={isErr("snap_email") ? "This field was flagged as incorrect" : undefined}>
          <Input id="snap_email" type="email" value={form.snap_email} disabled={readonly} onChange={(e) => setForm({ ...form, snap_email: e.target.value })} className={cn(isErr("snap_email") && "border-destructive")} required />
        </Field>
        <Field label="Snapchat Phone (optional)" id="snap_phone">
          <Input id="snap_phone" value={form.snap_phone} disabled={readonly} onChange={(e) => setForm({ ...form, snap_phone: e.target.value })} />
        </Field>
        <Field label="Password" id="password" error={isErr("password") ? "This field was flagged as incorrect" : undefined}>
          <div className="relative">
            <Input id="password" type={showPwd ? "text" : "password"} value={form.password} disabled={readonly} onChange={(e) => setForm({ ...form, password: e.target.value })} className={cn("pr-10", isErr("password") && "border-destructive")} required />
            <button type="button" onClick={() => setShowPwd((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>
        {editing && (
          <Field label="Confirm Password" id="confirm">
            <div className="relative">
              <Input id="confirm" type={showPwd2 ? "text" : "password"} value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} className="pr-10" required />
              <button type="button" onClick={() => setShowPwd2((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                {showPwd2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
        )}
        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-warning-foreground">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <span>Your password is used solely for activation. It will not be stored. Change it after activation.</span>
        </div>
      </fieldset>

      {mode === "PENDING" && !editing && (
        <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div className="flex-1">
            <p className="text-foreground">Your request is being processed. If not contacted within 15 minutes, reach out via WhatsApp.</p>
            <a href="#" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              <MessageCircle className="h-4 w-4" /> Contact on WhatsApp
            </a>
          </div>
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {mode === "PENDING" && !editing ? (
          <Button type="button" variant="outline" onClick={() => setEditing(true)}>Update Information</Button>
        ) : (
          <>
            {editing && mode === "ACTIVE" && (
              <Button type="button" variant="outline" onClick={() => setForm({ full_name: "", phone: "", snap_username: "", snap_email: "", snap_phone: "", password: "", confirm: "" })}>Clear Fields</Button>
            )}
            <Button type="submit" disabled={submitting} className="min-w-[160px]">
              {submitting ? "Submitting..." : mode === "INFORMATION_ERROR" ? "Update & Re-Submit" : "Save & Submit"}
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
