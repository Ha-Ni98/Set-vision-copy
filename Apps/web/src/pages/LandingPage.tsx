import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { StepIndicator } from "@/components/sections/landing/StepIndicator";
import { AccountForm } from "@/components/sections/landing/AccountForm";
import { OtpStep } from "@/components/sections/landing/OtpStep";
import { CompletedStep } from "@/components/sections/landing/CompletedStep";
import { StatsRow } from "@/components/sections/landing/StatsRow";
import { WhoWeAre } from "@/components/sections/landing/WhoWeAre";
import { lookupKey, MockKey } from "@/lib/mock-data";
import { AlertCircle, CheckCircle2, KeyRound, RotateCcw, Loader2 } from "lucide-react";

type View =
  | { name: "STEP1" }
  | { name: "STEP2"; key: MockKey }
  | { name: "STEP3_OTP"; key: MockKey }
  | { name: "STEP3_DONE"; key: MockKey }
  | { name: "MESSAGE"; tone: "success" | "error"; title: string; body: string };

export default function LandingPage() {
  const [view, setView] = useState<View>({ name: "STEP1" });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const currentStep: 1 | 2 | 3 =
    view.name === "STEP1" || view.name === "MESSAGE" ? 1 :
    view.name === "STEP2" ? 2 : 3;

  const verify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    setTimeout(() => {
      const k = lookupKey(input);
      setLoading(false);
      switch (k.status) {
        case "ACTIVE":
        case "PENDING":
        case "INFORMATION_ERROR":
          setView({ name: "STEP2", key: k }); break;
        case "OTP_REQUIRED":
          setView({ name: "STEP3_OTP", key: k }); break;
        case "COMPLETED":
          setView({ name: "STEP3_DONE", key: k }); break;
        case "USED":
          setView({ name: "MESSAGE", tone: "success", title: "Already activated", body: "This key has already been used. Thank you!" }); break;
        case "DISABLED":
          setView({ name: "MESSAGE", tone: "error", title: "Key deactivated", body: "This key has been deactivated. Contact support." }); break;
        default:
          setView({ name: "MESSAGE", tone: "error", title: "Key not found", body: "This key does not exist. Please check and try again." });
      }
    }, 500);
  };

  const reset = () => { setInput(""); setView({ name: "STEP1" }); };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
          <div className="mb-10">
            <StepIndicator current={currentStep} />
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
            {view.name === "STEP1" && (
              <form onSubmit={verify} className="space-y-5 text-center">
                <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light text-primary">
                  <KeyRound className="h-7 w-7" />
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                  Enter Your Activation Key
                </h1>
                <p className="text-muted-foreground">Scratch your card and enter the key below</p>
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value.toUpperCase())}
                  placeholder="SV-XXXX-XXXX-XXXX"
                  className="h-14 text-center text-lg tracking-widest font-mono"
                  autoFocus
                />
                <Button type="submit" disabled={loading || !input.trim()} className="h-12 w-full text-base sm:w-auto sm:min-w-[220px]">
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</> : "Verify Key"}
                </Button>
              </form>
            )}

            {view.name === "MESSAGE" && (
              <div className="space-y-4 text-center">
                <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${view.tone === "success" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
                  {view.tone === "success" ? <CheckCircle2 className="h-9 w-9" /> : <AlertCircle className="h-9 w-9" />}
                </div>
                <h2 className="text-2xl font-bold text-foreground">{view.title}</h2>
                <p className="text-muted-foreground">{view.body}</p>
              </div>
            )}

            {view.name === "STEP2" && (
              <AccountForm
                key={view.key.key}
                keyData={view.key}
                onSubmitted={() => { /* form transitions itself to pending state internally */ }}
              />
            )}

            {view.name === "STEP3_OTP" && (
              <OtpStep onComplete={() => setView({ name: "STEP3_DONE", key: view.key })} />
            )}

            {view.name === "STEP3_DONE" && (
              <CompletedStep username={view.key.snap_username ?? view.key.client_data?.snap_username ?? "fatima_z"} />
            )}
          </div>

          {view.name !== "STEP1" && (
            <div className="mt-6 text-center">
              <Button variant="outline" onClick={reset}>
                <RotateCcw className="mr-2 h-4 w-4" /> Check Another Key
              </Button>
            </div>
          )}

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Demo keys: <span className="font-mono">SV-2026-AAAA-1111</span>, <span className="font-mono">…BBBB-2222</span>, <span className="font-mono">…CCCC-3333</span>, <span className="font-mono">…DDDD-4444</span>, <span className="font-mono">…EEEE-5555</span>, <span className="font-mono">…FFFF-6666</span>, <span className="font-mono">…GGGG-7777</span>
          </p>
        </section>

        <WhoWeAre />
        <StatsRow />
      </main>
      <PublicFooter />
    </div>
  );
}
