import { useState } from "react";
import { ClientActivationStatus } from "@my-app/contract";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StepIndicator } from "@/components/sections/landing/StepIndicator";
import { AccountForm } from "@/components/sections/landing/AccountForm";
import { OtpStep } from "@/components/sections/landing/OtpStep";
import { CompletedStep } from "@/components/sections/landing/CompletedStep";
import { StatsRow } from "@/components/sections/landing/StatsRow";
import { WhoWeAre } from "@/components/sections/landing/WhoWeAre";
import { useVerifyKey } from "@/hooks/useVerifyKey";
import type { KeyFlowView } from "@/types/key-flow";
import { AlertCircle, CheckCircle2, KeyRound, RotateCcw, Loader2 } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

const PENDING_LIKE = new Set<ClientActivationStatus>([
  ClientActivationStatus.READY,
  ClientActivationStatus.SUBMITTED,
  ClientActivationStatus.PROCESSING,
  ClientActivationStatus.UNDER_REVIEW,
  ClientActivationStatus.NEEDS_CORRECTION,
]);

export default function LandingPage() {
  const { t } = useTranslation();
  const [view, setView] = useState<KeyFlowView>({ name: "IDLE" });
  const [input, setInput] = useState("");
  const verifyKey = useVerifyKey();

  const currentStep: 1 | 2 | 3 =
    view.name === "IDLE" || view.name === "MESSAGE" ? 1 :
    view.name === "FORM" ? 2 : 3;

  const verify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    verifyKey.mutate(
      { key: input },
      {
        onSuccess: (data) => {
          const key = { ...data, key: input };
          if (PENDING_LIKE.has(key.status)) {
            setView({ name: "FORM", key });
          } else if (key.status === ClientActivationStatus.NEEDS_OTP) {
            setView({ name: "OTP", key });
          } else if (key.status === ClientActivationStatus.ACTIVATED) {
            setView({ name: "COMPLETED", key });
          } else if (key.status === ClientActivationStatus.FAILED) {
            setView({ name: "MESSAGE", tone: "error", titleKey: "public.landing.message.failedTitle", bodyKey: "public.landing.message.failedBody" });
          } else {
            setView({ name: "MESSAGE", tone: "error", titleKey: "public.landing.message.invalidTitle", bodyKey: "public.landing.message.invalidBody" });
          }
        },
      },
    );
  };

  const reset = () => { setInput(""); setView({ name: "IDLE" }); };

  return (
    <>
      <section className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        <div className="mb-10">
          <StepIndicator current={currentStep} />
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
          {view.name === "IDLE" && (
            <form onSubmit={verify} className="space-y-5 text-center">
              <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-light text-primary">
                <KeyRound className="h-7 w-7" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                {t("public.landing.verify.title")}
              </h1>
              <p className="text-muted-foreground">{t("public.landing.verify.subtitle")}</p>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value.toUpperCase())}
                placeholder="SV-XXXX-XXXX-XXXX"
                className="h-14 text-center text-lg tracking-widest font-mono"
                autoFocus
              />
              <Button type="submit" disabled={verifyKey.isPending || !input.trim()} className="h-12 w-full text-base sm:w-auto sm:min-w-[220px]">
                {verifyKey.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("public.landing.verify.verifying")}</> : t("public.landing.verify.submit")}
              </Button>
            </form>
          )}

          {view.name === "MESSAGE" && (
            <div className="space-y-4 text-center">
              <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${view.tone === "success" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
                {view.tone === "success" ? <CheckCircle2 className="h-9 w-9" /> : <AlertCircle className="h-9 w-9" />}
              </div>
              <h2 className="text-2xl font-bold text-foreground">{t(view.titleKey)}</h2>
              <p className="text-muted-foreground">{t(view.bodyKey)}</p>
            </div>
          )}

          {view.name === "FORM" && (
            <AccountForm
              key={view.key.key}
              keyData={view.key}
              onSubmitted={() => { /* form transitions itself to pending state internally */ }}
            />
          )}

          {view.name === "OTP" && (
            <OtpStep activationId={view.key.activationId} onComplete={() => setView({ name: "COMPLETED", key: view.key })} />
          )}

          {view.name === "COMPLETED" && (
            <CompletedStep username={view.key.accountUsername} />
          )}
        </div>

        {view.name !== "IDLE" && (
          <div className="mt-6 text-center">
            <Button variant="outline" onClick={reset}>
              <RotateCcw className="mr-2 h-4 w-4" /> {t("public.landing.verify.checkAnother")}
            </Button>
          </div>
        )}
      </section>

      <WhoWeAre />
      <StatsRow />
    </>
  );
}
