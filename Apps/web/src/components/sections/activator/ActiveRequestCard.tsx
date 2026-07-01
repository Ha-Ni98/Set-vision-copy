import { useState } from "react";
import { ActiveRequest, RequestSubStatus } from "@/lib/mock-data";
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
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, KeyRound, RotateCcw, ShieldAlert, Smartphone, Store, User, X } from "lucide-react";

const ERROR_FIELDS = [
  { id: "snap_username", label: "Snapchat Username" },
  { id: "snap_email", label: "Snapchat Email" },
  { id: "snap_phone", label: "Snapchat Phone" },
  { id: "password", label: "Password" },
];

interface Props {
  req: ActiveRequest;
  onCompleted: (id: string) => void;
}

function StatusBadge({ s }: { s: RequestSubStatus }) {
  const map: Record<RequestSubStatus, { label: string; cls: string; pulse?: boolean }> = {
    IN_PROGRESS: { label: "In Progress", cls: "bg-primary/15 text-primary" },
    AWAITING_OTP: { label: "Awaiting OTP", cls: "bg-warning/20 text-warning-foreground border border-warning/40", pulse: true },
    AWAITING_CORRECTION: { label: "Awaiting Correction", cls: "bg-destructive/15 text-destructive" },
    ADMIN_REVIEW: { label: "Admin Review", cls: "bg-warning/30 text-warning-foreground" },
  };
  const it = map[s];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${it.cls} ${it.pulse ? "animate-pulse-soft" : ""}`}>
      ● {it.label}
    </span>
  );
}

export function ActiveRequestCard({ req, onCompleted }: Props) {
  const [status, setStatus] = useState<RequestSubStatus>(req.sub_status);
  const [adminLocked, setAdminLocked] = useState(false);
  const [fading, setFading] = useState(false);

  // Wrong info
  const [wrongOpen, setWrongOpen] = useState(false);
  const [wrongFields, setWrongFields] = useState<string[]>([]);
  const submitWrong = () => {
    if (wrongFields.length === 0) { toast.error("Select at least one field."); return; }
    toast.success("Information error sent to client.");
    setStatus("AWAITING_CORRECTION");
    setWrongOpen(false); setWrongFields([]);
  };

  // Done
  const [doneOpen, setDoneOpen] = useState(false);
  const [doneEmail, setDoneEmail] = useState("");
  const submitDone = () => {
    if (!doneEmail.trim()) { toast.error("Enter the activation email."); return; }
    toast.success("Activation completed!");
    setDoneOpen(false);
    setFading(true);
    setTimeout(() => onCompleted(req.id), 350);
  };

  // Admin
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminMsg, setAdminMsg] = useState("");
  const submitAdmin = () => {
    if (!adminMsg.trim()) { toast.error("Describe the issue."); return; }
    toast.success("Admin review requested.");
    setStatus("ADMIN_REVIEW"); setAdminLocked(true); setAdminOpen(false); setAdminMsg("");
  };

  const onOtp = () => { toast.success("OTP request sent to client."); setStatus("AWAITING_OTP"); };
  const onCancel = () => {
    toast.info("Request cancelled.");
    setFading(true);
    setTimeout(() => onCompleted(req.id), 350);
  };

  return (
    <div className={`rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] transition-all ${fading ? "animate-fade-out" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <StatusBadge s={status} />
        <LiveTimer since={req.taken_at} />
      </div>

      <div className="mt-4">
        <div className="text-lg font-bold text-foreground">{req.subscription}</div>
        <div className="mt-0.5 inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
          <KeyRound className="h-3 w-3" /> {req.key}
        </div>
      </div>

      <Section title="Distributor" icon={<Store className="h-3.5 w-3.5" />}>
        <p>{req.distributor.store} · {req.distributor.wilaya} · {req.distributor.commune}</p>
      </Section>

      <Section title="Client" icon={<User className="h-3.5 w-3.5" />}>
        <p className="font-medium text-foreground">{req.client_name}</p>
        <Row label="Phone" value={req.client_phone} />
      </Section>

      <Section title="Snapchat Account" icon={<Smartphone className="h-3.5 w-3.5" />}>
        <Row label="Username" value={req.snap_username} />
        <Row label="Email" value={req.snap_email} />
        <Row label="Phone" value={req.snap_phone} />
        <Row label="Password" value={req.snap_password} mono />
      </Section>

      <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-5">
        <Dialog open={wrongOpen} onOpenChange={setWrongOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={adminLocked} className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive">
              <X className="mr-1 h-3.5 w-3.5" /> Wrong Info
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Select Incorrect Fields</DialogTitle>
              <DialogDescription>Mark which fields the client needs to correct.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              {ERROR_FIELDS.map((f) => (
                <label key={f.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 hover:bg-accent">
                  <Checkbox
                    checked={wrongFields.includes(f.id)}
                    onCheckedChange={(v) => setWrongFields((arr) => v ? [...arr, f.id] : arr.filter((x) => x !== f.id))}
                  />
                  <span className="text-sm">{f.label}</span>
                </label>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setWrongOpen(false)}>Cancel</Button>
              <Button onClick={submitWrong}>Confirm</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button variant="outline" size="sm" onClick={onOtp} disabled={adminLocked} className={status === "AWAITING_OTP" ? "border-warning text-warning-foreground bg-warning/10" : ""}>
          <Smartphone className="mr-1 h-3.5 w-3.5" /> OTP
        </Button>

        <Dialog open={doneOpen} onOpenChange={setDoneOpen}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={adminLocked}><CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Done</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Activation</DialogTitle>
              <DialogDescription>Enter the email used to activate Snapchat+.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <Label htmlFor="done-email">Activation Email</Label>
              <Input id="done-email" type="email" value={doneEmail} onChange={(e) => setDoneEmail(e.target.value)} placeholder="email@example.com" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDoneOpen(false)}>Cancel</Button>
              <Button onClick={submitDone}>Confirm Activation</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={adminLocked}>
              <RotateCcw className="mr-1 h-3.5 w-3.5" /> Cancel
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Release this request?</AlertDialogTitle>
              <AlertDialogDescription>The request will return to the pending pool.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep working</AlertDialogCancel>
              <AlertDialogAction onClick={onCancel}>Release</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={adminOpen} onOpenChange={setAdminOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={adminLocked} className="text-warning-foreground border-warning/40 hover:bg-warning/10">
              <ShieldAlert className="mr-1 h-3.5 w-3.5" /> Admin
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Admin Review</DialogTitle>
              <DialogDescription>Describe what's blocking this activation.</DialogDescription>
            </DialogHeader>
            <Textarea value={adminMsg} onChange={(e) => setAdminMsg(e.target.value)} rows={4} placeholder="Describe the issue…" />
            <DialogFooter>
              <Button variant="outline" onClick={() => setAdminOpen(false)}>Cancel</Button>
              <Button onClick={submitAdmin}>Submit</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {adminLocked && (
        <div className="mt-3 flex items-center gap-2 rounded-md border border-warning/30 bg-warning/10 p-2 text-xs text-warning-foreground">
          <AlertTriangle className="h-3.5 w-3.5 text-warning" /> Awaiting admin review — actions disabled.
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
